import { useMemo, useCallback, useRef, useEffect, useState } from 'react';
import { ParsedFile, Method, Dependency } from '@/types/codebase';

// メモ化されたファイル解析結果
export const useOptimizedAnalysis = (files: ParsedFile[]) => {
  const analysisCache = useMemo(() => {
    const fileMap = new Map<string, ParsedFile>();
    const methodMap = new Map<string, Method[]>();
    const allMethods: Method[] = [];
    
    files.forEach(file => {
      fileMap.set(file.path, file);
      methodMap.set(file.path, file.methods);
      allMethods.push(...file.methods);
    });
    
    return {
      fileMap,
      methodMap,
      allMethods,
      totalFiles: files.length,
      totalMethods: allMethods.length
    };
  }, [files]);
  
  return analysisCache;
};

// 最適化された検索機能
export const useOptimizedSearch = (
  items: ParsedFile[] | Method[], 
  searchTerm: string,
  isMethodSearch: boolean = false
) => {
  return useMemo(() => {
    if (!searchTerm.trim()) return items;
    
    const lowercaseSearch = searchTerm.toLowerCase();
    
    return items.filter(item => {
      if (isMethodSearch) {
        const method = item as Method;
        return method.name.toLowerCase().includes(lowercaseSearch);
      } else {
        const file = item as ParsedFile;
        return file.fileName.toLowerCase().includes(lowercaseSearch) ||
               file.path.toLowerCase().includes(lowercaseSearch);
      }
    });
  }, [items, searchTerm, isMethodSearch]);
};

// 依存関係の効率的な計算
export const useOptimizedDependencies = (
  dependencies: Dependency[],
  visibleFiles: string[]
) => {
  return useMemo(() => {
    const visibleFileSet = new Set(visibleFiles);
    
    return dependencies.filter(dep => 
      visibleFileSet.has(dep.from.filePath) && 
      visibleFileSet.has(dep.to.filePath)
    );
  }, [dependencies, visibleFiles]);
};

// 仮想化対応のウィンドウレンダリング
export const useVirtualizedWindows = (
  windows: any[],
  containerBounds: { width: number; height: number }
) => {
  return useMemo(() => {
    const viewportMargin = 100; // 表示域外のマージン
    
    return windows.filter(window => {
      const { x, y, width, height } = window.position;
      
      // 表示域との重複判定
      return (
        x + width >= -viewportMargin &&
        x <= containerBounds.width + viewportMargin &&
        y + height >= -viewportMargin &&
        y <= containerBounds.height + viewportMargin
      );
    });
  }, [windows, containerBounds]);
};

// スロットリングされたイベントハンドラー
export const useThrottledCallback = <T extends (...args: any[]) => void>(
  callback: T,
  delay: number
): T => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // クリーンアップ処理
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
  
  const throttleRef = useMemo(() => {
    let lastExecTime = 0;
    
    return ((...args: Parameters<T>) => {
      const now = Date.now();
      
      if (now - lastExecTime >= delay) {
        lastExecTime = now;
        callback(...args);
      } else {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => {
          lastExecTime = Date.now();
          callback(...args);
          timeoutRef.current = null;
        }, delay - (now - lastExecTime));
      }
    }) as T;
  }, [callback, delay]);
  
  return throttleRef;
};

// デバウンスされた検索
export const useDebouncedValue = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  
  useEffect(() => {
    const timeoutId = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timeoutId);
  }, [value, delay]);
  
  return debouncedValue;
};

/**
 * デバウンス処理関数
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    timeoutId = setTimeout(() => {
      func(...args);
    }, delay);
  };
};

/**
 * RequestAnimationFrameを使用した最適化されたスクロール処理
 */
export const optimizedScroll = (
  element: HTMLElement,
  targetPosition: number,
  duration: number = 300
): Promise<void> => {
  return new Promise((resolve) => {
    const start = element.scrollTop;
    const distance = targetPosition - start;
    const startTime = performance.now();
    
    const animateScroll = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // イーズアウト関数
      const easeOut = 1 - Math.pow(1 - progress, 3);
      
      element.scrollTop = start + distance * easeOut;
      
      if (progress < 1) {
        requestAnimationFrame(animateScroll);
      } else {
        resolve();
      }
    };
    
    requestAnimationFrame(animateScroll);
  });
};

// メモリ使用量の監視
export const useMemoryMonitor = () => {
  return useCallback(() => {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return {
        used: Math.round(memory.usedJSHeapSize / 1024 / 1024),
        total: Math.round(memory.totalJSHeapSize / 1024 / 1024),
        limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024)
      };
    }
    return null;
  }, []);
};

// エラーバウンダリー用のエラーロガー
export const logError = (error: Error, errorInfo?: any) => {
  console.error('Application Error:', error);
  if (errorInfo) {
    console.error('Error Info:', errorInfo);
  }
  
  // 本番環境では外部サービスに送信
  if (process.env.NODE_ENV === 'production') {
    // 例: Sentry, LogRocket等への送信
  }
};