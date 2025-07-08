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
  onMethodClick?: (methodName: string, currentFilePath: string, metadata?: { line?: number; isDefinition?: boolean }) => void;
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
  const [isClient, setIsClient] = useState(false);
  const [methodHighlightAPI, setMethodHighlightAPI] = useState<{
    setOriginalMethod: (methodName: string) => void;
    clearOriginalMethod: () => void;
  } | null>(null);

  // クライアントサイド確認
  useEffect(() => {
    setIsClient(true);
  }, []);

  // SSR対応: クライアントサイドでのみストレージから取得
  useEffect(() => {
    if (isClient) {
      import('@/utils/secure-storage').then(({ methodHighlightStorage }) => {
        setMethodHighlightAPI({
          setOriginalMethod: methodHighlightStorage.setOriginalMethod,
          clearOriginalMethod: methodHighlightStorage.clearOriginalMethod
        });
      });
    }
  }, [isClient]);

  const [highlightedCode, setHighlightedCode] = useState<string>('');
  const [forceUpdate, setForceUpdate] = useState<number>(0);
  const processedContentRef = useRef<string>('');
  const contentRef = useRef<HTMLDivElement>(null);
  const hasJumpedToMethod = useRef<boolean>(false);
  const lastHighlightedMethod = useRef<typeof highlightedMethod>(null);
  const isClickProcessing = useRef<boolean>(false);
  const lastClickTime = useRef<number>(0);
  const onScrollChangeRef = useRef(onScrollChange);
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
    } else {
      // フォールバック
      import('@/utils/secure-storage').then(({ methodHighlightStorage }) => {
        methodHighlightStorage.clearOriginalMethod();
      });
    }
    onClose(id);
  };

  // Refを常に最新の値に更新
  useEffect(() => {
    onScrollChangeRef.current = onScrollChange;
    onImportMethodClickRef.current = onImportMethodClick;
  }, [onScrollChange, onImportMethodClick]);

  // 初期スクロール情報を設定（コンポーネントマウント時）
  useEffect(() => {
    if (contentRef.current && onScrollChangeRef.current && !window.scrollInfo && isClient) {
      const scrollInfo = calculateScrollInfo(contentRef.current);
      onScrollChangeRef.current(id, scrollInfo);
    }
    // window.scrollInfoは動的に変化するプロパティのため依存配列から除外
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isClient]);



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
    let lineNumber: number | undefined;
    let isDefinition: boolean | undefined;
    
    for (let i = 0; i < 5 && currentElement; i++) {
      methodName = currentElement.getAttribute('data-method-name');
      if (methodName) {
        foundClickableMethod = true;
        // import文内のメソッドかどうかを判定
        isImportMethod = currentElement.getAttribute('data-import-method') === 'true';
        
        // メタデータを読み取り
        const lineAttr = currentElement.getAttribute('data-line');
        const isDefAttr = currentElement.getAttribute('data-is-definition');
        
        lineNumber = lineAttr ? parseInt(lineAttr, 10) : undefined;
        isDefinition = isDefAttr === 'true';
        
        break;
      }
      currentElement = currentElement.parentElement;
    }
    
    if (foundClickableMethod && methodName && onMethodClick) {
      event.preventDefault();
      event.stopPropagation();
      
      // import文内のメソッドの場合は専用のハンドラーを呼び出し
      // 通常のメソッドの場合は従来のハンドラーを呼び出し
      // 最初にクリックされたメソッド名を保存（モーダル選択後も保持）
      if (methodHighlightAPI) {
        methodHighlightAPI.setOriginalMethod(methodName);
      } else {
        // フォールバック
        import('@/utils/secure-storage').then(({ methodHighlightStorage }) => {
          methodHighlightStorage.setOriginalMethod(methodName);
        });
      }
      
      // 強制的に再レンダリングしてハイライトを即座に反映
      setForceUpdate(prev => prev + 1);
      
      setTimeout(() => {
        if (isImportMethod && onImportMethodClickRef?.current) {
          onImportMethodClickRef.current(methodName!);
        } else {
          if (onMethodClick) {
            onMethodClick(methodName!, file.path, { line: lineNumber, isDefinition });
          }
        }
      }, 10);
    }
  }, [methodHighlightAPI, file.path, onMethodClick]);

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
    // コンポーネントのアンマウント時にクリーンアップ
    return () => {
      // グローバルプロパティの削除
      if (typeof window !== 'undefined') {
        delete (window as any).__originalClickedMethod;
      }
    };
    // windowオブジェクトは依存配列に含めない（参照が毎回変わるため）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [methodHighlightAPI]);

  // シンタックスハイライトを適用
  useEffect(() => {
    const highlightCode = async () => {
      
      // クライアントサイドでのみ実行
      if (!isClient) {
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
              if (onMethodClick && file.methods) {
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
                        highlightedMethod
                      );
                    } else {
                      // 全ファイルデータが利用できない場合は、従来の動作を維持
                      // findMethodDefinitionを渡さないことで、全てのメソッドをクリック可能にする
                      // これにより、useAuthのような外部ファイルで定義されたメソッドもクリック可能
                      highlighted = replaceMethodNameInText(highlighted, methodName, escapedMethodName, undefined, undefined, file.path, undefined, highlightedMethod);
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
    const currentContentKey = `${file.content}-${isCollapsed}-${showMethodsOnly}-${file.language}-${allFilesVersion}-${forceUpdate}-${highlightedMethod?.methodName}-${highlightedMethod?.filePath}`;
    if (processedContentRef.current !== currentContentKey) {
      processedContentRef.current = currentContentKey;
      highlightCode();
    }
    // onMethodClick, windowは意図的に依存配列から除外（安定性のため）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file.content, file.methods, file.path, isCollapsed, showMethodsOnly, file.language, allFilesVersion, forceUpdate, highlightedMethod, isClient]);

  // コンテンツ変更後にスクロール情報を更新
  useEffect(() => {
    // コンテンツが更新された後、少し遅延してスクロール情報を更新
    const timer = setTimeout(() => {
      if (contentRef.current && onScrollChangeRef.current && isClient) {
        const scrollInfo = calculateScrollInfo(contentRef.current);
        onScrollChangeRef.current(id, scrollInfo);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [id, isClient]);

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
        isClient &&
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
    // windowは意図的に依存配列から除外（DOMアクセスのため）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlightedMethod, file.path, file.methods, file.totalLines, isCollapsed, showMethodsOnly, isClient]);

  // メソッドのみ表示モードでのスクロール
  useEffect(() => {
    if (highlightedMethod && 
        highlightedMethod.filePath === file.path && 
        contentRef.current &&
        !isCollapsed &&
        showMethodsOnly &&
        isClient &&
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
    // windowは意図的に依存配列から除外（DOMアクセスのため）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlightedMethod, file.path, isCollapsed, showMethodsOnly, isClient]);

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
                if (onMethodClick && !isClickProcessing.current) {
                  isClickProcessing.current = true;
                  setTimeout(() => {
                    // メソッド一覧からのクリックは定義行とみなす
                    onMethodClick(method.name, file.path, { line: method.startLine, isDefinition: true });
                    isClickProcessing.current = false;
                  }, 10);
                }
              }}
            >
              <div 
                className={`font-semibold text-primary ${
                  highlightedMethod && 
                  highlightedMethod.methodName === method.name && 
                  highlightedMethod.filePath === file.path 
                    ? 'bg-warning/30 rounded px-1' 
                    : ''
                }`}
                style={{ cursor: 'pointer' }}
              >
                {method.name}
              </div>
              <div className="text-sm text-base-content/60">{method.type}</div>
            </div>
          ))}
        </div>
      );
    }

    const prismLanguage = getPrismLanguage(file.language);

    return (
      <div 
        ref={contentRef}
        className="h-full overflow-auto cursor-default"
        onScroll={handleScroll}
        onClick={handleCodeClick}
        onWheel={handleWheel}
      >
        <pre 
          className={`language-${prismLanguage} text-sm m-0`}
          style={{ 
            whiteSpace: 'pre', 
            tabSize: 2,
            fontFamily: 'Consolas, Monaco, "Andale Mono", "Ubuntu Mono", monospace',
            backgroundColor: '#2d2d2d',
            color: '#ccc',
            margin: 0,
            padding: '1rem',
            minHeight: '100%',
            borderRadius: 0
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
    <div className="card bg-base-100 border border-base-300 shadow-xl h-full">
      {/* ヘッダー（ドラッグハンドル） */}
      <div className="draggable-header card-title bg-base-200 rounded-t-2xl p-3 border-b border-base-300 cursor-grab active:cursor-grabbing">
        <div className="flex-1">
          <div className="font-semibold text-base-content flex items-center gap-2">
            <span className="text-primary">📄</span>
            {file.fileName}
          </div>
          <div className="text-xs text-base-content/60">{file.path} ({file.totalLines} lines)</div>
        </div>
        <div className="flex gap-1">
          <button
            onClick={handleToggleMethodsOnly}
            aria-label="メソッドのみ表示"
            className="btn btn-ghost btn-xs btn-circle"
            title="メソッドのみ表示"
          >
            ⚡
          </button>
          <button
            onClick={handleToggleCollapse}
            aria-label="折りたたみ"
            className="btn btn-ghost btn-xs btn-circle"
            title="折りたたみ"
          >
            {isCollapsed ? '□' : '_'}
          </button>
          <button
            onClick={handleClose}
            aria-label="閉じる"
            className="btn btn-ghost btn-xs btn-circle text-error hover:bg-error/20"
            title="閉じる"
          >
            ×
          </button>
        </div>
      </div>

      {/* コンテンツ */}
      {!isCollapsed && (
        <div className="flex-1 overflow-hidden">
          {renderContent()}
        </div>
      )}
    </div>
  );
};