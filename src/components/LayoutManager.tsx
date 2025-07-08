import React, { useState, useEffect } from 'react';
import { DraggableWindow } from './DraggableWindow';
import { ParsedFile, Dependency, FloatingWindow, WindowPosition, ScrollInfo } from '@/types/codebase';

// コードサイズに基づいてウィンドウサイズを計算する関数
const calculateDynamicWindowSize = (file: ParsedFile): { width: number; height: number } => {
  // file.code または file.content を使用（後方互換性のため）
  const codeContent = file.code || file.content;
  if (!codeContent) {
    return { width: 400, height: 500 }; // デフォルトサイズ
  }
  
  const codeLines = codeContent.split('\n');
  const totalLines = codeLines.length;
  
  // 各行の長さをチェックして最大幅を計算（タブを4スペースに変換）
  const processedLines = codeLines.map(line => line.replace(/\t/g, '    '));
  const maxLineLength = Math.max(...processedLines.map(line => line.length), 50); // 最低50文字
  
  // 設定
  const minWidth = 350;
  const maxWidth = 900;
  const minHeight = 250;
  const maxHeight = 700; // 最大高さを700pxに制限（現実的なサイズ）
  const charWidth = 8; // 1文字あたりの概算幅（monospace）
  const lineHeight = 18; // 1行あたりの高さ
  const headerHeight = 45; // ウィンドウヘッダーの高さ
  const paddingX = 50; // 水平パディング
  const paddingY = 60; // 垂直パディング
  
  // 幅の計算（最大行長 + パディング + スクロールバー）
  const calculatedWidth = Math.max(
    minWidth,
    Math.min(maxWidth, maxLineLength * charWidth + paddingX + 20)
  );
  
  // 高さの計算（行数 + ヘッダー + パディング）
  // 長いファイルの場合は圧縮率を適用
  const compressionFactor = totalLines > 200 ? 0.7 : 1;
  const calculatedHeight = Math.max(
    minHeight,
    Math.min(maxHeight, totalLines * lineHeight * compressionFactor + headerHeight + paddingY + 30) // 5行分追加
  );
  
  return {
    width: Math.round(calculatedWidth),
    height: Math.round(calculatedHeight)
  };
};

interface LayoutManagerProps {
  files: ParsedFile[];
  dependencies: Dependency[];
  onFileToggle: (filePath: string) => void;
  onWindowsUpdate?: (windows: FloatingWindow[]) => void;
  zoom?: number;
  highlightedMethod?: { methodName: string; filePath: string; lineNumber?: number } | null;
  onMethodClick?: (methodName: string, currentFilePath: string, metadata?: { line?: number; isDefinition?: boolean }) => void;
  onImportMethodClick?: (methodName: string) => void;
}

export const LayoutManager: React.FC<LayoutManagerProps> = ({
  files,
  dependencies,
  onFileToggle,
  onWindowsUpdate,
  zoom = 1,
  highlightedMethod,
  onMethodClick,
  onImportMethodClick
}) => {
  const [windows, setWindows] = useState<FloatingWindow[]>([]);

  useEffect(() => {
    // ファイルリストの変更を検知して、新しいファイルのみ追加
    setWindows(prevWindows => {
      const existingFilePaths = prevWindows.map(w => w.file.path);
      const newFiles = files.filter(file => !existingFilePaths.includes(file.path));
      const removedFilePaths = existingFilePaths.filter(path => !files.find(f => f.path === path));
      
      // 削除されたファイルのウィンドウを除去
      let updatedWindows = prevWindows.filter(w => !removedFilePaths.includes(w.file.path));
      
      // 新しいファイルがある場合のみ、新しいウィンドウを作成して追加
      if (newFiles.length > 0) {
        const newWindows = initializeNewWindows(newFiles, updatedWindows);
        updatedWindows = [...updatedWindows, ...newWindows];
      }
      
      return updatedWindows;
    });
  }, [files]);

  useEffect(() => {
    // ウィンドウ情報が変更された際に親コンポーネントに通知
    if (onWindowsUpdate) {
      onWindowsUpdate(windows);
    }
  }, [windows, onWindowsUpdate]);

  const initializeWindows = (fileList: ParsedFile[]): FloatingWindow[] => {
    if (fileList.length === 0) {
      return [];
    }

    const uniqueFiles = removeDuplicateFiles(fileList);
    const fileGroups = groupFilesByStructure(uniqueFiles);
    const layoutConfig = calculateGridLayout(fileGroups);
    
    const windows: FloatingWindow[] = [];
    let globalIndex = 0;
    
    fileGroups.forEach((group, groupIndex) => {
      const groupLayout = layoutConfig.groupLayouts[groupIndex];
      
      group.forEach((file, fileIndex) => {
        const position = calculateGroupPosition(
          fileIndex,
          groupIndex,
          groupLayout,
          layoutConfig,
          file
        );
        
        windows.push({
          id: `window-${globalIndex}`,
          file,
          position,
          isVisible: true,
          isCollapsed: false,
          showMethodsOnly: false
        });
        
        globalIndex++;
      });
    });
    
    return windows;
  };

  // 新しいファイルのみのウィンドウを作成する関数
  const initializeNewWindows = (newFiles: ParsedFile[], existingWindows: FloatingWindow[]): FloatingWindow[] => {
    if (newFiles.length === 0) {
      return [];
    }

    // 既存ウィンドウの最大IDを取得
    const maxId = existingWindows.length > 0 
      ? Math.max(...existingWindows.map(w => parseInt(w.id.replace('window-', '')))) 
      : -1;
    
    // 新しいウィンドウを既存ウィンドウの右側に配置するための開始位置を計算
    let startX = 50; // デフォルト開始位置
    let startY = 50;
    
    if (existingWindows.length > 0) {
      // 既存ウィンドウの右端を基準に配置
      const rightmostWindow = existingWindows.reduce((rightmost, window) => 
        (window.position.x + window.position.width) > (rightmost.position.x + rightmost.position.width) 
          ? window : rightmost
      );
      startX = rightmostWindow.position.x + rightmostWindow.position.width + 50;
      startY = rightmostWindow.position.y;
    }

    const newWindows: FloatingWindow[] = [];
    
    newFiles.forEach((file, index) => {
      const dynamicSize = calculateDynamicWindowSize(file);
      const position = {
        x: startX + (index * 50), // 少しずつずらして配置
        y: startY + (index * 30),
        width: dynamicSize.width,
        height: dynamicSize.height
      };
      
      newWindows.push({
        id: `window-${maxId + 1 + index}`,
        file,
        position,
        isVisible: true,
        isCollapsed: false,
        showMethodsOnly: false
      });
    });
    
    return newWindows;
  };

  const removeDuplicateFiles = (fileList: ParsedFile[]): ParsedFile[] => {
    const seen = new Set<string>();
    return fileList.filter(file => {
      if (seen.has(file.path)) {
        return false;
      }
      seen.add(file.path);
      return true;
    });
  };

  const groupFilesByStructure = (fileList: ParsedFile[]): ParsedFile[][] => {
    // ディレクトリ構造に基づいてファイルをグルーピング
    const groups: { [key: string]: ParsedFile[] } = {};
    
    fileList.forEach(file => {
      // ディレクトリパスを取得（最後のフォルダ名を使用）
      const pathParts = file.path.split('/');
      let groupKey = 'root';
      
      if (pathParts.length > 1) {
        // パスの深度に基づいてグルーピング
        if (pathParts.includes('controllers')) {
          groupKey = 'controllers';
        } else if (pathParts.includes('models')) {
          groupKey = 'models';
        } else if (pathParts.includes('views')) {
          groupKey = 'views';
        } else if (pathParts.includes('helpers')) {
          groupKey = 'helpers';
        } else if (pathParts.includes('services')) {
          groupKey = 'services';
        } else if (pathParts.includes('lib') || pathParts.includes('libs')) {
          groupKey = 'libraries';
        } else if (pathParts.includes('config')) {
          groupKey = 'config';
        } else if (pathParts.includes('test') || pathParts.includes('spec')) {
          groupKey = 'tests';
        } else {
          // フォルダ名が分からない場合は、最初のディレクトリ名を使用
          groupKey = pathParts[pathParts.length - 2] || 'misc';
        }
      }
      
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(file);
    });

    // グループを配列形式で返す（グループ名順でソート）
    const sortedGroups = Object.keys(groups).sort().map(key => groups[key]);
    
    return sortedGroups;
  };

  const calculateGridLayout = (fileGroups: ParsedFile[][]) => {
    // 動的ウィンドウサイズを考慮したレイアウト計算
    
    const groupSpacing = 120; // グループ間のスペース（動的サイズ用に拡大）
    const windowsPerGroupCol = 4; // 1グループ内の列数（動的サイズなので少し減らす）
    
    let totalCols = 0;
    const groupLayouts = fileGroups.map(group => {
      // グループ内のファイルサイズを考慮してレイアウトを調整
      const avgSize = group.reduce((acc, file) => {
        const size = calculateDynamicWindowSize(file);
        return { width: acc.width + size.width, height: acc.height + size.height };
      }, { width: 0, height: 0 });
      
      avgSize.width /= group.length;
      avgSize.height /= group.length;
      
      // 大きなウィンドウが多い場合は列数を減らす
      const sizeBasedCols = avgSize.width > 600 ? 3 : windowsPerGroupCol;
      const groupCols = Math.min(sizeBasedCols, Math.ceil(Math.sqrt(group.length)));
      const groupRows = Math.ceil(group.length / groupCols);
      
      const layout = {
        startCol: totalCols,
        cols: groupCols,
        rows: groupRows,
        fileCount: group.length
      };
      
      totalCols += groupCols + 1; // グループ間のスペースを考慮
      return layout;
    });
    
    return { groupLayouts, totalCols };
  };

  const calculateGroupPosition = (
    fileIndex: number,
    groupIndex: number,
    groupLayout: { startCol: number; cols: number; rows: number; fileCount: number },
    layoutConfig: { groupLayouts: any[]; totalCols: number },
    file: ParsedFile
  ): WindowPosition => {
    // 動的ウィンドウサイズを計算
    const dynamicSize = calculateDynamicWindowSize(file);
    const windowWidth = dynamicSize.width;
    const windowHeight = dynamicSize.height;
    
    const gap = 20; // 少し間隔を広げる
    const groupSpacing = 120; // グループ間隔も少し広げる
    
    // グループ内での位置計算
    const col = fileIndex % groupLayout.cols;
    const row = Math.floor(fileIndex / groupLayout.cols);
    
    // 動的サイズのため、平均サイズでグループ開始位置を計算
    const avgWindowWidth = 450; // 平均的なウィンドウ幅（レイアウト計算用）
    const groupStartX = groupLayout.startCol * (avgWindowWidth + gap) + (groupIndex * groupSpacing) + gap;
    
    // 最終位置計算（実際のウィンドウサイズを使用）
    const x = groupStartX + (col * (avgWindowWidth + gap));
    const y = row * (windowHeight + gap) + gap;
    
    return {
      x,
      y,
      width: windowWidth,
      height: windowHeight
    };
  };

  const calculateNonOverlappingPosition = (
    index: number, 
    gridConfig: { cols: number; rows: number },
    usedPositions: Array<{x: number, y: number}>
  ): WindowPosition => {
    const windowWidth = 350;
    const windowHeight = 450;
    const gap = 15;
    
    const col = index % gridConfig.cols;
    const row = Math.floor(index / gridConfig.cols);
    
    // 基本グリッド位置
    let x = col * (windowWidth + gap) + gap;
    let y = row * (windowHeight + gap) + gap;
    
    // 重なりチェックと調整
    let attempts = 0;
    const maxAttempts = 10;
    
    while (attempts < maxAttempts && isPositionOverlapping(x, y, usedPositions, windowWidth, windowHeight)) {
      // 重なっている場合は位置をずらす
      x += 20;
      y += 20;
      attempts++;
    }
    
    return {
      x,
      y,
      width: windowWidth,
      height: windowHeight
    };
  };

  const isPositionOverlapping = (
    x: number, 
    y: number, 
    usedPositions: Array<{x: number, y: number}>,
    width: number,
    height: number
  ): boolean => {
    const threshold = 10; // 重なり判定の閾値
    
    return usedPositions.some(pos => 
      Math.abs(pos.x - x) < threshold && Math.abs(pos.y - y) < threshold
    );
  };

  const handlePositionChange = (id: string, newPosition: { x: number; y: number }) => {
    setWindows(prevWindows =>
      prevWindows.map(window =>
        window.id === id
          ? { ...window, position: { ...window.position, ...newPosition } }
          : window
      )
    );
  };

  const handleToggleCollapse = (id: string) => {
    setWindows(prevWindows =>
      prevWindows.map(window =>
        window.id === id
          ? { ...window, isCollapsed: !window.isCollapsed }
          : window
      )
    );
  };

  const handleToggleMethodsOnly = (id: string) => {
    setWindows(prevWindows =>
      prevWindows.map(window =>
        window.id === id
          ? { ...window, showMethodsOnly: !window.showMethodsOnly }
          : window
      )
    );
  };

  const handleClose = (id: string) => {
    const window = windows.find(w => w.id === id);
    if (window) {
      onFileToggle(window.file.path);
    }
    
    setWindows(prevWindows =>
      prevWindows.filter(window => window.id !== id)
    );
  };

  const handleScrollChange = (id: string, scrollInfo: ScrollInfo) => {
    setWindows(prevWindows =>
      prevWindows.map(window =>
        window.id === id
          ? { ...window, scrollInfo }
          : window
      )
    );
  };

  return (
    <div 
      className="absolute inset-0 w-full h-full"
      data-testid="layout-manager"
    >
      {windows.map(window => (
        <DraggableWindow
          key={window.id}
          window={window}
          onPositionChange={handlePositionChange}
          onToggleCollapse={handleToggleCollapse}
          onToggleMethodsOnly={handleToggleMethodsOnly}
          onClose={handleClose}
          onScrollChange={handleScrollChange}
          zoom={zoom}
          highlightedMethod={highlightedMethod}
          onMethodClick={onMethodClick}
          onImportMethodClick={onImportMethodClick}
        />
      ))}
    </div>
  );
};