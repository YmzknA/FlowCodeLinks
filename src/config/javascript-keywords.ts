/**
 * JavaScript/TypeScript言語の予約語とビルトイン関数の定義
 * Ruby実装と同等の精度を実現するためのフィルタリング機能
 */

/**
 * JavaScriptの予約語・キーワード
 * メソッド呼び出しとして検出すべきでない単語のリスト
 */
export const JAVASCRIPT_KEYWORDS = [
  // 制御構造
  'if', 'else', 'switch', 'case', 'default', 'while', 'for', 'do', 'break', 'continue', 'return',
  
  // 関数・クラス定義
  'function', 'class', 'constructor', 'static', 'get', 'set', 'async', 'await',
  
  // 変数宣言
  'var', 'let', 'const',
  
  // 例外処理
  'try', 'catch', 'finally', 'throw',
  
  // オブジェクト・型
  'new', 'this', 'super', 'typeof', 'instanceof', 'in', 'of', 'delete', 'void',
  
  // 論理・比較
  'true', 'false', 'null', 'undefined',
  
  // モジュール
  'import', 'export', 'from', 'default', 'as',
  
  // その他
  'with', 'debugger', 'enum', 'implements', 'interface', 'package', 'private', 'protected', 'public', 'static',
  'yield', 'extends',
  
  // TypeScript固有
  'type', 'namespace', 'module', 'declare', 'abstract', 'readonly'
] as const;

/**
 * JavaScriptのビルトイン関数・メソッド
 * 標準で提供される関数で、通常はユーザー定義メソッドとして扱わない
 */
export const JAVASCRIPT_BUILTINS = [
  // Console API
  'log', 'info', 'warn', 'error', 'debug', 'trace', 'assert', 'dir', 'table',
  
  // グローバル関数
  'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'encodeURI', 'encodeURIComponent',
  'decodeURI', 'decodeURIComponent', 'escape', 'unescape', 'eval',
  
  // JSON
  'parse', 'stringify',
  
  // Timer API
  'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval', 'setImmediate', 'clearImmediate',
  
  // Array methods
  'push', 'pop', 'shift', 'unshift', 'slice', 'splice', 'concat', 'join', 'reverse', 'sort',
  'indexOf', 'lastIndexOf', 'forEach', 'map', 'filter', 'reduce', 'reduceRight', 'some', 'every',
  'find', 'findIndex', 'includes', 'flat', 'flatMap',
  
  // String methods
  'charAt', 'charCodeAt', 'indexOf', 'lastIndexOf', 'slice', 'substring', 'substr', 'toLowerCase',
  'toUpperCase', 'trim', 'trimStart', 'trimEnd', 'split', 'replace', 'match', 'search',
  'startsWith', 'endsWith', 'includes', 'repeat', 'padStart', 'padEnd',
  
  // Object methods
  'hasOwnProperty', 'isPrototypeOf', 'propertyIsEnumerable', 'toString', 'valueOf',
  'keys', 'values', 'entries', 'assign', 'create', 'defineProperty', 'freeze', 'seal',
  
  // Math methods
  'abs', 'ceil', 'floor', 'round', 'max', 'min', 'pow', 'sqrt', 'random', 'sin', 'cos', 'tan',
  
  // Date methods
  'getTime', 'getDate', 'getDay', 'getMonth', 'getFullYear', 'getHours', 'getMinutes', 'getSeconds',
  'setDate', 'setMonth', 'setFullYear', 'setHours', 'setMinutes', 'setSeconds', 'toISOString',
  
  // Promise methods
  'then', 'catch', 'finally', 'resolve', 'reject', 'all', 'race', 'allSettled',
  
  // DOM/Browser APIs (基本的なもの)
  'addEventListener', 'removeEventListener', 'getElementById', 'querySelector', 'querySelectorAll',
  'createElement', 'appendChild', 'removeChild', 'innerHTML', 'textContent', 'setAttribute',
  'getAttribute', 'removeAttribute', 'classList', 'style'
] as const;

/**
 * 一般的なJavaScript/TypeScriptフレームワークのメソッド
 * 定義されていなくても有効なメソッドとして扱う
 */
export const JAVASCRIPT_FRAMEWORK_METHODS = [
  // React Hooks
  'useState', 'useEffect', 'useContext', 'useReducer', 'useCallback', 'useMemo', 'useRef',
  'useLayoutEffect', 'useImperativeHandle', 'useDebugValue',
  
  // React methods
  'render', 'setState', 'forceUpdate', 'componentDidMount', 'componentDidUpdate',
  'componentWillUnmount', 'shouldComponentUpdate', 'getSnapshotBeforeUpdate',
  
  // Jest testing
  'describe', 'it', 'test', 'expect', 'beforeEach', 'afterEach', 'beforeAll', 'afterAll',
  'jest', 'mock', 'spyOn', 'mockReturnValue', 'mockImplementation',
  
  // Express.js
  'get', 'post', 'put', 'delete', 'patch', 'use', 'listen', 'send', 'json', 'status',
  'redirect', 'render', 'cookie', 'clearCookie',
  
  // Lodash/Utility libraries
  'map', 'filter', 'reduce', 'forEach', 'find', 'findIndex', 'some', 'every', 'includes',
  'isEmpty', 'isArray', 'isObject', 'isString', 'isNumber', 'isFunction', 'isUndefined',
  'cloneDeep', 'merge', 'pick', 'omit', 'groupBy', 'sortBy', 'uniq', 'flatten',
  
  // Axios/HTTP libraries
  'get', 'post', 'put', 'delete', 'request', 'interceptors',
  
  // Node.js specific
  'require', 'module', 'exports', '__dirname', '__filename', 'process', 'Buffer',
  
  // Database/ORM methods (限定的にのみ)
  'findOne', 'findAll', 'findById', 'where', 'include'
] as const;

/**
 * 制御構造パターン
 * メソッド定義として誤検出しやすいパターン
 */
export const JAVASCRIPT_CONTROL_PATTERNS = [
  'if', 'else', 'while', 'for', 'switch', 'case', 'try', 'catch', 'finally', 'with'
] as const;

/**
 * 型安全性のためのタイプガード関数群
 */

export function isJavaScriptKeyword(word: string): boolean {
  return (JAVASCRIPT_KEYWORDS as readonly string[]).includes(word);
}

export function isJavaScriptBuiltin(word: string): boolean {
  return (JAVASCRIPT_BUILTINS as readonly string[]).includes(word);
}

export function isJavaScriptFrameworkMethod(word: string): boolean {
  return (JAVASCRIPT_FRAMEWORK_METHODS as readonly string[]).includes(word);
}

export function isJavaScriptControlPattern(word: string): boolean {
  return (JAVASCRIPT_CONTROL_PATTERNS as readonly string[]).includes(word);
}

/**
 * JavaScriptメソッドかどうかを総合的に判定
 * Rubyのフィルタリングロジックと同等の機能を提供
 */
export function isValidJavaScriptMethod(word: string, definedMethods?: Set<string>): boolean {
  // キーワードや制御構造は除外
  if (isJavaScriptKeyword(word) || isJavaScriptControlPattern(word)) {
    return false;
  }
  
  // ビルトインメソッドは除外
  if (isJavaScriptBuiltin(word)) {
    return false;
  }
  
  // 定義済みメソッドまたはフレームワークメソッドは有効
  if (definedMethods?.has(word) || isJavaScriptFrameworkMethod(word)) {
    return true;
  }
  
  // その他は除外（Ruby同様の厳密なフィルタリング）
  return false;
}