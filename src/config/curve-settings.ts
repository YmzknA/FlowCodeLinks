/**
 * 曲線描画とレイアウト設定の定数定義
 * マジックナンバー排除と設定の一元管理
 */
export const CURVE_CONFIG = {
  // Z字曲線の基本設定
  Z_CURVE: {
    BASE_MULTIPLIER: 0.4,
    RANDOM_RANGE: { min: 0.4, max: 1.2 },
    VERTICAL_OFFSET_RATIO: 0.05,
    HORIZONTAL_STRENGTH_RATIO: 1.0,
    MAX_ATTEMPTS: 10  // 重複回避の最大試行回数
  },
  
  // 表示レイアウト設定
  DISPLAY: {
    HEADER_HEIGHT: 40,
    LINE_HEIGHT: 18,
    CANVAS_OFFSET: { x: 2000, y: 1000 },
    
    // ウィンドウ内でのオフセット
    WINDOW_EDGE_OFFSET: 5,
    VISIBLE_RANGE_OFFSET: 10,
    
    // 自己参照時のオフセット
    SELF_REFERENCE_OFFSET: { x: 30, y: 20 },
    SELF_REFERENCE_THRESHOLD: 50  // 同じ座標とみなす閾値
  },
  
  // 矢印サイズ設定
  ARROW: {
    DEFAULT: { width: 3, height: 2.25 },
    HIGHLIGHTED: { width: 5, height: 3.75 },
    
    // 始点マーカーの半径
    START_MARKER_RADIUS: 3,
    START_MARKER_RADIUS_HIGHLIGHTED: 4
  },
  
  // 線の太さ設定
  LINE_WIDTH: {
    INTERNAL: {
      BASE: 1.0,
      MIN: 1.5,
      MAX: 3
    },
    EXTERNAL: {
      BASE: 1.5,
      MIN: 2,
      MAX: 6
    },
    HIGHLIGHTED: 5,
    
    // ホバー判定用の透明線の太さ（最小値）
    HOVER_MIN_WIDTH: 12,
    HOVER_OFFSET: 6
  },
  
  // 透明度設定
  OPACITY: {
    INTERNAL_DEFAULT: 0.5,
    INTERNAL_MARKER: 0.6,
    EXTERNAL_DEFAULT: 0.8,
    EXTERNAL_MARKER: 0.9,
    HOVERED: 1.0
  },
  
  // パフォーマンス設定
  PERFORMANCE: {
    // LRUキャッシュの最大サイズ（最適化済み）
    LRU_CACHE_SIZE: 200,
    
    // 計算のタイムアウト（ミリ秒）
    CALCULATION_TIMEOUT: 5000,
    
    // 安全制限（DoS攻撃対策）
    MAX_DEPENDENCIES: 2000,     // より現実的な値に調整
    MAX_METHODS_PER_FILE: 500,  // メモリ使用量考慮
    PROCESSING_BATCH_SIZE: 100  // バッチ処理サイズ
  }
} as const;

/**
 * カラーパレット設定
 */
export const COLOR_PALETTE = [
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
] as const;

/**
 * ハイライト色設定
 */
export const HIGHLIGHT_COLORS = {
  PRIMARY: '#dc2626', // より濃い赤色
  SECONDARY: '#fbbf24' // 黄色（ツールチップなど）
} as const;

/**
 * 設定値の検証とフォールバック機能
 */
export const validateConfig = (config: typeof CURVE_CONFIG) => {
  const errors: string[] = [];
  
  // 基本制限値の検証
  if (config.PERFORMANCE.MAX_DEPENDENCIES < 100) {
    errors.push('MAX_DEPENDENCIES must be at least 100');
  }
  
  if (config.PERFORMANCE.MAX_METHODS_PER_FILE < 10) {
    errors.push('MAX_METHODS_PER_FILE must be at least 10');
  }
  
  // タイムアウト値の検証
  if (config.PERFORMANCE.CALCULATION_TIMEOUT < 1000) {
    errors.push('CALCULATION_TIMEOUT must be at least 1000ms');
  }
  
  // LRUキャッシュサイズの検証
  if (config.PERFORMANCE.LRU_CACHE_SIZE < 10) {
    errors.push('LRU_CACHE_SIZE must be at least 10');
  }
  
  // Z字曲線設定の検証
  if (config.Z_CURVE.MAX_ATTEMPTS < 1) {
    errors.push('Z_CURVE.MAX_ATTEMPTS must be at least 1');
  }
  
  if (errors.length > 0) {
    throw new Error(`Configuration validation failed: ${errors.join(', ')}`);
  }
  
  return true;
};

/**
 * 設定値の安全な読み込み（フォールバック付き）
 */
export const getSafeConfig = () => {
  try {
    validateConfig(CURVE_CONFIG);
    return CURVE_CONFIG;
  } catch (error) {
    console.error('Configuration validation failed, using fallback values:', error);
    
    // フォールバック設定
    return {
      ...CURVE_CONFIG,
      PERFORMANCE: {
        ...CURVE_CONFIG.PERFORMANCE,
        MAX_DEPENDENCIES: Math.max(CURVE_CONFIG.PERFORMANCE.MAX_DEPENDENCIES, 100),
        MAX_METHODS_PER_FILE: Math.max(CURVE_CONFIG.PERFORMANCE.MAX_METHODS_PER_FILE, 10),
        CALCULATION_TIMEOUT: Math.max(CURVE_CONFIG.PERFORMANCE.CALCULATION_TIMEOUT, 1000),
        LRU_CACHE_SIZE: Math.max(CURVE_CONFIG.PERFORMANCE.LRU_CACHE_SIZE, 10)
      }
    };
  }
};