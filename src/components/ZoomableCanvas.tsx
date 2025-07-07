import React, { useState, useRef, useEffect, useCallback } from 'react';

interface ZoomableCanvasProps {
  children: React.ReactNode;
  className?: string;
  onZoomChange?: (zoom: number) => void; // ズーム変更時のコールバック
  onPanChange?: (pan: { x: number; y: number }) => void; // パン変更時のコールバック
  externalPan?: { x: number; y: number } | null; // 外部からのパン制御
}

export const ZoomableCanvas: React.FC<ZoomableCanvasProps> = ({ 
  children, 
  className = "",
  onZoomChange,
  onPanChange,
  externalPan
}) => {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: -1800, y: -800 }); // 初期位置をコンテンツが見える位置に調整
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.1, Math.min(3, zoom * delta));
    
    // マウス位置を中心にズーム
    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      const zoomPoint = {
        x: (mouseX - pan.x) / zoom,
        y: (mouseY - pan.y) / zoom
      };
      
      const newPan = {
        x: mouseX - zoomPoint.x * newZoom,
        y: mouseY - zoomPoint.y * newZoom
      };
      
      setPan(newPan);
      onPanChange?.(newPan);
    }
    
    setZoom(newZoom);
    onZoomChange?.(newZoom);
  }, [zoom, pan, onZoomChange, onPanChange]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // 左ボタンまたは中ボタン（ホイールボタン）でのパン操作を有効
    if (e.button === 0 || e.button === 1) { // 左ボタンまたは中ボタン
      // フローティングウィンドウ内でなければパン操作を許可
      const target = e.target as HTMLElement;
      const isInsideFloatingWindow = target.closest('.draggable-window') !== null;
      const isInsideZoomControls = target.closest('.absolute.top-4.right-4') !== null;
      
      if (!isInsideFloatingWindow && !isInsideZoomControls) {
        e.preventDefault();
        setIsDragging(true);
        setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      }
    }
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging) {
      const newPan = {
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      };
      setPan(newPan);
      onPanChange?.(newPan);
    }
  }, [isDragging, dragStart, onPanChange]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const resetView = useCallback(() => {
    setZoom(1);
    onZoomChange?.(1);
    // 初期コンテンツが見える位置にリセット
    const resetPan = { x: -1800, y: -800 };
    setPan(resetPan);
    onPanChange?.(resetPan);
  }, [onZoomChange, onPanChange]);

  const fitToView = useCallback(() => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const canvasRect = canvas.getBoundingClientRect();
      
      // 子要素の境界を計算
      const windows = canvas.querySelectorAll('.draggable-window');
      if (windows.length === 0) return;
      
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      
      windows.forEach(window => {
        // ウィンドウの実際の座標を取得
        const style = (window as HTMLElement).style;
        const x = parseInt(style.left) || 0;
        const y = parseInt(style.top) || 0;
        const rect = window.getBoundingClientRect();
        
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x + rect.width / zoom);
        maxY = Math.max(maxY, y + rect.height / zoom);
      });
      
      const contentWidth = maxX - minX;
      const contentHeight = maxY - minY;
      const contentCenterX = (minX + maxX) / 2;
      const contentCenterY = (minY + maxY) / 2;
      
      // 適切なズームレベルを計算
      const zoomX = (canvasRect.width * 0.8) / contentWidth;
      const zoomY = (canvasRect.height * 0.8) / contentHeight;
      const newZoom = Math.min(zoomX, zoomY, 1);
      
      // キャンバスオフセットを考慮して中央に配置
      const canvasOffset = { x: 2000, y: 1000 }; // 無限キャンバス内のオフセット
      const newPan = {
        x: canvasRect.width / 2 - (contentCenterX + canvasOffset.x) * newZoom,
        y: canvasRect.height / 2 - (contentCenterY + canvasOffset.y) * newZoom
      };
      
      setZoom(newZoom);
      onZoomChange?.(newZoom);
      setPan(newPan);
      onPanChange?.(newPan);
    }
  }, [zoom, onZoomChange, onPanChange]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.addEventListener('wheel', handleWheel, { passive: false });
      return () => canvas.removeEventListener('wheel', handleWheel);
    }
  }, [handleWheel]);

  // 外部からのパン制御を反映
  useEffect(() => {
    if (externalPan) {
      setPan(externalPan);
      onPanChange?.(externalPan);
    }
  }, [externalPan, onPanChange]);

  // 初期化時に自動でfitToViewを実行（無効化）
  // useEffect(() => {
  //   const timer = setTimeout(() => {
  //     const windows = canvasRef.current?.querySelectorAll('.draggable-window');
  //     if (windows && windows.length > 0) {
  //       fitToView();
  //     }
  //   }, 500); // 少し遅延してからfitToViewを実行
    
  //   return () => clearTimeout(timer);
  // }, [fitToView]);

  return (
    <div className={`relative overflow-hidden ${className}`}>

      {/* ズーム倍率表示 */}
      <div className="absolute bottom-4 right-4 z-50 bg-base-200 text-base-content px-2 py-1 rounded text-sm border border-base-300">
        {Math.round(zoom * 100)}%
      </div>

      {/* メインキャンバス */}
      <div
        ref={canvasRef}
        className="w-full h-full overflow-hidden relative"
        style={{ 
          cursor: isDragging ? 'grabbing' : 'grab',
          backgroundImage: `radial-gradient(circle, #e5e7eb 1px, transparent 1px)`,
          backgroundSize: `${50 * zoom}px ${50 * zoom}px`,
          backgroundPosition: `${pan.x % (50 * zoom)}px ${pan.y % (50 * zoom)}px`
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onContextMenu={(e) => {
          // 中ボタンドラッグ時のコンテキストメニューを無効化
          if (isDragging) {
            e.preventDefault();
          }
        }}
      >
        <div
          className="relative"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
            transition: isDragging ? 'none' : 'transform 0.1s ease-out',
            width: '20000px', // 大きな仮想キャンバス
            height: '20000px'
          }}
        >
          {/* 無限キャンバス内のコンテンツ */}
          <div className="absolute" style={{ left: '2000px', top: '1000px' }}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};