import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { ParsedFile } from '@/types/codebase';
import { sanitizeContent } from '@/utils/security';
import { debounce, optimizedScroll } from '@/utils/performance';
import { useWheelScrollIsolation } from '@/hooks/useWheelScrollIsolation';
import { replaceMethodNameInText, makeImportMethodsClickable } from '@/utils/method-highlighting';

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
      case 'tsx':
        return 'tsx'; // TSX専用言語として扱う
      default:
        return 'text';
    }
  };

  // シンタックスハイライトを適用
  useEffect(() => {
    const highlightCode = async () => {
      if (file.content) {
        
        // Prism.jsを動的に安全にロード
        let prism;
        try {
          if (typeof window !== 'undefined' && !window.Prism) {
            // Prism.jsコアをインポート
            prism = (await import('prismjs')).default;
            
            // 言語サポートを追加（依存関係順に注意）
            await import('prismjs/components/prism-ruby' as any);
            await import('prismjs/components/prism-javascript' as any);
            await import('prismjs/components/prism-typescript' as any);
            
            // JSXはJavaScriptに依存
            try {
              await import('prismjs/components/prism-jsx' as any);
            } catch (error) {
            }
            
            // TSXはTypeScript, JavaScript, JSXに依存するため最後に読み込む
            try {
              await import('prismjs/components/prism-tsx' as any);
            } catch (error) {
            }
            
            // グローバルに設定
            window.Prism = prism;
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

        let language = getPrismLanguage(file.language);
        let grammar = prism.languages[language];
        
        // TSXが利用できない場合はTypeScriptにフォールバック
        if (!grammar && language === 'tsx') {
          language = 'typescript';
          grammar = prism.languages[language];
        }
        
        // TypeScriptが利用できない場合はJavaScriptにフォールバック
        if (!grammar && language === 'typescript') {
          language = 'javascript';
          grammar = prism.languages[language];
        }
        
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
              // 長いメソッド名から先に処理して部分置換を防ぐ
              // メモリ効率化: 大規模ファイルでの制限とパフォーマンス最適化
              const createSortedArray = (methodNames: Set<string>) => {
                // 必要時のみソート実行
                return Array.from(methodNames).sort((a, b) => b.length - a.length);
              };
              
              // 大規模ファイル検出とフォールバック
              const sortedMethodNames = clickableMethodNames.size > 1000 
                ? (() => {
                    console.warn('Large file detected, using simplified processing');
                    return createSortedArray(new Set(Array.from(clickableMethodNames).slice(0, 500)));
                  })()
                : createSortedArray(clickableMethodNames);
              sortedMethodNames.forEach(methodName => {
                if (methodName.endsWith('?') || methodName.endsWith('!')) {
                  // 特殊文字（?や!）を含むメソッド名の処理
                  // Prism.jsは?や!を別のトークンとして分離するため、特別な処理が必要
                  const baseMethodName = methodName.slice(0, -1);
                  const suffix = methodName.slice(-1);
                  const escapedBase = baseMethodName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                  const escapedSuffix = suffix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                  
                  // パターン1: メソッド定義 - <span class="token method-definition"><span class="token function">method_name</span></span><span class="token operator">?</span>
                  const definitionPattern = new RegExp(
                    `(<span class="token method-definition"><span class="token function">${escapedBase}</span></span>)(<span class="token operator">${escapedSuffix}</span>)`,
                    'g'
                  );
                  
                  highlighted = highlighted.replace(definitionPattern, 
                    `<span class="cursor-pointer hover:bg-blue-900 hover:bg-opacity-40 rounded px-1 relative" data-method-name="${methodName}">$1$2<span class="absolute -top-1 -right-1 text-xs text-yellow-400">*</span></span>`
                  );
                  
                  // パターン2: メソッド呼び出し - method_name<span class="token operator">?</span>
                  const callPattern = new RegExp(
                    `(?<![\\w])(${escapedBase})(<span class="token operator">${escapedSuffix}</span>)`,
                    'g'
                  );
                  
                  highlighted = highlighted.replace(callPattern, 
                    `<span class="cursor-pointer hover:bg-blue-900 hover:bg-opacity-40 rounded px-1 relative" data-method-name="${methodName}">$1$2<span class="absolute -top-1 -right-1 text-xs text-yellow-400">*</span></span>`
                  );
                } else {
                  // 通常のメソッド名の処理（従来通り）
                  const escapedMethodName = methodName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                  const methodNameRegex = new RegExp(`(?<![\\w])${escapedMethodName}(?![\\w])`, 'g');
                  highlighted = highlighted.replace(methodNameRegex, 
                    `<span class="cursor-pointer hover:bg-blue-900 hover:bg-opacity-40 rounded px-1 relative" data-method-name="${methodName}">$&<span class="absolute -top-1 -right-1 text-xs text-yellow-400">*</span></span>`
                  );
                }
              });

              // import文内のメソッド名もクリック可能にする
              const importMethods: string[] = [];
              file.methods.forEach(method => {
                if (method.type === 'import' && method.parameters) {
                  // import文のparametersにはimportされたメソッド名が含まれている
                  importMethods.push(...method.parameters);
                }
              });
              
              if (importMethods.length > 0) {
                // findMethodDefinition関数を作成（この時点では参照不可能なので簡易版）
                const findMethodDefinition = (methodName: string) => {
                  // 全ファイルからメソッド定義を検索
                  for (const searchFile of (window as any).__allFiles || []) {
                    if (searchFile.methods) {
                      for (const method of searchFile.methods) {
                        if (method.name === methodName) {
                          return {
                            methodName: method.name,
                            filePath: searchFile.path
                          };
                        }
                      }
                    }
                  }
                  return null;
                };
                
                highlighted = makeImportMethodsClickable(highlighted, importMethods, findMethodDefinition);
              }
            }
            
            // DOMPurifyで安全にサニタイズしてから設定
            const sanitized = sanitizeContent(highlighted, 'prism-code');
            setHighlightedCode(sanitized);
          } catch (error) {
            console.error('Prism highlight error:', error);
            setHighlightedCode(sanitizeContent(file.content, 'html-content'));
          }
        } else {
          setHighlightedCode(sanitizeContent(file.content, 'html-content'));
        }
      } else {
        // コンテンツがない場合は空文字列をセット
        setHighlightedCode('');
      }
    };

    highlightCode();
  }, [file.content, file.language, file.methods, onMethodClick]);

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
  }, [onMethodClick]);

  const prismLanguage = getPrismLanguage(file.language);

  return (
    <div 
      ref={containerRef} 
      className="p-4 h-full overflow-auto cursor-default"
      onWheel={handleWheel}
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