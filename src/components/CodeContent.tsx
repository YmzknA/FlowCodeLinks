import React, { useEffect, useState, useRef } from 'react';
import { ParsedFile } from '@/types/codebase';
import DOMPurify from 'dompurify';
import { sanitizeExternalLinks, auditHtmlContent } from '@/utils/security';

// DOMPurifyを使用した安全なHTMLサニタイズ関数
const sanitizeHighlightedCode = (highlightedHtml: string): string => {
  // 開発環境でのセキュリティ監査
  auditHtmlContent(highlightedHtml, 'PrismJS-highlighted-code');
  
  // 外部リンクを安全化
  const linkSafeHtml = sanitizeExternalLinks(highlightedHtml);
  
  // DOMPurifyでサニタイズ
  return DOMPurify.sanitize(linkSafeHtml, {
    ALLOWED_TAGS: ['span', 'code', 'pre', 'a'],
    ALLOWED_ATTR: ['class', 'data-method-name', 'style', 'href', 'rel', 'target'],
    KEEP_CONTENT: true
  });
};

// フォールバック用の基本的なHTMLエスケープ関数
const escapeHtml = (unsafe: string): string => {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

interface CodeContentProps {
  file: ParsedFile;
  highlightedMethod?: { methodName: string; filePath: string; lineNumber?: number } | null;
  onMethodClick?: (methodName: string) => void;
}

export const CodeContent: React.FC<CodeContentProps> = ({ file, highlightedMethod, onMethodClick }) => {
  const [highlightedCode, setHighlightedCode] = useState<string>('');
  const containerRef = useRef<HTMLDivElement>(null);

  // 言語に応じたPrismの言語識別子を取得
  const getPrismLanguage = (language: string): string => {
    switch (language) {
      case 'ruby':
        return 'ruby';
      case 'javascript':
        return 'javascript';
      case 'typescript':
        return 'typescript';
      default:
        return 'text';
    }
  };

  // シンタックスハイライトを適用
  useEffect(() => {
    const highlightCode = async () => {
      if (file.content) {
        console.log('Starting highlight process for:', file.language);
        
        // Prism.jsが利用可能になるまで待つ
        let attempts = 0;
        const maxAttempts = 20;
        
        const waitForPrism = () => new Promise<void>((resolve) => {
          const checkPrism = setInterval(() => {
            attempts++;
            console.log(`Checking Prism (attempt ${attempts}):`, !!window.Prism);
            if (window.Prism || attempts >= maxAttempts) {
              clearInterval(checkPrism);
              resolve();
            }
          }, 100);
        });

        await waitForPrism();

        if (window.Prism && window.Prism.languages) {
          const language = getPrismLanguage(file.language);
          console.log('Available languages:', Object.keys(window.Prism.languages));
          console.log('Requested language:', language);
          
          const grammar = window.Prism.languages[language];
          
          if (grammar) {
            try {
              // Prism.highlightでHTMLを生成（安全に処理）
              let highlighted = window.Prism.highlight(file.content, grammar, language);
              
              // 全てのメソッド名をクリック可能にする
              if (onMethodClick && file.methods) {
                // 全てのメソッド名を収集（定義されているメソッドと呼び出されているメソッド）
                const clickableMethodNames = new Set<string>();
                
                // このファイル内で定義されているメソッド名を追加
                file.methods.forEach(method => {
                  clickableMethodNames.add(method.name);
                });
                
                // このファイル内で呼び出されているメソッド名を追加
                file.methods.forEach(method => {
                  method.calls?.forEach(call => {
                    clickableMethodNames.add(call.methodName);
                  });
                });
                
                // 全てのメソッド名をクリック可能にする（HTMLエスケープ済みのメソッド名を使用）
                clickableMethodNames.forEach(methodName => {
                  const escapedMethodName = escapeHtml(methodName);
                  const methodNameRegex = new RegExp(`\\b(${methodName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})\\b`, 'g');
                  highlighted = highlighted.replace(methodNameRegex, 
                    `<span class="clickable-method" data-method-name="${escapedMethodName}" style="cursor: pointer;">$1</span>`
                  );
                });
              }
              
              // DOMPurifyで安全にサニタイズしてから設定
              setHighlightedCode(sanitizeHighlightedCode(highlighted));
              console.log('Code highlighted successfully:', highlighted.substring(0, 100) + '...');
            } catch (error) {
              console.error('Prism highlight error:', error);
              setHighlightedCode(DOMPurify.sanitize(escapeHtml(file.content)));
            }
          } else {
            console.warn(`Prism language not found: ${language}. Available:`, Object.keys(window.Prism.languages));
            setHighlightedCode(DOMPurify.sanitize(escapeHtml(file.content)));
          }
        } else {
          console.warn('Prism not available');
          setHighlightedCode(DOMPurify.sanitize(escapeHtml(file.content)));
        }
      } else {
        // コンテンツがない場合は空文字列をセット
        setHighlightedCode('');
      }
    };

    highlightCode();
  }, [file.content, file.language]);

  // ハイライトされたメソッドにスクロール
  useEffect(() => {
    
    if (highlightedMethod && 
        highlightedMethod.filePath === file.path && 
        containerRef.current) {
      // 実際の行高さを測定
      const preElement = containerRef.current.querySelector('pre');
      const actualLineHeight = preElement ? 
        parseFloat(window.getComputedStyle(preElement).lineHeight) : 18;
      
      const lineHeight = actualLineHeight;
      // 実際の表示領域の高さを使用（ヘッダーなどを除いた実際のコンテンツエリア）
      const containerHeight = containerRef.current.getBoundingClientRect().height;
      
      let targetLine: number;
      
      // 呼び出し元クリック時は呼び出し行を使用
      if (highlightedMethod.lineNumber) {
        targetLine = highlightedMethod.lineNumber;
      } else {
        // 矢印クリック時はメソッド定義の開始行を使用
        const targetMethod = file.methods?.find(m => m.name === highlightedMethod.methodName);
        if (targetMethod) {
          targetLine = targetMethod.startLine;
        } else {
          console.log('❌ Method not found:', highlightedMethod.methodName);
          return;
        }
      }
      
      // パーセント方式による中央表示計算
      const totalLines = file.totalLines;
      const positionRatio = targetLine / totalLines;
      
      // スクロール可能な範囲を取得
      const scrollableHeight = containerRef.current.scrollHeight;
      const viewportHeight = containerHeight;
      
      // 対象行を中央に表示するためのスクロール位置
      const targetScrollTop = (scrollableHeight * positionRatio) - (viewportHeight / 2);
      
      // スクロール範囲内に制限
      const maxScrollTop = scrollableHeight - viewportHeight;
      const scrollPosition = Math.max(0, Math.min(targetScrollTop, maxScrollTop));
      
      
      
      containerRef.current.scrollTo({
        top: scrollPosition,
        behavior: 'smooth'
      });
      
    }
  }, [highlightedMethod, file.path, file.methods]);

  // メソッドクリックイベントハンドラー
  useEffect(() => {
    if (containerRef.current && onMethodClick) {
      const handleMethodClick = (e: Event) => {
        const target = e.target as HTMLElement;
        if (target.classList.contains('clickable-method')) {
          const methodName = target.dataset.methodName;
          if (methodName) {
            onMethodClick(methodName);
          }
        }
      };

      containerRef.current.addEventListener('click', handleMethodClick);
      
      return () => {
        if (containerRef.current) {
          containerRef.current.removeEventListener('click', handleMethodClick);
        }
      };
    }
  }, [onMethodClick, highlightedCode]);

  const prismLanguage = getPrismLanguage(file.language);

  return (
    <div ref={containerRef} className="p-4 h-full overflow-auto">
      <pre 
        className={`language-${prismLanguage} text-sm p-3 rounded`}
        style={{ 
          whiteSpace: 'pre', 
          tabSize: 2,
          fontFamily: 'Consolas, Monaco, "Andale Mono", "Ubuntu Mono", monospace',
          backgroundColor: '#2d2d2d',
          color: '#ccc',
          lineHeight: '18px', // 計算と同じ行の高さに設定
          margin: 0, // preのデフォルトマージンを削除
          overflow: 'auto'
        }}
      >
        <code 
          className={`language-${prismLanguage}`}
          style={{ 
            whiteSpace: 'pre',
            display: 'block',
            tabSize: 2,
            fontFamily: 'inherit'
          }}
          dangerouslySetInnerHTML={{ 
            __html: highlightedCode || DOMPurify.sanitize(escapeHtml(file.content))
          }}
        />
      </pre>
    </div>
  );
};