import React, { useEffect, useState } from 'react';

interface ArrowPath {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  delay: number;
  duration: number;
  opacity: number;
}

interface AnimatedArrowsProps {
  containerWidth: number;
  containerHeight: number;
  arrowCount?: number;
}

export const AnimatedArrows: React.FC<AnimatedArrowsProps> = ({
  containerWidth,
  containerHeight,
  arrowCount = 6
}) => {
  const [arrows, setArrows] = useState<ArrowPath[]>([]);
  const [isClient, setIsClient] = useState(false);

  // クライアントサイド確認
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return; // クライアントサイドでのみ実行
    
    const generateSingleArrow = () => {
      const direction = Math.random() > 0.5 ? 'leftToRight' : 'rightToLeft';
      const y = Math.random() * containerHeight;
      const duration = 6000 + Math.random() * 4000; // 6-10秒の長さ
      const opacity = 0.1 + Math.random() * 0.3; // 0.1-0.4の透明度
      const id = `arrow-${Date.now()}-${Math.random()}`;

      const margin = Math.max(50, containerWidth * 0.05); // 画面幅の5%または最低50px
      const curveVariation = Math.min(100, containerHeight * 0.1); // 画面高さの10%または最大100px

      const newArrow: ArrowPath = direction === 'leftToRight' 
        ? {
            id,
            x1: -margin,
            y1: y,
            x2: containerWidth + margin,
            y2: y + (Math.random() - 0.5) * curveVariation,
            delay: 0,
            duration,
            opacity
          }
        : {
            id,
            x1: containerWidth + margin,
            y1: y,
            x2: -margin,
            y2: y + (Math.random() - 0.5) * curveVariation,
            delay: 0,
            duration,
            opacity
          };

      setArrows(prev => [...prev, newArrow]);

      // アニメーション終了後に矢印を削除
      setTimeout(() => {
        setArrows(prev => prev.filter(arrow => arrow.id !== id));
      }, duration + 1000);
    };

    // 初期矢印を生成
    for (let i = 0; i < arrowCount; i++) {
      setTimeout(generateSingleArrow, Math.random() * 3000);
    }
    
    // 継続的に新しい矢印を生成（ランダム間隔）
    const scheduleNext = () => {
      setTimeout(() => {
        generateSingleArrow();
        scheduleNext();
      }, 2000 + Math.random() * 3000);
    };
    
    scheduleNext();
    
    return () => {
      // クリーンアップ処理は特になし（setTimeoutは自動的にクリアされる）
    };
  }, [containerWidth, containerHeight, arrowCount, isClient]);

  // サーバーサイドでは何も表示しない
  if (!isClient) {
    return null;
  }

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <svg
        width={containerWidth}
        height={containerHeight}
        className="absolute inset-0"
        style={{ zIndex: 1 }}
      >
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon
              points="0 0, 10 3.5, 0 7"
              fill="currentColor"
              className="text-primary"
            />
          </marker>
        </defs>
        
        {arrows.map((arrow) => (
          <g key={arrow.id}>
            <path
              d={`M ${arrow.x1} ${arrow.y1} Q ${(arrow.x1 + arrow.x2) / 2} ${arrow.y1 + (arrow.y2 - arrow.y1) / 2} ${arrow.x2} ${arrow.y2}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              markerEnd="url(#arrowhead)"
              className="text-primary"
              style={{
                opacity: arrow.opacity,
                animation: `fadeInOut ${arrow.duration}ms ease-in-out ${arrow.delay}ms infinite`
              }}
            />
          </g>
        ))}
      </svg>
      
      <style jsx>{`
        @keyframes fadeInOut {
          0% {
            opacity: 0;
            stroke-dasharray: 0 2000;
            stroke-dashoffset: 2000;
          }
          10% {
            opacity: 0.2;
          }
          20% {
            stroke-dasharray: 2000 2000;
            stroke-dashoffset: 2000;
          }
          80% {
            opacity: 0.2;
            stroke-dasharray: 2000 2000;
            stroke-dashoffset: 0;
          }
          90% {
            opacity: 0.2;
          }
          100% {
            opacity: 0;
            stroke-dasharray: 2000 2000;
            stroke-dashoffset: 0;
          }
        }
      `}</style>
    </div>
  );
};