import React, { useState, useCallback, useMemo, useEffect } from 'react';
import Image from 'next/image';
import { ErrorBoundary } from './ErrorBoundary';
import { Sidebar } from './Sidebar';
import { LayoutManager } from './LayoutManager';
import { DependencyLines } from './DependencyLines';
import { ZoomableCanvas } from './ZoomableCanvas';
import { CallersModal } from './CallersModal';
import { AnimatedArrows } from './AnimatedArrows';
import { parseRepomixFile } from '@/utils/parser';
import { analyzeMethodsInFile, extractAllMethodDefinitions } from '@/utils/method-analyzer';
import { extractDependencies } from '@/utils/dependency-extractor';
import { useOptimizedAnalysis, useOptimizedDependencies } from '@/utils/performance';
import { useScrollAnimation, useStaggeredScrollAnimation } from '@/hooks/useScrollAnimation';
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
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

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

  // 画像クリック時の処理
  const handleImageClick = useCallback((imageIndex: number) => {
    setCurrentImageIndex(imageIndex);
    setImageModalOpen(true);
  }, []);

  // カルーセルナビゲーション
  const handlePrevImage = useCallback(() => {
    setCurrentImageIndex((prevIndex) => (prevIndex - 1 + 3) % 3);
  }, []);

  const handleNextImage = useCallback(() => {
    setCurrentImageIndex((prevIndex) => (prevIndex + 1) % 3);
  }, []);

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

  // スクロールアニメーション用フック
  const heroAnimation = useScrollAnimation({ threshold: 0.3 });
  const featuresAnimation = useScrollAnimation({ threshold: 0.2 });
  const galleryAnimation = useScrollAnimation({ threshold: 0.1 });
  const ctaAnimation = useScrollAnimation({ threshold: 0.3 });
  
  // 機能カード用段階的アニメーション
  const { elementRef: featuresGridRef, visibleItems: visibleFeatures } = useStaggeredScrollAnimation(3, 200);
  
  // ギャラリーカード用段階的アニメーション
  const { elementRef: galleryGridRef, visibleItems: visibleGalleryItems } = useStaggeredScrollAnimation(4, 150);


  if (files.length === 0 && !isLoading && !error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-base-100 via-base-200 to-base-300 relative overflow-hidden">
        {/* アニメーション矢印背景 */}
        <AnimatedArrows 
          containerWidth={typeof window !== 'undefined' ? window.innerWidth : 1920}
          containerHeight={typeof window !== 'undefined' ? window.innerHeight : 1080}
          arrowCount={8}
        />
        
        {/* Hero Section */}
        <section 
          ref={heroAnimation.elementRef}
          className={`hero min-h-screen transition-all duration-1000 relative z-10 ${
            heroAnimation.isVisible 
              ? 'opacity-100 translate-y-0' 
              : 'opacity-0 translate-y-10'
          }`}
        >
          <div className="hero-content text-center">
            <div className="max-w-4xl">
              <div className="mb-8">
                <Image 
                  src="/logo.png" 
                  alt="FlowCodeLinks Logo" 
                  width={128}
                  height={128}
                  className="mx-auto mb-6 hover:scale-110 transition-transform duration-300"
                  priority
                />
              </div>
              <h1 className="text-6xl font-bold text-primary mb-6 raleway">
                FlowCodeLinks
              </h1>
              <p className="text-xl text-base-content/80 mb-8 leading-relaxed">
                Repomixで生成されたmdファイルをアップロードして、<br />
                コードの関係性を分かりやすく可視化します
              </p>
              <div className="mb-12">
                <label className="btn btn-primary btn-lg gap-3 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  ファイルを選択して開始
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
        </section>

        {/* Features Section */}
        <section 
          ref={featuresAnimation.elementRef}
          className={`py-20 bg-base-100 transition-all duration-1000 relative z-10 ${
            featuresAnimation.isVisible 
              ? 'opacity-100 translate-y-0' 
              : 'opacity-0 translate-y-10'
          }`}
        >
          <div className="container mx-auto px-4">
            <h2 className={`text-4xl font-bold text-center mb-16 raleway transition-all duration-1000 delay-300 ${
              featuresAnimation.isVisible 
                ? 'opacity-100 translate-y-0' 
                : 'opacity-0 translate-y-5'
            }`}>
              主要機能
            </h2>
            <div 
              ref={featuresGridRef as React.RefObject<HTMLDivElement>}
              className="grid grid-cols-1 md:grid-cols-3 gap-8"
            >
              <div className={`card bg-base-200 shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-500 hover:-translate-y-2 ${
                visibleFeatures.has(0) 
                  ? 'opacity-100 translate-y-0 scale-100' 
                  : 'opacity-0 translate-y-8 scale-95'
              }`}>
                <div className="card-body text-center">
                  <div className="text-primary mb-4 transition-all duration-300">
                    <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="card-title justify-center mb-2">コード解析</h3>
                  <p className="text-base-content/70">
                    Rubyのメソッドや関数を自動で解析し、構造を把握します
                  </p>
                </div>
              </div>

              <div className={`card bg-base-200 shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-500 hover:-translate-y-2 ${
                visibleFeatures.has(1) 
                  ? 'opacity-100 translate-y-0 scale-100' 
                  : 'opacity-0 translate-y-8 scale-95'
              }`}>
                <div className="card-body text-center">
                  <div className="text-primary mb-4 hover:animate-pulse transition-all duration-300">
                    <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <h3 className="card-title justify-center mb-2">関係性可視化</h3>
                  <p className="text-base-content/70">
                    メソッド間の呼び出し関係を矢印で表示し、コードの流れを直感的に理解できます
                  </p>
                </div>
              </div>

              <div className={`card bg-base-200 shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-500 hover:-translate-y-2 ${
                visibleFeatures.has(2) 
                  ? 'opacity-100 translate-y-0 scale-100' 
                  : 'opacity-0 translate-y-8 scale-95'
              }`}>
                <div className="card-body text-center">
                  <div className="text-primary mb-4 transition-all duration-300">
                    <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                    </svg>
                  </div>
                  <h3 className="card-title justify-center mb-2">インタラクティブUI</h3>
                  <p className="text-base-content/70">
                    ドラッグ&ドロップ、検索、フィルタリング機能で効率的にコードを探索できます
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Gallery Section */}
        <section 
          ref={galleryAnimation.elementRef}
          className={`py-20 bg-base-200 transition-all duration-1000 relative z-10 ${
            galleryAnimation.isVisible 
              ? 'opacity-100 translate-y-0' 
              : 'opacity-0 translate-y-10'
          }`}
        >
          <div className="container mx-auto px-4">
            <h2 className={`text-4xl font-bold text-center mb-16 raleway transition-all duration-1000 delay-300 ${
              galleryAnimation.isVisible 
                ? 'opacity-100 translate-y-0' 
                : 'opacity-0 translate-y-5'
            }`}>
              使用イメージ
            </h2>
            <div 
              ref={galleryGridRef as React.RefObject<HTMLDivElement>}
              className="grid grid-cols-1 lg:grid-cols-2 gap-8"
            >
              <div className={`card bg-base-100 shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-700 group ${
                visibleGalleryItems.has(0) 
                  ? 'opacity-100 translate-y-0 scale-100' 
                  : 'opacity-0 translate-y-8 scale-95'
              }`}>
                <figure className="px-4 pt-4 overflow-hidden cursor-pointer" onClick={() => handleImageClick(0)}>
                  <img 
                    src="/how_to_1.png" 
                    alt="メインインターフェース"
                    className="rounded-xl w-full h-64 object-cover group-hover:scale-110 transition-transform duration-500"
                    onError={(e) => {
                      e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI2Y3ZjdmNyIvPgogIDx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXNpemU9IjE4IiBmaWxsPSIjOTk5Ij5tYWluIGludGVyZmFjZTwvdGV4dD4KICA8L3N2Zz4K';
                    }}
                  />
                </figure>
                <div className="card-body group-hover:bg-base-200 transition-colors duration-300">
                  <h3 className="card-title group-hover:text-primary transition-colors duration-300">メインインターフェース</h3>
                  <p className="text-base-content/70">
                    コードファイルをフローティングウィンドウで表示し、サイドバーでファイル構造を確認できます
                  </p>
                </div>
              </div>

              <div className={`card bg-base-100 shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-700 group ${
                visibleGalleryItems.has(1) 
                  ? 'opacity-100 translate-y-0 scale-100' 
                  : 'opacity-0 translate-y-8 scale-95'
              }`}>
                <figure className="px-4 pt-4 overflow-hidden cursor-pointer" onClick={() => handleImageClick(1)}>
                  <img 
                    src="/how_to_2.png" 
                    alt="メソッドハイライト"
                    className="rounded-xl w-full h-64 object-cover group-hover:scale-110 transition-transform duration-500"
                    onError={(e) => {
                      e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI2Y3ZjdmNyIvPgogIDx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXNpemU9IjE4IiBmaWxsPSIjOTk5Ij5tZXRob2QgaGlnaGxpZ2h0PC90ZXh0Pgo8L3N2Zz4K';
                    }}
                  />
                </figure>
                <div className="card-body group-hover:bg-base-200 transition-colors duration-300">
                  <h3 className="card-title group-hover:text-primary transition-colors duration-300">メソッドハイライト</h3>
                  <p className="text-base-content/70">
                    クリックしたメソッドがハイライトされ、呼び出し関係を視覚的に確認できます
                  </p>
                </div>
              </div>

              <div className={`card bg-base-100 shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-700 group ${
                visibleGalleryItems.has(2) 
                  ? 'opacity-100 translate-y-0 scale-100' 
                  : 'opacity-0 translate-y-8 scale-95'
              }`}>
                <figure className="px-4 pt-4 overflow-hidden cursor-pointer" onClick={() => handleImageClick(2)}>
                  <img 
                    src="/how_to_3.png" 
                    alt="関係性の可視化"
                    className="rounded-xl w-full h-64 object-cover group-hover:scale-110 transition-transform duration-500"
                    onError={(e) => {
                      e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI2Y3ZjdmNyIvPgogIDx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXNpemU9IjE4IiBmaWxsPSIjOTk5Ij5jb25uZWN0aW9ucyB2aWV3PC90ZXh0Pgo8L3N2Zz4K';
                    }}
                  />
                </figure>
                <div className="card-body group-hover:bg-base-200 transition-colors duration-300">
                  <h3 className="card-title group-hover:text-primary transition-colors duration-300">関係性の可視化</h3>
                  <p className="text-base-content/70">
                    メソッド間の呼び出し関係を矢印で表示し、コードの流れを把握できます
                  </p>
                </div>
              </div>


            </div>
            <div className="mt-8 text-center">
              <p className="text-xs text-base-content/50">
                画像は{' '}
                <a 
                  href="https://github.com/rubygems/rubygems.org?tab=MIT-1-ov-file" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:text-primary-focus underline"
                >
                  rubygems.org
                </a>
                {' '}のコードを使用して作成
              </p>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section 
          ref={ctaAnimation.elementRef}
          className={`py-20 bg-primary text-primary-content transition-all duration-1000 relative z-10 ${
            ctaAnimation.isVisible 
              ? 'opacity-100 translate-y-0' 
              : 'opacity-0 translate-y-10'
          }`}
        >
          <div className="container mx-auto px-4 text-center">
            <h2 className={`text-4xl font-bold mb-6 raleway transition-all duration-1000 delay-300 ${
              ctaAnimation.isVisible 
                ? 'opacity-100 translate-y-0' 
                : 'opacity-0 translate-y-5'
            }`}>
              今すぐ始めましょう
            </h2>
            <p className={`text-xl mb-8 opacity-90 transition-all duration-1000 delay-500 ${
              ctaAnimation.isVisible 
                ? 'opacity-90 translate-y-0' 
                : 'opacity-0 translate-y-5'
            }`}>
              コードの可視化で、開発効率を向上させましょう
            </p>
            <div className={`flex flex-col sm:flex-row gap-4 justify-center transition-all duration-1000 delay-700 ${
              ctaAnimation.isVisible 
                ? 'opacity-100 translate-y-0' 
                : 'opacity-0 translate-y-5'
            }`}>
              <label className="btn btn-secondary btn-lg gap-3 shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-300 animate-pulse hover:animate-none">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                ファイルをアップロード
                <input
                  type="file"
                  accept=".md"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
              <a href="#features" className="btn btn-outline btn-secondary btn-lg gap-3 hover:scale-105 transition-all duration-300">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                詳細を見る
              </a>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="footer footer-center p-10 bg-base-300 text-base-content relative z-10">
          <aside>
            <img 
              src="/logo.png" 
              alt="FlowCodeLinks Logo" 
              className="w-12 h-12 mb-4"
            />
            <p className="font-bold">
              FlowCodeLinks
            </p>
            <p className="text-base-content/70">
              コードの関係性を可視化するツール
            </p>
            <p className="text-sm text-base-content/60 mt-4">
              © 2025 FlowCodeLinks. All rights reserved.
            </p>
          </aside>
        </footer>

        {/* ホーム画面用daisyUIカルーセルモーダル */}
        <dialog className={`modal ${imageModalOpen ? 'modal-open' : ''}`}>
          <div className="modal-box max-w-5xl">
            {/* モーダルヘッダー */}
            <div className="flex justify-between items-center pb-4">
              <h3 className="font-bold text-lg">
                {currentImageIndex === 0 && "メインインターフェース"}
                {currentImageIndex === 1 && "メソッドハイライト"}
                {currentImageIndex === 2 && "関係性の可視化"}
              </h3>
              <button 
                className="btn btn-sm btn-circle btn-ghost"
                onClick={() => setImageModalOpen(false)}
              >
                ✕
              </button>
            </div>

            {/* daisyUIカルーセル */}
            <div className="carousel w-full">
              <div id="slide1" className={`carousel-item relative w-full ${currentImageIndex === 0 ? 'flex' : 'hidden'}`}>
                <img 
                  src="/how_to_1.png" 
                  className="w-full object-contain max-h-[60vh]" 
                  alt="メインインターフェース" 
                />
                <div className="absolute flex justify-between transform -translate-y-1/2 left-5 right-5 top-1/2">
                  <button 
                    className="btn btn-circle"
                    onClick={handlePrevImage}
                  >
                    ❮
                  </button> 
                  <button 
                    className="btn btn-circle"
                    onClick={handleNextImage}
                  >
                    ❯
                  </button>
                </div>
              </div> 

              <div id="slide2" className={`carousel-item relative w-full ${currentImageIndex === 1 ? 'flex' : 'hidden'}`}>
                <img 
                  src="/how_to_2.png" 
                  className="w-full object-contain max-h-[60vh]" 
                  alt="メソッドハイライト" 
                />
                <div className="absolute flex justify-between transform -translate-y-1/2 left-5 right-5 top-1/2">
                  <button 
                    className="btn btn-circle"
                    onClick={handlePrevImage}
                  >
                    ❮
                  </button> 
                  <button 
                    className="btn btn-circle"
                    onClick={handleNextImage}
                  >
                    ❯
                  </button>
                </div>
              </div> 

              <div id="slide3" className={`carousel-item relative w-full ${currentImageIndex === 2 ? 'flex' : 'hidden'}`}>
                <img 
                  src="/how_to_3.png" 
                  className="w-full object-contain max-h-[60vh]" 
                  alt="関係性の可視化" 
                />
                <div className="absolute flex justify-between transform -translate-y-1/2 left-5 right-5 top-1/2">
                  <button 
                    className="btn btn-circle"
                    onClick={handlePrevImage}
                  >
                    ❮
                  </button> 
                  <button 
                    className="btn btn-circle"
                    onClick={handleNextImage}
                  >
                    ❯
                  </button>
                </div>
              </div>
            </div>

            {/* ドットインジケーター */}
            <div className="flex justify-center w-full py-2 gap-2">
              {[0, 1, 2].map((index) => (
                <button
                  key={index}
                  onClick={() => setCurrentImageIndex(index)}
                  className={`btn btn-xs ${index === currentImageIndex ? 'btn-primary' : 'btn-outline'}`}
                >
                  {index + 1}
                </button>
              ))}
            </div>

            {/* モーダルフッター */}
            <div className="modal-action">
              <button 
                className="btn"
                onClick={() => setImageModalOpen(false)}
              >
                閉じる
              </button>
            </div>
          </div>
          <div 
            className="modal-backdrop"
            onClick={() => setImageModalOpen(false)}
          >
          </div>
        </dialog>
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
        {/* ファイル変更ボタンとホーム戻るボタン */}
        <div className="absolute top-4 left-4 z-50 flex gap-2">
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
          
          <button 
            className="btn btn-primary btn-sm gap-2 shadow-lg"
            onClick={() => {
              setRepomixContent('');
              setVisibleFiles([]);
              setFloatingWindows([]);
              setHighlightedMethod(null);
              setError(null);
            }}
            title="ホーム画面に戻る"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            ホーム
          </button>
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

      {/* daisyUI画像カルーセルモーダル（解析画面用） */}
      <dialog className={`modal ${imageModalOpen ? 'modal-open' : ''}`}>
        <div className="modal-box max-w-5xl">
          {/* モーダルヘッダー */}
          <div className="flex justify-between items-center pb-4">
            <h3 className="font-bold text-lg">
              {currentImageIndex === 0 && "メインインターフェース"}
              {currentImageIndex === 1 && "メソッドハイライト"}
              {currentImageIndex === 2 && "関係性の可視化"}
            </h3>
            <button 
              className="btn btn-sm btn-circle btn-ghost"
              onClick={() => setImageModalOpen(false)}
            >
              ✕
            </button>
          </div>

          {/* daisyUIカルーセル */}
          <div className="carousel w-full">
            <div id="slide1" className={`carousel-item relative w-full ${currentImageIndex === 0 ? 'flex' : 'hidden'}`}>
              <img 
                src="/how_to_1.png" 
                className="w-full object-contain max-h-[60vh]" 
                alt="メインインターフェース" 
              />
              <div className="absolute flex justify-between transform -translate-y-1/2 left-5 right-5 top-1/2">
                <button 
                  className="btn btn-circle"
                  onClick={handlePrevImage}
                >
                  ❮
                </button> 
                <button 
                  className="btn btn-circle"
                  onClick={handleNextImage}
                >
                  ❯
                </button>
              </div>
            </div> 

            <div id="slide2" className={`carousel-item relative w-full ${currentImageIndex === 1 ? 'flex' : 'hidden'}`}>
              <img 
                src="/how_to_2.png" 
                className="w-full object-contain max-h-[60vh]" 
                alt="メソッドハイライト" 
              />
              <div className="absolute flex justify-between transform -translate-y-1/2 left-5 right-5 top-1/2">
                <button 
                  className="btn btn-circle"
                  onClick={handlePrevImage}
                >
                  ❮
                </button> 
                <button 
                  className="btn btn-circle"
                  onClick={handleNextImage}
                >
                  ❯
                </button>
              </div>
            </div> 

            <div id="slide3" className={`carousel-item relative w-full ${currentImageIndex === 2 ? 'flex' : 'hidden'}`}>
              <img 
                src="/how_to_3.png" 
                className="w-full object-contain max-h-[60vh]" 
                alt="関係性の可視化" 
              />
              <div className="absolute flex justify-between transform -translate-y-1/2 left-5 right-5 top-1/2">
                <button 
                  className="btn btn-circle"
                  onClick={handlePrevImage}
                >
                  ❮
                </button> 
                <button 
                  className="btn btn-circle"
                  onClick={handleNextImage}
                >
                  ❯
                </button>
              </div>
            </div>
          </div>

          {/* ドットインジケーター */}
          <div className="flex justify-center w-full py-2 gap-2">
            {[0, 1, 2].map((index) => (
              <button
                key={index}
                onClick={() => setCurrentImageIndex(index)}
                className={`btn btn-xs ${index === currentImageIndex ? 'btn-primary' : 'btn-outline'}`}
              >
                {index + 1}
              </button>
            ))}
          </div>

          {/* モーダルフッター */}
          <div className="modal-action">
            <button 
              className="btn"
              onClick={() => setImageModalOpen(false)}
            >
              閉じる
            </button>
          </div>
        </div>
        <div 
          className="modal-backdrop"
          onClick={() => setImageModalOpen(false)}
        >
        </div>
      </dialog>
    </div>
  );
};

export default CodeVisualizer;
