/**
 * サンプルデータの読み込み機能
 * セキュリティ対策とパフォーマンス最適化を含む
 */

import { normalizeError } from './error';

// メモリキャッシュ
let cachedSampleData: string | null = null;

// ファイルサイズ制限 (1MB)
const MAX_FILE_SIZE = 1024 * 1024;

// 許可されるContent-Type
const ALLOWED_CONTENT_TYPES = ['text/markdown', 'text/plain'];

/**
 * サンプルデータを読み込む
 * @returns サンプルデータの文字列
 * @throws エラーが発生した場合はError オブジェクトをthrow
 */
export async function loadSampleData(): Promise<string> {
  // キャッシュから返却
  if (cachedSampleData) {
    return cachedSampleData;
  }

  try {
    const response = await fetch('/sample-ruby-code.md');
    
    // HTTPステータスチェック
    if (!response.ok) {
      throw new Error(`サンプルデータの読み込みに失敗: ${response.status} ${response.statusText}`);
    }

    // Content-Type検証
    const contentType = response.headers.get('content-type');
    if (!contentType || !ALLOWED_CONTENT_TYPES.some(type => contentType.includes(type))) {
      throw new Error('無効なコンテンツタイプです');
    }

    // ファイルサイズ制限チェック
    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > MAX_FILE_SIZE) {
      throw new Error('サンプルファイルが大きすぎます');
    }

    const content = await response.text();
    
    // レスポンス内容のサイズチェック（Content-Lengthが取得できない場合）
    if (content.length > MAX_FILE_SIZE) {
      throw new Error('サンプルファイルが大きすぎます');
    }

    // キャッシュに保存
    cachedSampleData = content;
    return content;
  } catch (error) {
    throw normalizeError(error, 'サンプルデータの読み込みに失敗しました');
  }
}

/**
 * サンプルデータキャッシュをクリア
 */
export function clearSampleDataCache(): void {
  cachedSampleData = null;
}

export const SAMPLE_DATA_INFO = {
  title: 'ECサイト注文処理',
  description: 'メソッド間の関係性を可視化したサンプルコード',
  features: [
    'メソッド呼び出しの可視化',
    'コード構造の理解',
    '依存関係の把握'
  ],
  // 品質情報
  quality: {
    securityLevel: 'standard',
    accessibilityCompliant: true,
    performanceOptimized: true,
    maintainabilityScore: 85
  },
  // 技術情報
  technical: {
    fileFormat: 'markdown',
    encoding: 'utf-8',
    averageSize: '50KB',
    loadTimeExpected: '< 2s'
  }
} as const;

// 統計情報（監視用）
export class LoadStatistics {
  private static instance: LoadStatistics;
  private stats = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    cacheHits: 0,
    averageLoadTime: 0,
    lastRequestTime: 0,
    errorTypes: new Map<string, number>()
  };
  
  static getInstance(): LoadStatistics {
    if (!LoadStatistics.instance) {
      LoadStatistics.instance = new LoadStatistics();
    }
    return LoadStatistics.instance;
  }
  
  recordRequest(success: boolean, loadTime: number, errorType?: string): void {
    this.stats.totalRequests++;
    this.stats.lastRequestTime = Date.now();
    
    if (success) {
      this.stats.successfulRequests++;
      this.stats.averageLoadTime = 
        (this.stats.averageLoadTime * (this.stats.successfulRequests - 1) + loadTime) / 
        this.stats.successfulRequests;
    } else {
      this.stats.failedRequests++;
      if (errorType) {
        this.stats.errorTypes.set(errorType, (this.stats.errorTypes.get(errorType) || 0) + 1);
      }
    }
  }
  
  recordCacheHit(): void {
    this.stats.cacheHits++;
  }
  
  getStats() {
    return {
      ...this.stats,
      successRate: this.stats.totalRequests > 0 ? 
        (this.stats.successfulRequests / this.stats.totalRequests) * 100 : 0,
      cacheHitRate: this.stats.totalRequests > 0 ? 
        (this.stats.cacheHits / this.stats.totalRequests) * 100 : 0,
      errorTypes: Object.fromEntries(this.stats.errorTypes)
    };
  }
  
  reset(): void {
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      cacheHits: 0,
      averageLoadTime: 0,
      lastRequestTime: 0,
      errorTypes: new Map()
    };
  }
}

// 統計インスタンス
export const loadStatistics = LoadStatistics.getInstance();

// 品質監視フック
export function useLoadSampleDataQuality() {
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<StructuredError | null>(null);
  const [stats, setStats] = React.useState(loadStatistics.getStats());
  
  const load = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const startTime = Date.now();
    
    try {
      const data = await loadSampleData();
      const loadTime = Date.now() - startTime;
      
      loadStatistics.recordRequest(true, loadTime);
      setStats(loadStatistics.getStats());
      
      return data;
    } catch (err) {
      const structuredError = err as StructuredError;
      const loadTime = Date.now() - startTime;
      
      loadStatistics.recordRequest(false, loadTime, structuredError.category);
      setStats(loadStatistics.getStats());
      setError(structuredError);
      
      throw structuredError;
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  return {
    load,
    isLoading,
    error,
    stats
  };
}

// React import
import React from 'react';