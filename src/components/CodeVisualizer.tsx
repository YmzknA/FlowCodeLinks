import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { Sidebar } from './Sidebar';
import { LayoutManager } from './LayoutManager';
import { DependencyLines } from './DependencyLines';
import { ZoomableCanvas } from './ZoomableCanvas';
import { CallersModal } from './CallersModal';
import { parseRepomixFile } from '@/utils/parser';
import { analyzeMethodsInFile, extractAllMethodDefinitions } from '@/utils/method-analyzer';
import { extractDependencies } from '@/utils/dependency-extractor';
import { useOptimizedAnalysis, useOptimizedDependencies } from '@/utils/performance';
import { ParsedFile, Method, Dependency, FloatingWindow } from '@/types/codebase';

export const CodeVisualizer: React.FC = () => {
  const [repomixContent, setRepomixContent] = useState<string>('');
  const [visibleFiles, setVisibleFiles] = useState<string[]>([]);
  const [highlightedMethod, setHighlightedMethod] = useState<{ methodName: string; filePath: string; lineNumber?: number } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(320); // 初期幅320px
  const [isResizing, setIsResizing] = useState(false);
  const [currentZoom, setCurrentZoom] = useState(1);
  const [currentPan, setCurrentPan] = useState({ x: -1800, y: -800 });
  const [floatingWindows, setFloatingWindows] = useState<FloatingWindow[]>([]);
  const [externalPan, setExternalPan] = useState<{ x: number; y: number } | null>(null);
  const [callersList, setCallersList] = useState<{ methodName: string; callers: Array<{ methodName: string; filePath: string; lineNumber?: number }> } | null>(null);
  const [showOpenWindowsOnly, setShowOpenWindowsOnly] = useState(true);

  // ファイル解析と最適化（2段階解析）
  const analysisResult = useMemo(() => {
    if (!repomixContent) {
      return { files: [], methods: [], dependencies: [] };
    }

    try {
      const parseResult = parseRepomixFile(repomixContent);
      
      // 第1段階: 全ファイルからメソッド定義名を抽出
      const allDefinedMethods = extractAllMethodDefinitions(parseResult.files);
      
      // 第2段階: 定義済みメソッド一覧を使ってメソッド解析（変数フィルタリング）
      const filesWithMethods = parseResult.files.map(file => ({
        ...file,
        methods: analyzeMethodsInFile(file, allDefinedMethods)
      }));

      const allMethods = filesWithMethods.flatMap(file => file.methods);
      const dependencies = extractDependencies(allMethods);

      return {
        files: filesWithMethods,
        methods: allMethods,
        dependencies
      };
    } catch (err) {
      return { files: [], methods: [], dependencies: [], error: err instanceof Error ? err.message : '解析エラーが発生しました' };
    }
  }, [repomixContent]);

  // 解析結果に基づいてローディング状態とエラー状態を更新
  useEffect(() => {
    if (repomixContent) {
      // 解析結果の反映
      if ((analysisResult as any).error) {
        setError((analysisResult as any).error);
        setIsLoading(false);
      } else {
        setError(null);
        // ファイルが正常に解析された場合のみローディングを停止
        if ((analysisResult as any).files?.length > 0) {
          setIsLoading(false);
        }
      }
    }
  }, [repomixContent, analysisResult]);

  const { files, dependencies } = analysisResult as { files: ParsedFile[]; methods: Method[]; dependencies: Dependency[] };
  const optimizedCache = useOptimizedAnalysis(files);
  const visibleDependencies = useOptimizedDependencies(dependencies, visibleFiles);

  // 全ファイルデータをグローバルに設定（メソッドクリック可能性判定用）
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__allFiles = files;
      
      // FloatingWindowに更新を通知
      if (files.length > 0) {
        // カスタムイベントを発行
        const event = new CustomEvent('__allFiles_updated', {
          detail: { files, count: files.length }
        });
        window.dispatchEvent(event);
      }
    }
  }, [files]);

  // フィルタリング済みファイルをメモ化して参照安定性を確保
  const visibleFilesData = useMemo(() => {
    return files.filter(f => visibleFiles.includes(f.path));
  }, [files, visibleFiles]);

  // ファイルアップロードハンドラー
  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        setIsLoading(true);
        const content = await file.text();
        setRepomixContent(content);
        
        // 初期表示: 全ファイル非表示でスタート
        setVisibleFiles([]);
      } catch (err) {
        setError('ファイルの読み込みに失敗しました');
        setIsLoading(false);
      }
    }
  }, []);

  // ファイル表示切り替え
  const handleFileToggle = useCallback((filePath: string) => {
    setVisibleFiles(prev => 
      prev.includes(filePath)
        ? prev.filter(path => path !== filePath)
        : [...prev, filePath]
    );
  }, []);

  // 全表示/非表示
  const handleShowAll = useCallback(() => {
    setVisibleFiles(files.map(f => f.path));
  }, [files]);

  const handleHideAll = useCallback(() => {
    setVisibleFiles([]);
  }, []);

  // メソッドハイライト
  const handleMethodHighlight = useCallback((method: { methodName: string; filePath: string }) => {
    // ファイルが表示されていない場合は表示する
    if (!visibleFiles.includes(method.filePath)) {
      setVisibleFiles(prev => [...prev, method.filePath]);
    }
    
    setHighlightedMethod(method);
    
    // メソッドジャンプ機能を使用してウィンドウを画面中央に表示
    // ファイルが新規表示かどうかで遅延時間を調整
    const isNewFile = !visibleFiles.includes(method.filePath);
    const jumpDelay = isNewFile ? 350 : 50; // 新規ファイルは350ms、既存ファイルは50ms
    
    setTimeout(() => {
      // ウィンドウを画面中央に移動する処理
        setFloatingWindows(currentWindows => {
          const targetWindow = currentWindows.find(w => w.file.path === method.filePath);
          
          if (targetWindow) {
            // キャンバスオフセット(2000px, 1000px)を考慮
            const canvasOffset = { x: 2000, y: 1000 };
            
            // ウィンドウの基本位置
            const windowX = targetWindow.position.x;
            const windowY = targetWindow.position.y;
            const windowWidth = targetWindow.position.width;
            const windowHeight = targetWindow.position.height;
            
            // ウィンドウ中央にパンを移動
            const targetMethodX = windowX + windowWidth / 2;
            const targetMethodY = windowY + windowHeight / 2;
            
            const targetCanvasX = targetMethodX + canvasOffset.x;
            const targetCanvasY = targetMethodY + canvasOffset.y;
            
            // 画面中央に表示するためのパン位置を計算
            const viewportWidth = window.innerWidth - (sidebarCollapsed ? 48 : sidebarWidth);
            const viewportHeight = window.innerHeight;
            
            const newPan = {
              x: viewportWidth / 2 - targetCanvasX * currentZoom,
              y: viewportHeight / 2 - targetCanvasY * currentZoom
            };
            
            // 外部パンとして設定（ZoomableCanvasに反映される）
            setExternalPan(newPan);
            // 少し遅れてリセット（一度だけ適用）
            setTimeout(() => {
              setExternalPan(null);
            }, 50);
          }
          return currentWindows; // 状態は変更しない
        });
    }, jumpDelay);
  }, [visibleFiles, currentZoom, sidebarCollapsed, sidebarWidth]);

  const handleClearHighlight = useCallback(() => {
    setHighlightedMethod(null);
  }, []);

  // ディレクトリ一括表示切り替え
  const handleDirectoryToggle = useCallback((directoryPath: string) => {
    // ディレクトリ配下のファイルを取得
    const directoryFiles = files.filter(file => 
      file.path.startsWith(directoryPath + '/') || 
      (directoryPath === '' && !file.path.includes('/'))
    );
    
    const dirFilePaths = directoryFiles.map(f => f.path);
    const allVisible = dirFilePaths.every(path => visibleFiles.includes(path));
    
    if (allVisible) {
      // 全て表示中なら非表示にする
      setVisibleFiles(prev => prev.filter(path => !dirFilePaths.includes(path)));
    } else {
      // 一部または全部非表示なら全て表示する
      setVisibleFiles(prev => {
        const newVisible = [...prev];
        dirFilePaths.forEach(path => {
          if (!newVisible.includes(path)) {
            newVisible.push(path);
          }
        });
        return newVisible;
      });
    }
  }, [files, visibleFiles]);

  // サイドバーリサイズ機能
  const handleMouseDown = useCallback(() => {
    setIsResizing(true);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return;
    
    const newWidth = Math.max(200, Math.min(600, e.clientX)); // 最小200px, 最大600px
    setSidebarWidth(newWidth);
  }, [isResizing]);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

  // LayoutManagerからのウィンドウ更新を受け取る
  const handleWindowsUpdate = useCallback((windows: FloatingWindow[]) => {
    setFloatingWindows(windows);
  }, []);

  // メソッド定義元を見つける関数
  const findMethodDefinition = useCallback((methodName: string): { methodName: string; filePath: string } | null => {
    // 全ファイルからメソッド定義を検索
    for (const file of files) {
      if (file.methods) {
        for (const method of file.methods) {
          if (method.name === methodName) {
            return {
              methodName: method.name,
              filePath: file.path
            };
          }
        }
      }
    }
    return null;
  }, [files]);

  // メソッド呼び出し元を全て検索する関数
  const findAllMethodCallers = useCallback((methodName: string): Array<{ methodName: string; filePath: string; lineNumber?: number }> => {
    const callers: Array<{ methodName: string; filePath: string; lineNumber?: number }> = [];
    
    // 全ファイルからメソッドを呼び出しているメソッドを検索
    for (const file of files) {
      if (file.methods) {
        for (const method of file.methods) {
          // メソッドの calls 配列からmethodNameを呼び出しているかチェック
          const call = method.calls?.find(call => call.methodName === methodName);
          if (call) {
            callers.push({
              methodName: method.name,
              filePath: file.path,
              lineNumber: call.line
            });
          }
        }
      }
    }
    
    return callers;
  }, [files]);

  // メソッド呼び出し元を見つける関数（単一）
  const findMethodCaller = useCallback((methodName: string, currentFilePath: string): { methodName: string; filePath: string } | null => {
    // 現在のファイルで該当メソッドを呼び出しているメソッドを検索
    const currentFile = files.find(f => f.path === currentFilePath);
    if (currentFile && currentFile.methods) {
      for (const method of currentFile.methods) {
        // メソッドの calls 配列からmethodNameを呼び出しているかチェック
        const hasCall = method.calls?.some(call => call.methodName === methodName);
        if (hasCall) {
          return {
            methodName: method.name,
            filePath: currentFile.path
          };
        }
      }
    }
    return null;
  }, [files]);

  // メソッドジャンプ機能
  const handleMethodJump = useCallback((method: { methodName: string; filePath: string; lineNumber?: number }) => {

    const wasHidden = !visibleFiles.includes(method.filePath);
    
    if (wasHidden) {
      setVisibleFiles(prev => [...prev, method.filePath]);
    }

    setHighlightedMethod(method);

    const waitTime = wasHidden ? 300 : 150;
    
    setTimeout(() => {
      setFloatingWindows(currentWindows => {
        const targetWindow = currentWindows.find(w => w.file.path === method.filePath);
        
        if (targetWindow) {
          
          // キャンバスオフセット(2000px, 1000px)を考慮
          const canvasOffset = { x: 2000, y: 1000 };
          
          // ウィンドウの基本位置
          const windowX = targetWindow.position.x;
          const windowY = targetWindow.position.y;
          const windowWidth = targetWindow.position.width;
          const windowHeight = targetWindow.position.height;
          
          // ウィンドウ中央にパンを移動（従来通り）
          const targetMethodX = windowX + windowWidth / 2;
          const targetMethodY = windowY + windowHeight / 2;
          
          // 行番号の有無によってスクロール動作が変わる
          // lineNumber有り: 呼び出し行を中央表示
          // lineNumber無し: メソッド定義行を上端表示
          
          const targetCanvasX = targetMethodX + canvasOffset.x;
          const targetCanvasY = targetMethodY + canvasOffset.y;
          
          // 画面中央に表示するためのパン位置を計算
          const viewportWidth = window.innerWidth - (sidebarCollapsed ? 48 : sidebarWidth);
          const viewportHeight = window.innerHeight;
          
          const newPan = {
            x: viewportWidth / 2 - targetCanvasX * currentZoom,
            y: viewportHeight / 2 - targetCanvasY * currentZoom
          };
          
          
          // 外部パンとして設定（ZoomableCanvasに反映される）
          setExternalPan(newPan);
          // 少し遅れてリセット（一度だけ適用）
          setTimeout(() => {
                  setExternalPan(null);
          }, 50);
        } else {
        }
        return currentWindows; // 状態は変更しない
      });
    }, waitTime);
  }, [visibleFiles, currentZoom, sidebarCollapsed, sidebarWidth]);

  // import文内のメソッドクリック処理
  const handleImportMethodClick = useCallback((methodName: string) => {
    // import文内のメソッドは必ず定義元にジャンプ
    const definition = findMethodDefinition(methodName);
    if (definition) {
      handleMethodJump(definition);
    } else {
      console.warn(`Method definition not found: ${methodName}`);
    }
  }, [findMethodDefinition, handleMethodJump]);

  // メソッドクリック時の処理
  const handleMethodClick = useCallback((methodName: string, currentFilePath: string) => {
    // 現在のファイルでクリックされたメソッドが定義されているかチェック
    const currentFile = files.find(f => f.path === currentFilePath);
    const isDefinedInCurrentFile = currentFile?.methods?.some(method => method.name === methodName);
    
    if (isDefinedInCurrentFile) {
      // 定義元メソッドの場合：呼び出し元一覧を表示
      const callers = findAllMethodCallers(methodName);
      setCallersList({ methodName, callers });
    } else {
      // 呼び出されているメソッドの場合：定義元にジャンプ
      const definition = findMethodDefinition(methodName);
      if (definition) {
        handleMethodJump(definition);
      } else {
      }
    }
  }, [files, findAllMethodCallers, findMethodDefinition, handleMethodJump]);

  // 呼び出し元一覧からのジャンプ機能
  const handleCallerClick = useCallback((caller: { methodName: string; filePath: string; lineNumber?: number }) => {
    
    setCallersList(null); // モーダルを閉じる
    
    handleMethodJump(caller);
  }, [handleMethodJump]);

  // 呼び出し元一覧モーダルを閉じる
  const handleCloseCallersList = useCallback(() => {
    setCallersList(null);
  }, []);

  // 開いているウィンドウのファイルパス一覧を取得
  const openWindowPaths = useMemo(() => {
    return floatingWindows.map(window => window.file.path);
  }, [floatingWindows]);


  if (files.length === 0 && !isLoading && !error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="card w-[500px] bg-base-200 shadow-2xl">
          <div className="card-body items-center text-center">
            <div className="mb-8">
              <img 
                src="/logo.png" 
                alt="FlowCodeLinks Logo" 
                className="w-40 h-40 mx-auto mb-6"
              />
            </div>
            <h1 className="text-5xl font-bold text-black mb-4 raleway">
              FlowCodeLinks
            </h1>
            <p className="text-base-content/70 mb-8 text-lg">
              Repomixで生成されたmdファイルをアップロードして、コードの関係性を可視化
            </p>
            <div className="card-actions">
              <label className="btn btn-primary btn-lg gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                ファイルを選択
                <input
                  type="file"
                  accept=".md"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <span className="loading loading-spinner loading-lg text-primary mb-4"></span>
          <p className="text-base-content/70 text-lg">コードを解析中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="card w-96 bg-base-200 shadow-2xl">
          <div className="card-body items-center text-center">
            <div className="text-error text-6xl mb-4">⚠️</div>
            <h1 className="card-title text-xl text-error mb-2">エラーが発生しました</h1>
            <p className="text-base-content/70 mb-6">{error}</p>
            <div className="card-actions">
              <button
                onClick={() => {
                  setError(null);
                  setRepomixContent('');
                }}
                className="btn btn-primary btn-wide"
              >
                最初に戻る
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex bg-base-100 overflow-hidden">
      {/* サイドバー */}
      <div 
        className={`relative flex-shrink-0 ${sidebarCollapsed ? 'w-12' : ''}`}
        style={{ width: sidebarCollapsed ? '48px' : `${sidebarWidth}px` }}
      >
        {/* サイドバー折りたたみボタン */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="btn btn-circle btn-sm btn-outline absolute top-4 -right-3 z-50 shadow-lg"
          title={sidebarCollapsed ? 'サイドバーを開く' : 'サイドバーを閉じる'}
        >
          {sidebarCollapsed ? '▶' : '◀'}
        </button>
        
        {!sidebarCollapsed && (
          <Sidebar
            files={files}
            visibleFiles={visibleFiles}
            highlightedMethod={highlightedMethod}
            onFileToggle={handleFileToggle}
            onShowAll={handleShowAll}
            onHideAll={handleHideAll}
            onMethodHighlight={handleMethodHighlight}
            onClearHighlight={handleClearHighlight}
            onDirectoryToggle={handleDirectoryToggle}
            sidebarWidth={sidebarWidth}
          />
        )}

        {/* リサイズハンドル */}
        {!sidebarCollapsed && (
          <div
            className="absolute top-0 right-0 w-1 h-full bg-base-300 hover:bg-primary cursor-col-resize transition-colors"
            onMouseDown={handleMouseDown}
            title="サイドバーの幅を調整"
          />
        )}
        
        {/* 折りたたみ時のミニコントロール */}
        {sidebarCollapsed && (
          <div className="h-full bg-base-200 border-r border-base-300 flex flex-col items-center justify-center space-y-6">
            <div className="stats stats-vertical shadow-sm">
              <div className="stat place-items-center py-2">
                <div className="stat-value text-sm text-primary">
                  {files.length}
                </div>
                <div className="stat-desc text-xs">
                  files
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* メインエリア */}
      <div className="flex-1 relative bg-base-300/20 min-h-screen overflow-hidden">
        {/* ファイル変更ボタン */}
        <div className="absolute top-4 left-4 z-50">
          <label className="btn btn-secondary btn-sm gap-2 shadow-lg">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            ファイル変更
            <input
              type="file"
              accept=".md"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>

        {/* ズーム可能キャンバス */}
        <ZoomableCanvas 
          className="w-full h-full"
          onZoomChange={setCurrentZoom}
          onPanChange={setCurrentPan}
          externalPan={externalPan}
        >
          {/* レイアウトマネージャー */}
          <LayoutManager
            files={visibleFilesData}
            dependencies={visibleDependencies}
            onFileToggle={handleFileToggle}
            onWindowsUpdate={handleWindowsUpdate}
            zoom={currentZoom}
            highlightedMethod={highlightedMethod}
            onMethodClick={handleMethodClick}
            onImportMethodClick={handleImportMethodClick}
          />
        </ZoomableCanvas>
        
        {/* 依存関係の線（ZoomableCanvasの外に配置） */}
        <DependencyLines
          windows={floatingWindows}
          dependencies={visibleDependencies}
          highlightedMethod={highlightedMethod}
          zoom={currentZoom}
          pan={currentPan}
          sidebarCollapsed={sidebarCollapsed}
          sidebarWidth={sidebarWidth}
          onMethodJump={handleMethodJump}
        />
      </div>

      {/* 呼び出し元一覧モーダル */}
      {callersList && (
        <CallersModal
          methodName={callersList.methodName}
          callers={callersList.callers}
          isOpen={true}
          onClose={handleCloseCallersList}
          onCallerClick={handleCallerClick}
          showOpenWindowsOnly={showOpenWindowsOnly}
          onToggleShowOpenWindowsOnly={() => setShowOpenWindowsOnly(!showOpenWindowsOnly)}
          openWindows={openWindowPaths}
        />
      )}
    </div>
  );
};

export default CodeVisualizer;
