import React, { useState, useRef, useEffect } from 'react';
import { FloatingWindow as FloatingWindowType } from '@/types/codebase';
import { CodeContent } from './CodeContent';

interface DraggableWindowProps {
  window: FloatingWindowType;
  onPositionChange: (id: string, position: { x: number; y: number }) => void;
  onToggleCollapse: (id: string) => void;
  onToggleMethodsOnly: (id: string) => void;
  onClose: (id: string) => void;
  zoom?: number; // ズーム倍率を追加
  highlightedMethod?: { methodName: string; filePath: string; lineNumber?: number } | null;
  onMethodClick?: (methodName: string, currentFilePath: string) => void;
}

export const DraggableWindow: React.FC<DraggableWindowProps> = ({
  window,
  onPositionChange,
  onToggleCollapse,
  onToggleMethodsOnly,
  onClose,
  zoom = 1, // デフォルト値として1を設定
  highlightedMethod,
  onMethodClick
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [startPosition, setStartPosition] = useState({ x: 0, y: 0 });
  const windowRef = useRef<HTMLDivElement>(null);

  if (!window.isVisible) {
    return null;
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target !== e.currentTarget && !isHeaderElement(e.target as Element)) {
      return;
    }

    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setStartPosition({ x: window.position.x, y: window.position.y });
    e.preventDefault();
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.target !== e.currentTarget && !isHeaderElement(e.target as Element)) {
      return;
    }

    const touch = e.touches[0];
    setIsDragging(true);
    setDragStart({ x: touch.clientX, y: touch.clientY });
    setStartPosition({ x: window.position.x, y: window.position.y });
    e.preventDefault();
  };

  const isHeaderElement = (element: Element): boolean => {
    return element.closest('.draggable-header') !== null;
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;

      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;
      
      // ズーム倍率を考慮した移動距離の調整
      const adjustedDeltaX = deltaX / zoom;
      const adjustedDeltaY = deltaY / zoom;
      
      // 無制限移動（Figma風）- 画面境界による制限なし
      const newX = startPosition.x + adjustedDeltaX;
      const newY = startPosition.y + adjustedDeltaY;

      onPositionChange(window.id, { x: newX, y: newY });
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging) return;

      const touch = e.touches[0];
      const deltaX = touch.clientX - dragStart.x;
      const deltaY = touch.clientY - dragStart.y;
      
      // ズーム倍率を考慮した移動距離の調整
      const adjustedDeltaX = deltaX / zoom;
      const adjustedDeltaY = deltaY / zoom;
      
      // 無制限移動（Figma風）- 画面境界による制限なし
      const newX = startPosition.x + adjustedDeltaX;
      const newY = startPosition.y + adjustedDeltaY;

      onPositionChange(window.id, { x: newX, y: newY });
    };

    const handleEnd = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleEnd);
      document.addEventListener('touchmove', handleTouchMove);
      document.addEventListener('touchend', handleEnd);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleEnd);
    };
  }, [isDragging, dragStart, startPosition, window.id, window.position.width, window.position.height, onPositionChange]);

  return (
    <div
      ref={windowRef}
      className={`absolute draggable-window ${isDragging ? 'dragging cursor-grabbing' : 'cursor-grab'}`}
      style={{
        left: window.position.x,
        top: window.position.y,
        width: window.position.width,
        height: window.isCollapsed ? 'auto' : window.position.height,
        zIndex: isDragging ? 1000 : 200
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      <div className="bg-white border border-gray-300 rounded-lg shadow-lg h-full">
        {/* ヘッダー（ドラッグハンドル） */}
        <div className="draggable-header flex items-center justify-between p-3 bg-gray-50 border-b cursor-grab active:cursor-grabbing">
          <div>
            <div className="font-semibold text-gray-800">{window.file.fileName}</div>
            <div className="text-xs text-gray-500">{window.file.path} ({window.file.totalLines} lines)</div>
          </div>
          <div className="flex space-x-1">
            <button
              onClick={() => onToggleMethodsOnly(window.id)}
              aria-label="メソッドのみ表示"
              className="p-1 text-gray-600 hover:text-blue-600 text-sm cursor-pointer"
            >
              M
            </button>
            <button
              onClick={() => onToggleCollapse(window.id)}
              aria-label="折りたたみ"
              className="p-1 text-gray-600 hover:text-blue-600 text-sm cursor-pointer"
            >
              {window.isCollapsed ? '□' : '_'}
            </button>
            <button
              onClick={() => onClose(window.id)}
              aria-label="閉じる"
              className="p-1 text-gray-600 hover:text-red-600 text-sm cursor-pointer"
            >
              ×
            </button>
          </div>
        </div>

        {/* コンテンツ */}
        {!window.isCollapsed && (
          <div className="h-full" style={{ height: `calc(100% - 64px)` }}> {/* ヘッダー高さを除外 */}
            {window.showMethodsOnly ? (
              <div className="p-4 h-full overflow-auto">
                {window.file.methods.map((method, index) => (
                  <div key={index} className="mb-2 p-2 bg-gray-100 rounded">
                    <div className="font-semibold text-blue-600">{method.name}</div>
                    <div className="text-sm text-gray-600">{method.type}</div>
                  </div>
                ))}
              </div>
            ) : (
              <CodeContent 
                file={window.file} 
                highlightedMethod={highlightedMethod} 
                onMethodClick={onMethodClick ? (methodName: string) => onMethodClick(methodName, window.file.path) : undefined} 
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};