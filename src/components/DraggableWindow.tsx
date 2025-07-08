import React, { useState, useRef, useEffect } from 'react';
import { FloatingWindow as FloatingWindowType, ScrollInfo } from '@/types/codebase';
import { FloatingWindow } from './FloatingWindow';

interface DraggableWindowProps {
  window: FloatingWindowType;
  onPositionChange: (id: string, position: { x: number; y: number }) => void;
  onToggleCollapse: (id: string) => void;
  onToggleMethodsOnly: (id: string) => void;
  onClose: (id: string) => void;
  onScrollChange?: (id: string, scrollInfo: ScrollInfo) => void;
  zoom?: number; // ズーム倍率を追加
  highlightedMethod?: { methodName: string; filePath: string; lineNumber?: number } | null;
  onMethodClick?: (methodName: string, currentFilePath: string) => void;
  onImportMethodClick?: (methodName: string) => void;
}

export const DraggableWindow: React.FC<DraggableWindowProps> = ({
  window,
  onPositionChange,
  onToggleCollapse,
  onToggleMethodsOnly,
  onClose,
  onScrollChange,
  zoom = 1, // デフォルト値として1を設定
  highlightedMethod,
  onMethodClick,
  onImportMethodClick
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [startPosition, setStartPosition] = useState({ x: 0, y: 0 });
  const windowRef = useRef<HTMLDivElement>(null);

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
  }, [isDragging, dragStart, startPosition, window.id, window.position.width, window.position.height, onPositionChange, zoom]);

  if (!window.isVisible) {
    return null;
  }

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
      <FloatingWindow
        window={window}
        onPositionChange={onPositionChange}
        onToggleCollapse={onToggleCollapse}
        onToggleMethodsOnly={onToggleMethodsOnly}
        onClose={onClose}
        onScrollChange={onScrollChange}
        highlightedMethod={highlightedMethod}
        onMethodClick={onMethodClick ? (methodName: string, currentFilePath: string) => onMethodClick(methodName, currentFilePath) : undefined}
        onImportMethodClick={onImportMethodClick}
      />
    </div>
  );
};