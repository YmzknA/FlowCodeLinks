import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { ParsedFile } from '@/types/codebase';
import { sanitizeContent } from '@/utils/security';
import { debounce, optimizedScroll } from '@/utils/performance';
import { useWheelScrollIsolation } from '@/hooks/useWheelScrollIsolation';

interface CodeContentProps {
  file: ParsedFile;
  highlightedMethod?: { methodName: string; filePath: string; lineNumber?: number } | null;
  onMethodClick?: (methodName: string) => void;
}

export const CodeContent: React.FC<CodeContentProps> = ({ file, highlightedMethod, onMethodClick }) => {
  const [highlightedCode, setHighlightedCode] = useState<string>('');
  const containerRef = useRef<HTMLDivElement>(null);
  
  // ホイールスクロール分離フックを使用
  const { handleWheel } = useWheelScrollIsolation(containerRef);

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
        
        // Prism.jsを動的に安全にロード
        let prism;
        try {
          if (typeof window !== 'undefined' && !window.Prism) {
            console.log('Loading Prism.js dynamically...');
            // Prism.jsコアをインポート
            prism = (await import('prismjs')).default;
            
            // 言語サポートを追加
            await import('prismjs/components/prism-ruby' as any);
            await import('prismjs/components/prism-javascript' as any);
            await import('prismjs/components/prism-typescript' as any);
            
            // グローバルに設定
            window.Prism = prism;
            console.log('Prism.js loaded successfully');
          } else {
            prism = window.Prism;
          }
        } catch (error) {
          console.error('Failed to load Prism.js:', error);
          setHighlightedCode(sanitizeContent(file.content, 'html-content'));
          return;
        }
        
        if (!prism) {
          console.warn('Prism.js not available, using fallback');
          setHighlightedCode(sanitizeContent(file.content, 'html-content'));
          return;
        }

        const language = getPrismLanguage(file.language);
        console.log('Available languages:', Object.keys(prism.languages));
        console.log('Requested language:', language);
        
        const grammar = prism.languages[language];
        
        if (grammar) {
          try {
            // Prism.highlightでHTMLを生成（安全に処理）
            let highlighted = prism.highlight(file.content, grammar, language);
            
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
              
              // 全てのメソッド名をクリック可能にする（エスケープ処理を削除し、sanitizeContentに統一）
              clickableMethodNames.forEach(methodName => {
                const methodNameRegex = new RegExp(`\\b(${methodName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})\\b`, 'g');
                highlighted = highlighted.replace(methodNameRegex, 
                  `<span class="cursor-pointer" data-method-name="${methodName}">$1</span>`
                );
              });
            }
            
            // DOMPurifyで安全にサニタイズしてから設定
            setHighlightedCode(sanitizeContent(highlighted, 'prism-code'));
            console.log('Code highlighted successfully:', highlighted.substring(0, 100) + '...');
          } catch (error) {
            console.error('Prism highlight error:', error);
            setHighlightedCode(sanitizeContent(file.content, 'html-content'));
          }
        } else {
          console.warn(`Prism language not found: ${language}. Available:`, Object.keys(prism.languages));
          setHighlightedCode(sanitizeContent(file.content, 'html-content'));
        }
      } else {
        // コンテンツがない場合は空文字列をセット
        setHighlightedCode('');
      }
    };

    highlightCode();
  }, [file.content, file.language]);

  // 最適化されたスクロール計算
  const calculateScrollPosition = useCallback((targetLine: number, containerElement: HTMLElement) => {
    // 実際の行高さを測定（メモ化）
    const preElement = containerElement.querySelector('pre');
    const actualLineHeight = preElement ? 
      parseFloat(window.getComputedStyle(preElement).lineHeight) : 18;
    
    const containerHeight = containerElement.getBoundingClientRect().height;
    const totalLines = file.totalLines;
    const positionRatio = targetLine / totalLines;
    
    // スクロール可能な範囲を取得
    const scrollableHeight = containerElement.scrollHeight;
    const viewportHeight = containerHeight;
    
    // 対象行を中央に表示するためのスクロール位置
    const targetScrollTop = (scrollableHeight * positionRatio) - (viewportHeight / 2);
    
    // スクロール範囲内に制限
    const maxScrollTop = scrollableHeight - viewportHeight;
    return Math.max(0, Math.min(targetScrollTop, maxScrollTop));
  }, [file.totalLines]);

  // デバウンスされたスクロール処理
  const debouncedScroll = useMemo(() => 
    debounce((targetLine: number) => {
      const container = containerRef.current;
      if (container) {
        requestAnimationFrame(() => {
          const scrollPosition = calculateScrollPosition(targetLine, container);
          optimizedScroll(container, scrollPosition, 300);
        });
      }
    }, 100), 
    [calculateScrollPosition]
  );

  // ハイライトされたメソッドにスクロール（最適化）
  useEffect(() => {
    if (highlightedMethod && 
        highlightedMethod.filePath === file.path && 
        containerRef.current) {
      
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
      
      debouncedScroll(targetLine);
    }
  }, [highlightedMethod, file.path, file.methods, debouncedScroll]);

  // メソッドクリックイベントハンドラー（最適化）
  useEffect(() => {
    const container = containerRef.current;
    if (container && onMethodClick) {
      const handleMethodClick = (e: Event) => {
        const target = e.target as HTMLElement;
        const methodName = target.dataset.methodName;
        if (methodName) {
          onMethodClick(methodName);
        }
      };

      container.addEventListener('click', handleMethodClick);
      
      return () => {
        container.removeEventListener('click', handleMethodClick);
      };
    }
  }, [onMethodClick]); // highlightedCodeを依存関係から除外

  const prismLanguage = getPrismLanguage(file.language);

  return (
    <div 
      ref={containerRef} 
      className="p-4 h-full overflow-auto"
      onWheel={handleWheel}
      style={{ cursor: 'default' }}
    >
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
            __html: highlightedCode || sanitizeContent(file.content, 'html-content')
          }}
        />
      </pre>
    </div>
  );
};