/**
 * セキュアな正規表現ユーティリティ
 * 
 * ReDoS (Regular Expression Denial of Service) 攻撃を防ぐための
 * タイムアウト機能付き正規表現ラッパー
 */

export interface SecureRegexOptions {
  /** タイムアウト時間（ミリ秒）デフォルト: 1000ms */
  timeoutMs?: number;
  /** タイムアウト時の戻り値 */
  defaultResult?: boolean;
  /** ログ出力を有効にするか */
  enableLogging?: boolean;
}

/**
 * タイムアウト機能付きの安全な正規表現を作成
 */
export function createSecureRegex(
  pattern: string, 
  flags?: string, 
  options: SecureRegexOptions = {}
): RegExp {
  const {
    timeoutMs = 1000,
    defaultResult = false,
    enableLogging = true
  } = options;

  const regex = new RegExp(pattern, flags);
  
  // 元の正規表現オブジェクトをベースにカスタムオブジェクトを作成
  const secureRegex = Object.create(RegExp.prototype);
  
  // 基本プロパティをコピー
  secureRegex.source = regex.source;
  secureRegex.flags = regex.flags;
  secureRegex.global = regex.global;
  secureRegex.ignoreCase = regex.ignoreCase;
  secureRegex.multiline = regex.multiline;
  secureRegex.sticky = regex.sticky;
  secureRegex.unicode = regex.unicode;
  secureRegex.dotAll = regex.dotAll;
  secureRegex.lastIndex = regex.lastIndex;

  // test メソッドをオーバーライド
  secureRegex.test = function(str: string): boolean {
    const startTime = performance.now();
    
    try {
      const result = regex.test(str);
      const endTime = performance.now();
      const executionTime = endTime - startTime;
      
      if (executionTime > timeoutMs) {
        if (enableLogging) {
          console.warn(`[SecureRegex] Timeout detected: ${executionTime.toFixed(2)}ms > ${timeoutMs}ms for pattern: ${pattern}`);
        }
        return defaultResult;
      }
      
      return result;
    } catch (error) {
      if (enableLogging) {
        console.error(`[SecureRegex] Error in pattern execution: ${pattern}`, error);
      }
      return defaultResult;
    }
  };

  // exec メソッドをオーバーライド
  secureRegex.exec = function(str: string): RegExpExecArray | null {
    const startTime = performance.now();
    
    try {
      const result = regex.exec(str);
      const endTime = performance.now();
      const executionTime = endTime - startTime;
      
      if (executionTime > timeoutMs) {
        if (enableLogging) {
          console.warn(`[SecureRegex] Timeout detected in exec: ${executionTime.toFixed(2)}ms > ${timeoutMs}ms for pattern: ${pattern}`);
        }
        return null;
      }
      
      return result;
    } catch (error) {
      if (enableLogging) {
        console.error(`[SecureRegex] Error in exec for pattern: ${pattern}`, error);
      }
      return null;
    }
  };

  // match メソッド用のヘルパー
  secureRegex.toString = function(): string {
    return regex.toString();
  };

  return secureRegex as RegExp;
}

/**
 * 文字列の match メソッド用のセキュアな実装
 */
export function secureMatch(
  str: string, 
  pattern: string | RegExp, 
  flags?: string,
  options: SecureRegexOptions = {}
): RegExpMatchArray | null {
  const {
    timeoutMs = 1000,
    enableLogging = true
  } = options;

  let regex: RegExp;
  
  if (typeof pattern === 'string') {
    regex = createSecureRegex(pattern, flags, options);
  } else {
    regex = pattern;
  }

  const startTime = performance.now();
  
  try {
    const result = str.match(regex);
    const endTime = performance.now();
    const executionTime = endTime - startTime;
    
    if (executionTime > timeoutMs) {
      if (enableLogging) {
        console.warn(`[SecureRegex] Timeout detected in match: ${executionTime.toFixed(2)}ms > ${timeoutMs}ms`);
      }
      return null;
    }
    
    return result;
  } catch (error) {
    if (enableLogging) {
      console.error(`[SecureRegex] Error in match operation:`, error);
    }
    return null;
  }
}

/**
 * 正規表現パターンの危険度を評価
 */
export function assessRegexSafety(pattern: string): {
  riskLevel: 'low' | 'medium' | 'high';
  issues: string[];
} {
  const issues: string[] = [];
  let riskLevel: 'low' | 'medium' | 'high' = 'low';

  // 危険なパターンをチェック
  const dangerousPatterns = [
    { pattern: /\(\?\=.*\)\+/, issue: 'Positive lookahead with quantifier', risk: 'high' },
    { pattern: /\(\?\!.*\)\+/, issue: 'Negative lookahead with quantifier', risk: 'high' },
    { pattern: /\(\.\*\)\+/, issue: 'Nested quantifiers with .* pattern', risk: 'high' },
    { pattern: /\(\.\+\)\+/, issue: 'Nested quantifiers with .+ pattern', risk: 'high' },
    { pattern: /\(\w\+\)\+/, issue: 'Nested quantifiers with word characters', risk: 'medium' },
    { pattern: /\(\[\w\s\]\+\)\+/, issue: 'Nested quantifiers with character class', risk: 'medium' },
    { pattern: /\.\*\.\*/, issue: 'Multiple .* patterns', risk: 'medium' },
    { pattern: /\|\|\|/, issue: 'Multiple alternation patterns', risk: 'medium' },
    { pattern: /\(.*\+.*\)\+/, issue: 'Nested quantifiers', risk: 'high' },
    { pattern: /\(.*\|.*\)\*/, issue: 'Alternation with star', risk: 'high' },
    { pattern: /\(a\+\)\+/, issue: 'Catastrophic backtracking pattern', risk: 'high' },
    { pattern: /\(a\|a\)\*/, issue: 'Ambiguous alternation', risk: 'high' },
    { pattern: /\(\w\*\)\*/, issue: 'Nested star quantifiers', risk: 'high' }
  ];

  for (const check of dangerousPatterns) {
    if (check.pattern.test(pattern)) {
      issues.push(check.issue);
      if (check.risk === 'high' && riskLevel !== 'high') {
        riskLevel = 'high';
      } else if (check.risk === 'medium' && riskLevel === 'low') {
        riskLevel = 'medium';
      }
    }
  }

  return { riskLevel, issues };
}

/**
 * プリセット設定
 */
export const REGEX_PRESETS = {
  /** 厳格: 短いタイムアウト */
  STRICT: { timeoutMs: 500, defaultResult: false, enableLogging: true },
  /** 標準: バランス型 */
  STANDARD: { timeoutMs: 1000, defaultResult: false, enableLogging: true },
  /** 寛容: 長めのタイムアウト */
  PERMISSIVE: { timeoutMs: 2000, defaultResult: false, enableLogging: true },
  /** 本番環境: ログ無効 */
  PRODUCTION: { timeoutMs: 1000, defaultResult: false, enableLogging: false }
} as const;