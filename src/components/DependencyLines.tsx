import React, { useMemo, useState, useRef, useEffect } from 'react';
import { FloatingWindow, Dependency, ScrollInfo } from '@/types/codebase';

interface DependencyLinesProps {
  windows: FloatingWindow[];
  dependencies: Dependency[];
  highlightedMethod: { methodName: string; filePath: string; lineNumber?: number } | null;
  zoom: number;
  pan: { x: number; y: number };
  sidebarCollapsed: boolean;
  sidebarWidth?: number;
  onMethodJump?: (method: { methodName: string; filePath: string; lineNumber?: number }) => void;
}

interface LineData {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  controlX1: number;
  controlY1: number;
  controlX2: number;
  controlY2: number;
  dependency: Dependency;
  isHighlighted: boolean;
}

const findWindowByMethod = (windowList: FloatingWindow[], method: { methodName: string; filePath: string }) => {
  return windowList.find(window => window.file.path === method.filePath);
};

// メソッドが表示範囲内にあるかを判定する関数
const isMethodInVisibleRange = (
  window: FloatingWindow,
  methodName: string
): boolean => {
  // ウィンドウが表示されていない場合は false
  if (!window.isVisible) {
    return false;
  }
  
  // 折りたたまれている場合は false
  if (window.isCollapsed) {
    return false;
  }
  
  // スクロール情報がない場合は表示されていると仮定
  if (!window.scrollInfo) {
    return true;
  }
  
  // メソッドのみ表示の場合は、全て表示されていると仮定
  if (window.showMethodsOnly) {
    return true;
  }
  
  // メソッドを検索
  const method = window.file.methods?.find(m => m.name === methodName);
  if (!method || !method.startLine) {
    return false;
  }
  
  // ファイルの総行数を取得
  const allMethods = window.file.methods || [];
  const maxEndLine = allMethods.length > 0 
    ? Math.max(...allMethods.map(m => m.endLine))
    : 100;
  const estimatedTotalLines = Math.max(maxEndLine, window.file.totalLines || 100);
  
  // メソッドの行番号の割合を計算
  const methodLineRatio = method.startLine / estimatedTotalLines;
  
  // 表示範囲内にあるかを判定
  const { visibleStartRatio, visibleEndRatio } = window.scrollInfo;
  return methodLineRatio >= visibleStartRatio && methodLineRatio <= visibleEndRatio;
};

// 曲線の制御点を計算する関数（重複回避機能付き）
const calculateControlPoints = (
  x1: number, 
  y1: number, 
  x2: number, 
  y2: number, 
  methodName: string,
  existingLines: Array<{x1: number, y1: number, x2: number, y2: number}>,
  usedCurveParams: Map<string, Set<string>>
) => {
  // 線の一意キーを生成
  const lineKey = `${Math.round(x1)},${Math.round(y1)}-${Math.round(x2)},${Math.round(y2)}`;
  const reverseLineKey = `${Math.round(x2)},${Math.round(y2)}-${Math.round(x1)},${Math.round(y1)}`;
  
  if (!usedCurveParams.has(lineKey)) {
    usedCurveParams.set(lineKey, new Set());
  }
  if (!usedCurveParams.has(reverseLineKey)) {
    usedCurveParams.set(reverseLineKey, new Set());
  }

  // メソッド名からシード値を生成
  const seed = methodName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const random = (min: number, max: number, offset: number = 0) => {
    const pseudo = Math.sin(seed + offset) * 10000;
    return min + (pseudo - Math.floor(pseudo)) * (max - min);
  };

  const distance = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  
  // 線の垂直方向のベクトルを計算
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const perpAngle = angle + Math.PI / 2;
  
  // 曲線の方向を決定（上下どちらにも曲がる可能性）
  const direction = random(0, 1, 0) > 0.5 ? 1 : -1; // 上下の方向
  
  // 曲線の強さを段階的に試す（重複回避）
  let curvature = 0;
  let attempts = 0;
  const maxAttempts = 10;
  
  while (attempts < maxAttempts) {
    curvature = distance * (0.15 + random(0.05, 0.4, attempts + 1)) * direction;
    const curveSignature = `${Math.round(curvature * 100)}`;
    
    // 同じ線で使用済みでないかチェック
    const usedForThisLine = usedCurveParams.get(lineKey) || new Set();
    const usedForReverseLine = usedCurveParams.get(reverseLineKey) || new Set();
    
    if (!usedForThisLine.has(curveSignature) && !usedForReverseLine.has(curveSignature)) {
      usedForThisLine.add(curveSignature);
      usedCurveParams.set(lineKey, usedForThisLine);
      break;
    }
    
    attempts++;
  }
  
  // 最終的に重複した場合は、方向を反転して再試行
  if (attempts >= maxAttempts) {
    curvature = distance * (0.2 + random(0.1, 0.3, seed)) * -direction;
  }
  
  const offsetX = Math.cos(perpAngle) * curvature;
  const offsetY = Math.sin(perpAngle) * curvature;
  
  // 2つの制御点を計算（ベジェ曲線用）
  const controlX1 = x1 + (midX - x1) * 0.5 + offsetX * random(0.6, 1, 2);
  const controlY1 = y1 + (midY - y1) * 0.5 + offsetY * random(0.6, 1, 3);
  const controlX2 = x2 + (midX - x2) * 0.5 + offsetX * random(0.6, 1, 4);
  const controlY2 = y2 + (midY - y2) * 0.5 + offsetY * random(0.6, 1, 5);
  
  return { controlX1, controlY1, controlX2, controlY2 };
};

// メソッドの詳細位置を計算（ウィンドウ内の実際の行位置）
const calculateDetailedMethodPosition = (
  window: FloatingWindow, 
  methodName: string, 
  zoom: number, 
  pan: { x: number; y: number },
  isEndpoint: boolean = false,
  targetDirection?: 'left' | 'right' | 'up' | 'down'
) => {
  // ZoomableCanvasのキャンバスオフセット(2000px, 1000px)を考慮
  const canvasOffset = { x: 2000, y: 1000 };
  
  // ウィンドウの基本座標
  const windowX = window.position.x;
  const windowY = window.position.y;
  const windowWidth = window.position.width;
  const windowHeight = window.position.height;
  
  // ファイル内のメソッドを検索
  const method = window.file.methods?.find(m => m.name === methodName);
  
  let methodX: number, methodY: number;
  
  if (method && method.startLine) {
    // メソッドが見つかった場合、行番号に基づく位置計算
    
    // ウィンドウ内でのメソッドの概算位置
    // ウィンドウヘッダーを考慮（約40px）
    const headerHeight = 40;
    const contentHeight = windowHeight - headerHeight;
    const lineHeight = 18; // 1行の高さ
    
    // ファイルの総行数をより正確に計算
    const allMethods = window.file.methods || [];
    const maxEndLine = allMethods.length > 0 
      ? Math.max(...allMethods.map(m => m.endLine))
      : 100;
    const estimatedTotalLines = Math.max(maxEndLine, window.file.totalLines || 100);
    
    const methodLineRatio = Math.min(method.startLine / estimatedTotalLines, 1);
    
    // スクロール情報に基づく垂直位置の調整
    let adjustedMethodY: number;
    
    if (!window.showMethodsOnly && !window.isCollapsed) {
      // スクロール情報がある場合はそれを使用、ない場合は初期状態として全体表示を仮定
      const scrollInfo = window.scrollInfo || {
        scrollTop: 0,
        scrollHeight: contentHeight,
        clientHeight: contentHeight,
        visibleStartRatio: 0,
        visibleEndRatio: 1
      };
      
      const { visibleStartRatio, visibleEndRatio } = scrollInfo;
      
      // メソッドが表示範囲内にあるかを判定
      const isInVisibleRange = methodLineRatio >= visibleStartRatio && methodLineRatio <= visibleEndRatio;
      
      if (isInVisibleRange) {
        // 表示範囲内: 実際のスクロール位置に基づいて動的に計算
        const visibleRangeHeight = visibleEndRatio - visibleStartRatio;
        const relativePositionInRange = visibleRangeHeight > 0 
          ? (methodLineRatio - visibleStartRatio) / visibleRangeHeight
          : methodLineRatio;
        adjustedMethodY = windowY + headerHeight + (contentHeight * relativePositionInRange);
      } else {
        // 表示範囲外: ウィンドウの上部または下部に固定
        if (methodLineRatio < visibleStartRatio) {
          // メソッドが表示範囲より上にある場合: ウィンドウ上部に固定
          adjustedMethodY = windowY + headerHeight + 10; // 少し下にオフセット
        } else {
          // メソッドが表示範囲より下にある場合: ウィンドウ下部に固定
          adjustedMethodY = windowY + windowHeight - 10; // 少し上にオフセット
        }
      }
    } else {
      // メソッドのみ表示や折りたたみの場合は従来の計算
      adjustedMethodY = windowY + headerHeight + (contentHeight * methodLineRatio);
    }
    
    // 垂直位置の計算
    if (isEndpoint) {
      // 終点は少し下にオフセット（1行分程度）
      methodY = adjustedMethodY + lineHeight;
      // 終点は矢印の方向に応じて左右のエッジ
      if (targetDirection === 'right') {
        methodX = windowX + windowWidth - 5; // 右端（少し内側）
      } else if (targetDirection === 'left') {
        methodX = windowX + 5; // 左端（少し内側）
      } else {
        methodX = windowX + windowWidth / 2; // 中央（フォールバック）
      }
    } else {
      // 始点の垂直位置は調整済み位置を使用
      methodY = adjustedMethodY;
      
      // 始点は左右のエッジ
      if (targetDirection === 'right') {
        methodX = windowX + windowWidth - 5; // 右端（少し内側）
      } else if (targetDirection === 'left') {
        methodX = windowX + 5; // 左端（少し内側）
      } else {
        methodX = windowX + windowWidth / 2; // 中央（フォールバック）
      }
    }
  } else {
    // メソッドが見つからない場合はウィンドウ中央
    methodX = windowX + windowWidth / 2;
    methodY = windowY + windowHeight / 2;
  }
  
  // キャンバス座標系に変換
  const canvasX = methodX + canvasOffset.x;
  const canvasY = methodY + canvasOffset.y;
  
  // スクリーン座標に変換
  const screenX = canvasX * zoom + pan.x;
  const screenY = canvasY * zoom + pan.y;
  
  return {
    x: screenX,
    y: screenY
  };
};

// 後方互換性のための元の関数（ウィンドウ中央を返す）
const calculateMethodPosition = (
  window: FloatingWindow, 
  methodName: string, 
  zoom: number, 
  pan: { x: number; y: number }
) => {
  return calculateDetailedMethodPosition(window, methodName, zoom, pan, false);
};

export const DependencyLines: React.FC<DependencyLinesProps> = ({
  windows,
  dependencies,
  highlightedMethod,
  zoom,
  pan,
  sidebarCollapsed,
  sidebarWidth = 320,
  onMethodJump
}) => {
  const [hoveredLine, setHoveredLine] = useState<number | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);
  const usedCurveParams = useRef(new Map<string, Set<string>>());

  // コンポーネントアンマウント時のメモリクリーンアップ
  useEffect(() => {
    return () => {
      usedCurveParams.current.clear();
    };
  }, []);

  // 矢印クリック時のハンドラー
  const handleArrowClick = (dependency: Dependency) => {
    if (onMethodJump) {
      onMethodJump({
        methodName: dependency.to.methodName,
        filePath: dependency.to.filePath
      });
    }
  };

  const visibleWindows = useMemo(() => 
    windows.filter(window => window.isVisible), 
    [windows]
  );

  // メソッド名からハッシュ値を生成して色を決定
  const getMethodColor = (methodName: string) => {
    const colors = [
      '#ef4444', // red-500
      '#f97316', // orange-500
      '#eab308', // yellow-500
      '#22c55e', // green-500
      '#06b6d4', // cyan-500
      '#3b82f6', // blue-500
      '#8b5cf6', // violet-500
      '#ec4899', // pink-500
      '#f59e0b', // amber-500
      '#84cc16', // lime-500
      '#14b8a6', // teal-500
      '#6366f1'  // indigo-500
    ];
    
    let hash = 0;
    for (let i = 0; i < methodName.length; i++) {
      const char = methodName.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 32bit integerに変換
    }
    
    return colors[Math.abs(hash) % colors.length];
  };

  const getLineColor = (dependency: Dependency, isHighlighted: boolean) => {
    if (isHighlighted) {
      return '#dc2626'; // より濃い赤色
    }
    
    // メソッド名に基づく色分け（呼び出し元のメソッド名を使用）
    return getMethodColor(dependency.from.methodName);
  };

  const getLineWidth = (dependency: Dependency, isHighlighted: boolean) => {
    if (isHighlighted) {
      return 5; // ハイライト時はより太く
    }
    
    // 呼び出し回数に応じた線の太さ（全体的に太く）
    return Math.min(Math.max(dependency.count * 1.5, 2), 6);
  };

  const lineData = useMemo(() => {
    // 各レンダリング時に曲線パラメータをリセット
    usedCurveParams.current.clear();
    
    const lines: LineData[] = [];
    const existingLines: Array<{x1: number, y1: number, x2: number, y2: number}> = [];
    
    dependencies.forEach((dependency) => {
      const fromWindow = findWindowByMethod(visibleWindows, dependency.from);
      const toWindow = findWindowByMethod(visibleWindows, dependency.to);
      
      if (fromWindow && toWindow) {
        // 矢印は常に表示し、位置のみを動的に調整する
        // まず基本位置を取得して方向を判定
        const fromBasic = calculateMethodPosition(fromWindow, dependency.from.methodName, zoom, pan);
        const toBasic = calculateMethodPosition(toWindow, dependency.to.methodName, zoom, pan);
        
        // 矢印の方向を判定
        const deltaX = toBasic.x - fromBasic.x;
        const direction = deltaX > 0 ? 'right' : 'left';
        
        // 詳細な始点と終点を計算
        const startCoords = calculateDetailedMethodPosition(
          fromWindow, 
          dependency.from.methodName, 
          zoom, 
          pan, 
          false, // 始点
          direction
        );
        
        // 終点では方向を反転（右から来る矢印は左端に、左から来る矢印は右端に）
        const endDirection = direction === 'right' ? 'left' : 'right';
        
        const endCoords = calculateDetailedMethodPosition(
          toWindow, 
          dependency.to.methodName, 
          zoom, 
          pan, 
          true, // 終点
          endDirection
        );
        
        // 同じ座標の場合は自己参照として視覚的にオフセット
        let adjustedEndCoords = endCoords;
        if (Math.abs(startCoords.x - endCoords.x) < 50 && Math.abs(startCoords.y - endCoords.y) < 50) {
          adjustedEndCoords = {
            x: endCoords.x + 30 * zoom,
            y: endCoords.y + 20 * zoom
          };
        }
        
        // 曲線の制御点を計算（重複回避機能付き）
        const controlPoints = calculateControlPoints(
          startCoords.x, 
          startCoords.y, 
          adjustedEndCoords.x, 
          adjustedEndCoords.y, 
          dependency.from.methodName,
          existingLines,
          usedCurveParams.current
        );
        
        const isHighlighted = highlightedMethod && (
          (highlightedMethod.methodName === dependency.from.methodName && 
           highlightedMethod.filePath === dependency.from.filePath) ||
          (highlightedMethod.methodName === dependency.to.methodName && 
           highlightedMethod.filePath === dependency.to.filePath)
        );
        
        const lineData = {
          x1: startCoords.x,
          y1: startCoords.y,
          x2: adjustedEndCoords.x,
          y2: adjustedEndCoords.y,
          controlX1: controlPoints.controlX1,
          controlY1: controlPoints.controlY1,
          controlX2: controlPoints.controlX2,
          controlY2: controlPoints.controlY2,
          dependency,
          isHighlighted: !!isHighlighted
        };
        
        lines.push(lineData);
        existingLines.push({
          x1: startCoords.x,
          y1: startCoords.y,
          x2: adjustedEndCoords.x,
          y2: adjustedEndCoords.y
        });
      }
    })
    
    return lines;
  }, [visibleWindows, dependencies, highlightedMethod, zoom, pan, sidebarCollapsed, sidebarWidth]);

  return (
    <>
    <svg
      style={{ 
        zIndex: 10,
        position: 'fixed',
        top: 0,
        left: sidebarCollapsed ? '48px' : `${sidebarWidth}px`, // 動的サイドバー幅を考慮
        pointerEvents: 'none', // SVG全体はイベントを受け取らない
        width: `calc(100vw - ${sidebarCollapsed ? '48px' : `${sidebarWidth}px`})`,
        height: '100vh'
      }}
    >
      {/* 矢印マーカーの定義 */}
      <defs>
        <marker
          id="arrowhead"
          markerWidth="8"
          markerHeight="6"
          refX="7"
          refY="3"
          orient="auto"
        >
          <polygon
            points="0 0, 8 3, 0 6"
            fill="currentColor"
          />
        </marker>
        
        <marker
          id="arrowhead-highlighted"
          markerWidth="10"
          markerHeight="7.5"
          refX="9"
          refY="3.75"
          orient="auto"
        >
          <polygon
            points="0 0, 10 3.75, 0 7.5"
            fill="#dc2626"
          />
        </marker>
      </defs>


      {/* 依存関係の線 */}
      {lineData.map((line, index) => {
        const isHovered = hoveredLine === index;
        const isHighlighted = line.isHighlighted || isHovered;
        
        return (
          <g key={index}>
            {/* 透明な太い曲線（ホバー判定用） */}
            <path
              d={`M ${line.x1} ${line.y1} C ${line.controlX1} ${line.controlY1}, ${line.controlX2} ${line.controlY2}, ${line.x2} ${line.y2}`}
              stroke="transparent"
              strokeWidth={Math.max(getLineWidth(line.dependency, isHighlighted) + 6, 12)}
              fill="none"
              style={{ cursor: 'pointer', pointerEvents: 'stroke' }}
              onMouseEnter={(e) => {
                setHoveredLine(index);
                setTooltipPosition({ x: e.clientX, y: e.clientY });
              }}
              onMouseLeave={() => {
                setHoveredLine(null);
                setTooltipPosition(null);
              }}
              onMouseMove={(e) => {
                if (hoveredLine === index) {
                  setTooltipPosition({ x: e.clientX, y: e.clientY });
                }
              }}
              onClick={() => handleArrowClick(line.dependency)}
            />
            
            {/* 実際の曲線 */}
            <path
              d={`M ${line.x1} ${line.y1} C ${line.controlX1} ${line.controlY1}, ${line.controlX2} ${line.controlY2}, ${line.x2} ${line.y2}`}
              stroke={getLineColor(line.dependency, isHighlighted)}
              strokeWidth={getLineWidth(line.dependency, isHighlighted)}
              fill="none"
              markerEnd={isHighlighted ? 'url(#arrowhead-highlighted)' : 'url(#arrowhead)'}
              strokeDasharray={line.dependency.type === 'internal' ? '8,4' : 'none'}
              opacity={isHovered ? 1 : 0.8}
              style={{ pointerEvents: 'none' }}
            />
          </g>
        );
      })}

      {/* 呼び出し回数のラベル */}
      {lineData.map((line, index) => {
        if (line.dependency.count <= 1) return null;
        
        // ベジェ曲線の中点を計算（t=0.5での位置）
        const t = 0.5;
        const midX = Math.pow(1-t, 3) * line.x1 + 
                    3 * Math.pow(1-t, 2) * t * line.controlX1 + 
                    3 * (1-t) * Math.pow(t, 2) * line.controlX2 + 
                    Math.pow(t, 3) * line.x2;
        const midY = Math.pow(1-t, 3) * line.y1 + 
                    3 * Math.pow(1-t, 2) * t * line.controlY1 + 
                    3 * (1-t) * Math.pow(t, 2) * line.controlY2 + 
                    Math.pow(t, 3) * line.y2;
        
        return (
          <g key={`label-${index}`}>
            <circle
              cx={midX}
              cy={midY}
              r="8"
              fill="white"
              stroke={getLineColor(line.dependency, line.isHighlighted)}
              strokeWidth="1"
            />
            <text
              x={midX}
              y={midY}
              textAnchor="middle"
              dy="0.3em"
              fontSize="8"
              fill={getLineColor(line.dependency, line.isHighlighted)}
              fontWeight="bold"
            >
              {line.dependency.count}
            </text>
          </g>
        );
      })}
    </svg>
    
    {/* ツールチップ */}
    {hoveredLine !== null && tooltipPosition && (
      <div
        style={{
          position: 'fixed',
          left: tooltipPosition.x + 10,
          top: tooltipPosition.y - 10,
          zIndex: 1000,
          backgroundColor: 'rgba(0, 0, 0, 0.9)',
          color: 'white',
          padding: '8px 12px',
          borderRadius: '6px',
          fontSize: '12px',
          maxWidth: '400px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
          pointerEvents: 'none'
        }}
      >
        <div style={{ fontWeight: 'bold', marginBottom: '6px', color: '#fbbf24' }}>
          メソッド呼び出し追跡
        </div>
        
        <div style={{ marginBottom: '4px', padding: '4px', backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: '4px' }}>
          <div style={{ fontSize: '11px', color: '#a0a0a0', marginBottom: '2px' }}>🟢 呼び出し元メソッド</div>
          <div style={{ color: '#60a5fa', fontWeight: 'bold' }}>
            {lineData[hoveredLine].dependency.from.methodName}
            {lineData[hoveredLine].dependency.fromLine && (
              <span style={{ color: '#f87171', marginLeft: '8px' }}>
                (行: {lineData[hoveredLine].dependency.fromLine})
              </span>
            )}
          </div>
          <div style={{ fontSize: '10px', color: '#34d399', marginTop: '1px' }}>
            📁 {lineData[hoveredLine].dependency.from.filePath}
          </div>
        </div>

        <div style={{ textAlign: 'center', margin: '4px 0', color: '#fbbf24', fontSize: '14px' }}>
          ⬇️ 呼び出す
        </div>

        <div style={{ marginBottom: '4px', padding: '4px', backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: '4px' }}>
          <div style={{ fontSize: '11px', color: '#a0a0a0', marginBottom: '2px' }}>🎯 呼び出し先メソッド</div>
          <div style={{ color: '#34d399', fontWeight: 'bold' }}>
            {lineData[hoveredLine].dependency.to.methodName}
            {lineData[hoveredLine].dependency.toLine && (
              <span style={{ color: '#f87171', marginLeft: '8px' }}>
                (行: {lineData[hoveredLine].dependency.toLine})
              </span>
            )}
          </div>
          <div style={{ fontSize: '10px', color: '#34d399', marginTop: '1px' }}>
            📁 {lineData[hoveredLine].dependency.to.filePath}
          </div>
        </div>

        <div style={{ marginTop: '6px', paddingTop: '4px', borderTop: '1px solid rgba(255, 255, 255, 0.2)' }}>
          <span style={{ color: '#a78bfa' }}>呼び出し回数:</span> 
          <span style={{ color: '#fbbf24', fontWeight: 'bold', marginLeft: '4px' }}>
            {lineData[hoveredLine].dependency.count}回
          </span>
          <span style={{ color: '#34d399', marginLeft: '8px' }}>
            ({lineData[hoveredLine].dependency.type === 'internal' ? '内部' : '外部'}呼び出し)
          </span>
        </div>
      </div>
    )}
  </>
  );
};