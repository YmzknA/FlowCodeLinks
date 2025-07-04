import { useEffect, useCallback, RefObject } from 'react';

interface WheelScrollIsolationReturn {
  handleWheel: (event: React.WheelEvent<HTMLDivElement>) => void;
}

/**
 * コードブロック内でのホイールスクロールを分離するカスタムフック
 * メインエリアのズーム機能に影響を与えずに、コンテナ内でのスクロールを実現
 * 
 * @param containerRef - スクロール分離を適用するコンテナの参照
 * @returns ホイールイベントハンドラー
 */
export const useWheelScrollIsolation = (
  containerRef: RefObject<HTMLElement>
): WheelScrollIsolationReturn => {
  // DOM APIでの制御（確実なイベントキャッチ）
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const domWheelHandler = (event: WheelEvent) => {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      
      if (container.scrollHeight > container.clientHeight) {
        container.scrollTop += event.deltaY;
      }
    };

    container.addEventListener('wheel', domWheelHandler, { passive: false, capture: true });
    
    return () => {
      container.removeEventListener('wheel', domWheelHandler, { capture: true });
    };
  }, [containerRef]);

  // Reactイベントハンドラー（二重制御）
  const handleWheel = useCallback((event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    event.nativeEvent.stopImmediatePropagation();
    
    const target = event.currentTarget;
    if (target.scrollHeight > target.clientHeight) {
      target.scrollTop += event.deltaY;
    }
  }, []);

  return { handleWheel };
};