import React, { useState, useCallback, useMemo } from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { Sidebar } from './Sidebar';
import { LayoutManager } from './LayoutManager';
import { DependencyLines } from './DependencyLines';
import { ZoomableCanvas } from './ZoomableCanvas';
import { CallersModal } from './CallersModal';
import { parseRepomixFile } from '@/utils/parser';
import { analyzeMethodsInFile } from '@/utils/method-analyzer';
import { extractDependencies } from '@/utils/dependency-extractor';
import { useOptimizedAnalysis, useOptimizedDependencies } from '@/utils/performance';
import { useFileUpload } from '@/hooks/useFileUpload';
import { useMethodJump } from '@/hooks/useMethodJump';
import { useSidebarResize } from '@/hooks/useSidebarResize';
import { CallersModalProvider, useCallersModal } from '@/contexts/CallersModalContext';
import { ParsedFile, FloatingWindow, MethodJumpTarget } from '@/types';

const CodeVisualizerInner: React.FC = () => {
  const [visibleFiles, setVisibleFiles] = useState<string[]>([]);
  const [highlightedMethod, setHighlightedMethod] = useState<MethodJumpTarget | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [currentZoom, setCurrentZoom] = useState(1);
  const [currentPan, setCurrentPan] = useState({ x: -1800, y: -800 });
  const [floatingWindows, setFloatingWindows] = useState<FloatingWindow[]>([]);
  const [externalPan, setExternalPan] = useState<{ x: number; y: number } | null>(null);

  // カスタムフックの使用
  const { uploadResult, handleFileUpload, resetUpload } = useFileUpload();
  const { sidebarWidth, handleMouseDown } = useSidebarResize(320);
  const { state: callersModalState, openModal, closeModal, toggleShowOpenWindowsOnly } = useCallersModal();

  // ファイル解析と最適化
  const analysisResult = useMemo(() => {
    if (!uploadResult.content) return { files: [], methods: [], dependencies: [] };

    try {
      const parseResult = parseRepomixFile(uploadResult.content);
      
      const filesWithMethods = parseResult.files.map(file => ({
        ...file,
        methods: analyzeMethodsInFile(file)
      }));

      const allMethods = filesWithMethods.flatMap(file => file.methods);
      const dependencies = extractDependencies(allMethods);

      return {
        files: filesWithMethods,
        methods: allMethods,
        dependencies
      };
    } catch (err) {
      console.error('Analysis error:', err);
      return { files: [], methods: [], dependencies: [] };
    }
  }, [uploadResult.content]);

  const { files, dependencies } = analysisResult;
  const optimizedCache = useOptimizedAnalysis(files);
  const visibleDependencies = useOptimizedDependencies(dependencies, visibleFiles);

  // メソッドジャンプ機能の初期化
  const methodJumpHook = useMethodJump({
    files,
    visibleFiles,
    setVisibleFiles,
    setHighlightedMethod,
    setFloatingWindows,
    setExternalPan,
    currentZoom,
    sidebarCollapsed,
    sidebarWidth
  });

  // フィルタリング済みファイルをメモ化して参照安定性を確保
  const visibleFilesData = useMemo(() => {
    return files.filter(f => visibleFiles.includes(f.path));
  }, [files, visibleFiles]);

  // ファイルアップロード後の処理
  const handleFileUploadComplete = useCallback(() => {
    // 初期表示: 全ファイル非表示でスタート
    setVisibleFiles([]);
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

  // ハイライトクリア
  const handleClearHighlight = useCallback(() => {
    setHighlightedMethod(null);
  }, []);

  // メソッドハイライト（カスタムフック経由）
  const handleMethodHighlight = methodJumpHook.handleMethodHighlight;

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

    setHighlightedMethod(null);
    setTimeout(() => {
      setHighlightedMethod(method);
    }, 10);

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
        console.warn(`Method definition not found for: ${methodName}`);
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
          <div className="text-center">
            <div className="text-blue-500 text-6xl mb-4">📁</div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">
              Code Visualizer
            </h1>
            <p className="text-gray-600 mb-4">
              Repomixで生成されたmdファイルをアップロードして、コードの関係性を可視化しましょう。
            </p>
            <label className="block">
              <input
                type="file"
                accept=".md"
                onChange={handleFileUpload}
                className="hidden"
              />
              <div className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 cursor-pointer">
                mdファイルを選択
              </div>
            </label>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">コードを解析中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
          <div className="text-center">
            <div className="text-red-500 text-6xl mb-4">❌</div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">エラー</h1>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={() => {
                setError(null);
                setRepomixContent('');
              }}
              className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              最初に戻る
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex bg-gray-100">
      {/* サイドバー */}
      <div 
        className={`relative flex-shrink-0 ${sidebarCollapsed ? 'w-12' : ''}`}
        style={{ width: sidebarCollapsed ? '48px' : `${sidebarWidth}px` }}
      >
        {/* サイドバー折りたたみボタン */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="absolute top-4 -right-3 z-50 w-6 h-6 bg-white border border-gray-300 rounded-full flex items-center justify-center shadow-sm hover:bg-gray-50 text-xs"
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
            className="absolute top-0 right-0 w-1 h-full bg-gray-300 hover:bg-blue-500 cursor-col-resize transition-colors"
            onMouseDown={handleMouseDown}
            title="サイドバーの幅を調整"
          />
        )}
        
        {/* 折りたたみ時のミニコントロール */}
        {sidebarCollapsed && (
          <div className="h-full bg-gray-200 border-r border-gray-300 flex flex-col items-center py-4 space-y-2">
            <div className="text-xs text-gray-600 transform -rotate-90 whitespace-nowrap">
              サイドバー
            </div>
            <div className="text-xs text-gray-500 mt-4">
              {files.length}
            </div>
            <div className="text-xs text-gray-500">
              files
            </div>
          </div>
        )}
      </div>
      
      {/* メインエリア */}
      <div className="flex-1 relative bg-gray-50 min-h-screen">
        {/* ファイル変更ボタン */}
        <div className="absolute top-4 left-4 z-50">
          <label className="block">
            <input
              type="file"
              accept=".md"
              onChange={handleFileUpload}
              className="hidden"
            />
            <div className="bg-white border border-gray-300 px-3 py-2 rounded shadow-sm hover:bg-gray-50 cursor-pointer text-sm">
              ファイル変更
            </div>
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