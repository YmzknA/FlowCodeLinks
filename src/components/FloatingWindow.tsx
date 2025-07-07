import React, { useEffect, useRef, useState, useCallback } from 'react';
import { FloatingWindow as FloatingWindowType, ScrollInfo } from '@/types/codebase';
import { useWheelScrollIsolation } from '@/hooks/useWheelScrollIsolation';
import { replaceMethodNameInText, highlightMethodDefinition } from '@/utils/method-highlighting';
import { prismLoader } from '@/utils/prism-loader';
import { useAllFilesMonitor } from '@/hooks/useAllFilesMonitor';
// import { useMethodHighlight } from '@/context/MethodHighlightContext'; // SSR対応のため動的インポートに変更

interface FloatingWindowProps {
  window: FloatingWindowType;
  onPositionChange: (id: string, position: { x: number; y: number }) => void;
  onToggleCollapse: (id: string) => void;
  onToggleMethodsOnly: (id: string) => void;
  onClose: (id: string) => void;
  onScrollChange?: (id: string, scrollInfo: ScrollInfo) => void;
  highlightedMethod?: { methodName: string; filePath: string; lineNumber?: number } | null;
  onMethodClick?: (methodName: string) => void;
  onImportMethodClick?: (methodName: string) => void;
}

export const FloatingWindow: React.FC<FloatingWindowProps> = ({
  window,
  onPositionChange,
  onToggleCollapse,
  onToggleMethodsOnly,
  onClose,
  onScrollChange,
  highlightedMethod,
  onMethodClick,
  onImportMethodClick
}) => {
  const { id, file, position, isCollapsed, showMethodsOnly } = window;
  const [originalClickedMethod, setOriginalClickedMethod] = useState<string | null>(null);
  const [methodHighlightAPI, setMethodHighlightAPI] = useState<{
    setOriginalMethod: (methodName: string) => void;
    clearOriginalMethod: () => void;
  } | null>(null);

  // SSR対応: クライアントサイドでのみストレージから取得
  useEffect(() => {
    if (typeof window !== 'undefined') {
      import('@/utils/secure-storage').then(({ methodHighlightStorage }) => {
        setOriginalClickedMethod(methodHighlightStorage.getOriginalMethod());
        setMethodHighlightAPI({
          setOriginalMethod: methodHighlightStorage.setOriginalMethod,
          clearOriginalMethod: methodHighlightStorage.clearOriginalMethod
        });
      });
    }
  }, []);

  const [highlightedCode, setHighlightedCode] = useState<string>('');
  const processedContentRef = useRef<string>('');
  const contentRef = useRef<HTMLDivElement>(null);
  const hasJumpedToMethod = useRef<boolean>(false);
  const lastHighlightedMethod = useRef<typeof highlightedMethod>(null);
  const isClickProcessing = useRef<boolean>(false);
  const lastClickTime = useRef<number>(0);
  const onScrollChangeRef = useRef(onScrollChange);
  const onMethodClickRef = useRef(onMethodClick);
  const onImportMethodClickRef = useRef(onImportMethodClick);
  
  // ホイールスクロール分離フックを使用
  const { handleWheel } = useWheelScrollIsolation(contentRef);

  const handleToggleCollapse = () => {
    onToggleCollapse(id);
  };

  const handleToggleMethodsOnly = () => {
    onToggleMethodsOnly(id);
  };

  const handleClose = () => {
    // ウィンドウを閉じる時にクリック状態をクリア
    if (methodHighlightAPI) {
      methodHighlightAPI.clearOriginalMethod();
    }
    onClose(id);
  };

  // Refを常に最新の値に更新
  useEffect(() => {
    onScrollChangeRef.current = onScrollChange;
    onMethodClickRef.current = onMethodClick;
    onImportMethodClickRef.current = onImportMethodClick;
  }, [onScrollChange, onMethodClick, onImportMethodClick]);

  // 初期スクロール情報を設定（コンポーネントマウント時）
  useEffect(() => {
    if (contentRef.current && onScrollChangeRef.current && !window.scrollInfo && typeof window !== 'undefined') {
      const scrollInfo = calculateScrollInfo(contentRef.current);
      onScrollChangeRef.current(id, scrollInfo);
    }
  }, [id, window]);



  // スクロール情報を計算する関数
  const calculateScrollInfo = (element: HTMLDivElement): ScrollInfo => {
    const scrollTop = element.scrollTop;
    const scrollHeight = element.scrollHeight;
    const clientHeight = element.clientHeight;
    
    // 表示開始位置と終了位置の割合を計算
    const visibleStartRatio = scrollTop / scrollHeight;
    const visibleEndRatio = (scrollTop + clientHeight) / scrollHeight;
    
    return {
      scrollTop,
      scrollHeight,
      clientHeight,
      visibleStartRatio: Math.max(0, Math.min(1, visibleStartRatio)),
      visibleEndRatio: Math.max(0, Math.min(1, visibleEndRatio))
    };
  };

  // スクロールイベントハンドラー
  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    if (onScrollChangeRef.current && contentRef.current) {
      const scrollInfo = calculateScrollInfo(contentRef.current);
      onScrollChangeRef.current(id, scrollInfo);
    }
  }, [id]);


  // メソッドクリックイベントハンドラー（デバウンス機能付き）
  const handleCodeClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    const currentTime = Date.now();
    
    // 短時間での連続クリックを防止（200ms以内は無視）
    if (currentTime - lastClickTime.current < 200 || isClickProcessing.current) {
      return;
    }
    
    lastClickTime.current = currentTime;
    isClickProcessing.current = true;
    
    // 処理完了後にフラグをリセット
    setTimeout(() => {
      isClickProcessing.current = false;
    }, 100);
    
    let target = event.target as HTMLElement;
    
    // クリックされた要素から上に向かってdata-method-nameを探す
    let currentElement: HTMLElement | null = target;
    let foundClickableMethod = false;
    let methodName: string | null = null;
    
    // 最大5レベル上まで遡ってdata-method-nameを探す
    let isImportMethod = false;
    for (let i = 0; i < 5 && currentElement; i++) {
      methodName = currentElement.getAttribute('data-method-name');
      if (methodName) {
        foundClickableMethod = true;
        // import文内のメソッドかどうかを判定
        isImportMethod = currentElement.getAttribute('data-import-method') === 'true';
        break;
      }
      currentElement = currentElement.parentElement;
    }
    
    if (foundClickableMethod && methodName && onMethodClickRef.current) {
      event.preventDefault();
      event.stopPropagation();
      
      // import文内のメソッドの場合は専用のハンドラーを呼び出し
      // 通常のメソッドの場合は従来のハンドラーを呼び出し
      // 最初にクリックされたメソッド名を保存（モーダル選択後も保持）
      if (methodHighlightAPI) {
        methodHighlightAPI.setOriginalMethod(methodName);
        setOriginalClickedMethod(methodName);
      }
      
      setTimeout(() => {
        if (isImportMethod && onImportMethodClickRef?.current) {
          onImportMethodClickRef.current(methodName!);
        } else {
          onMethodClickRef.current!(methodName!);
        }
      }, 10);
    }
  }, []);

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

  // __allFilesの変更を監視して再処理 - カスタムフックに分離
  const { allFilesVersion } = useAllFilesMonitor(file.path);

  // コンポーネントのアンマウント時にクリーンアップ
  useEffect(() => {
    return () => {
      // コンポーネントがアンマウントされる時は何もしない
      // グローバル状態はContext側で管理
    };
  }, []);

  // シンタックスハイライトを適用
  useEffect(() => {
    const highlightCode = async () => {
      
      // クライアントサイドでのみ実行
      if (typeof window === 'undefined') {
        setHighlightedCode(file.content || '');
        return;
      }

      if (file.content && !isCollapsed && !showMethodsOnly) {
        try {
          // 動的にPrism.jsをロード
          let Prism = (window as any).Prism;
          
          if (!Prism) {
            // 必要な言語をロード
            const language = getPrismLanguage(file.language);
            
            // Prismローダーユーティリティを使用
            Prism = await prismLoader.loadLanguageSupport(language);
            
            if (!Prism) {
              // フォールバック: 直接読み込み
              Prism = (await import('prismjs')).default;
              (window as any).Prism = Prism;
            }
          }

          let language = getPrismLanguage(file.language);
          let grammar = Prism.languages && Prism.languages[language];
          
          // TSXが利用できない場合はTypeScriptにフォールバック
          if (!grammar && language === 'tsx') {
            language = 'typescript';
            grammar = Prism.languages && Prism.languages[language];
          }
          
          // TypeScriptが利用できない場合はJavaScriptにフォールバック
          if (!grammar && language === 'typescript') {
            language = 'javascript';
            grammar = Prism.languages && Prism.languages[language];
          }
          
          
          if (grammar) {
            try {
              // Prism.highlightでHTMLを生成
              let highlighted = Prism.highlight(file.content, grammar, language);
              
              // メソッド名をクリック可能にする
              if (onMethodClickRef.current && file.methods) {
                // 全てのメソッド名を収集
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
                
                // 各メソッド名をクリック可能にする（HTML属性を保護しながら）
                // 長いメソッド名から先に処理して部分置換を防ぐ
                const sortedMethodNames = Array.from(clickableMethodNames).sort((a, b) => b.length - a.length);
                
                
                // findMethodDefinition関数の参照を取得
                const findMethodDefinition = (methodName: string) => {
                  // 全ファイルからメソッド定義を検索
                  const allFiles = (window as any).__allFiles || [];
                  
                  
                  for (const searchFile of allFiles) {
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
                
                // findAllMethodCallers関数の参照を取得
                const findAllMethodCallers = (methodName: string) => {
                  const callers: Array<{ methodName: string; filePath: string; lineNumber?: number }> = [];
                  const allFiles = (window as any).__allFiles || [];
                  
                  for (const searchFile of allFiles) {
                    if (searchFile.methods) {
                      for (const method of searchFile.methods) {
                        const call = method.calls?.find((call: any) => call.methodName === methodName);
                        if (call) {
                          callers.push({
                            methodName: method.name,
                            filePath: searchFile.path,
                            lineNumber: call.line
                          });
                        }
                      }
                    }
                  }
                  
                  return callers;
                };
                
                sortedMethodNames.forEach(methodName => {
                  // 既にこのメソッド名がclickable-methodで囲まれているかチェック
                  const alreadyWrapped = highlighted.includes(`data-method-name="${methodName}"`);
                  if (!alreadyWrapped) {
                    // 全てのメソッド名に対してユーティリティ関数を使用（コード重複解消）
                    const escapedMethodName = methodName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    
                    // 詳細判定を有効にするかどうか
                    const allFiles = (window as any).__allFiles;
                    const enableSmartClickability = allFiles && allFiles.length > 0;
                    
                    
                    if (enableSmartClickability) {
                      highlighted = replaceMethodNameInText(
                        highlighted, 
                        methodName, 
                        escapedMethodName,
                        findMethodDefinition,
                        findAllMethodCallers,
                        file.path,
                        (window as any).__allFiles,
                        highlightedMethod,
                        originalClickedMethod
                      );
                    } else {
                      // 全ファイルデータが利用できない場合は、従来の動作を維持
                      // findMethodDefinitionを渡さないことで、全てのメソッドをクリック可能にする
                      // これにより、useAuthのような外部ファイルで定義されたメソッドもクリック可能
                      highlighted = replaceMethodNameInText(highlighted, methodName, escapedMethodName, undefined, undefined, file.path, undefined, highlightedMethod, originalClickedMethod);
                    }
                  }
                });
              }
              
              // メソッド定義をハイライト
              highlighted = highlightMethodDefinition(highlighted, highlightedMethod, file.path, file.methods);
              
              
              setHighlightedCode(highlighted);
            } catch (error) {
              setHighlightedCode(file.content);
            }
          } else {
            setHighlightedCode(file.content);
          }
        } catch (error) {
          setHighlightedCode(file.content);
        }
      } else {
        // コンテンツがない場合は空文字列をセット
        setHighlightedCode('');
      }
    };

    // 前回と同じコンテンツの場合は処理をスキップ
    const currentContentKey = `${file.content}-${isCollapsed}-${showMethodsOnly}-${file.language}-${allFilesVersion}-${originalClickedMethod}-${highlightedMethod?.methodName}-${highlightedMethod?.filePath}`;
    if (processedContentRef.current !== currentContentKey) {
      processedContentRef.current = currentContentKey;
      highlightCode();
    }
  }, [file.content, file.methods, file.path, isCollapsed, showMethodsOnly, file.language, allFilesVersion, originalClickedMethod, highlightedMethod, window]);

  // コンテンツ変更後にスクロール情報を更新
  useEffect(() => {
    // コンテンツが更新された後、少し遅延してスクロール情報を更新
    const timer = setTimeout(() => {
      if (contentRef.current && onScrollChangeRef.current && typeof window !== 'undefined') {
        const scrollInfo = calculateScrollInfo(contentRef.current);
        onScrollChangeRef.current(id, scrollInfo);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [id, window]);

  // highlightedMethodの変更を監視してフラグをリセット
  useEffect(() => {
    if (highlightedMethod !== lastHighlightedMethod.current) {
      hasJumpedToMethod.current = false;
      lastHighlightedMethod.current = highlightedMethod;
    }
  }, [highlightedMethod]);

  // ハイライトされたメソッドにスクロール
  useEffect(() => {
    if (highlightedMethod && 
        highlightedMethod.filePath === file.path && 
        contentRef.current &&
        !isCollapsed &&
        !showMethodsOnly &&
        typeof window !== 'undefined' &&
        !hasJumpedToMethod.current) {
      
      // 実際の行高さを測定（クライアントサイドでのみ）
      const preElement = contentRef.current.querySelector('pre');
      const actualLineHeight = preElement && typeof window !== 'undefined' && (window as any).getComputedStyle ? 
        parseFloat((window as any).getComputedStyle(preElement).lineHeight) : 18;
      
      const lineHeight = actualLineHeight;
      // 実際の表示領域の高さを使用（ヘッダーなどを除いた実際のコンテンツエリア）
      const containerHeight = contentRef.current.getBoundingClientRect().height;
      
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
      
      // パーセント方式による中央表示計算
      const totalLines = file.totalLines;
      const positionRatio = targetLine / totalLines;
      
      // スクロール可能な範囲を取得
      const scrollableHeight = contentRef.current.scrollHeight;
      const viewportHeight = containerHeight;
      
      // 対象行を中央に表示するためのスクロール位置
      const targetScrollTop = (scrollableHeight * positionRatio) - (viewportHeight / 2);
      
      // スクロール範囲内に制限
      const maxScrollTop = scrollableHeight - viewportHeight;
      const scrollPosition = Math.max(0, Math.min(targetScrollTop, maxScrollTop));
      
      
      contentRef.current.scrollTo({
        top: scrollPosition,
        behavior: 'smooth'
      });
      
      // スクロール完了後にフラグを設定
      hasJumpedToMethod.current = true;
    }
  }, [highlightedMethod, file.path, file.methods, file.totalLines, isCollapsed, showMethodsOnly, window]);

  // メソッドのみ表示モードでのスクロール
  useEffect(() => {
    if (highlightedMethod && 
        highlightedMethod.filePath === file.path && 
        contentRef.current &&
        !isCollapsed &&
        showMethodsOnly &&
        typeof window !== 'undefined' &&
        !hasJumpedToMethod.current) {
      
      // ハイライトされたメソッドの要素を見つける
      const methodElements = contentRef.current.querySelectorAll('[data-method-name]');
      let targetElement: Element | null = null;
      
      methodElements.forEach(element => {
        const methodName = (element as HTMLElement).getAttribute('data-method-name') || 
                          element.textContent?.trim();
        if (methodName === highlightedMethod.methodName) {
          targetElement = element;
        }
      });
      
      // または、メソッド名で直接検索
      if (!targetElement) {
        const methodDivs = contentRef.current.querySelectorAll('div');
        methodDivs.forEach(div => {
          const methodNameDiv = div.querySelector('.font-semibold');
          if (methodNameDiv && methodNameDiv.textContent?.trim() === highlightedMethod.methodName) {
            targetElement = div;
          }
        });
      }
      
      if (targetElement) {
        (targetElement as HTMLElement).scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
        
        // スクロール完了後にフラグを設定
        hasJumpedToMethod.current = true;
      }
    }
  }, [highlightedMethod, file.path, isCollapsed, showMethodsOnly, window]);

  // 非表示の場合は早期リターン
  if (!window.isVisible) {
    return null;
  }

  const renderContent = () => {
    if (isCollapsed) {
      return null;
    }

    if (showMethodsOnly) {
      return (
        <div 
          ref={contentRef}
          className="p-4 overflow-auto h-full cursor-default"
          style={{ 
            height: 'calc(100% - 64px)'
          }}
          onScroll={handleScroll}
          onWheel={handleWheel}
        >
          {file.methods.map((method, index) => (
            <div 
              key={index} 
              className="mb-2 p-2 bg-gray-100 rounded cursor-pointer"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (onMethodClickRef.current && !isClickProcessing.current) {
                  isClickProcessing.current = true;
                  setTimeout(() => {
                    onMethodClickRef.current!(method.name);
                    isClickProcessing.current = false;
                  }, 10);
                }
              }}
            >
              <div 
                className={`font-semibold text-blue-600 ${
                  highlightedMethod && 
                  highlightedMethod.methodName === method.name && 
                  highlightedMethod.filePath === file.path 
                    ? 'bg-yellow-200 rounded px-1' 
                    : ''
                }`}
                style={{ cursor: 'pointer' }}
              >
                {method.name}
              </div>
              <div className="text-sm text-gray-600">{method.type}</div>
            </div>
          ))}
        </div>
      );
    }

    const prismLanguage = getPrismLanguage(file.language);

    return (
      <div 
        ref={contentRef}
        className="p-4 overflow-auto h-full cursor-default"
        style={{ 
          height: 'calc(100% - 64px)'
        }}
        onScroll={handleScroll}
        onClick={handleCodeClick}
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
            margin: 0,
            overflow: 'auto'
          }}
        >
          <code 
            className={`language-${prismLanguage}`}
            style={{ 
              whiteSpace: 'pre',
              display: 'block'
            }}
            dangerouslySetInnerHTML={{ 
              __html: highlightedCode || file.content
            }}
          />
        </pre>
      </div>
    );
  };

  return (
    <div className="bg-white border border-gray-300 rounded-lg shadow-lg h-full">
      {/* ヘッダー（ドラッグハンドル） */}
      <div className="draggable-header flex items-center justify-between p-3 bg-gray-50 border-b cursor-grab active:cursor-grabbing">
        <div>
          <div className="font-semibold text-gray-800">{file.fileName}</div>
          <div className="text-xs text-gray-500">{file.path} ({file.totalLines} lines)</div>
        </div>
        <div className="flex space-x-1">
          <button
            onClick={handleToggleMethodsOnly}
            aria-label="メソッドのみ表示"
            className="p-1 text-gray-600 hover:text-blue-600 text-sm cursor-pointer"
          >
            M
          </button>
          <button
            onClick={handleToggleCollapse}
            aria-label="折りたたみ"
            className="p-1 text-gray-600 hover:text-blue-600 text-sm cursor-pointer"
          >
            {isCollapsed ? '□' : '_'}
          </button>
          <button
            onClick={handleClose}
            aria-label="閉じる"
            className="p-1 text-gray-600 hover:text-red-600 text-sm cursor-pointer"
          >
            ×
          </button>
        </div>
      </div>

      {/* コンテンツ */}
      {renderContent()}
    </div>
  );
};