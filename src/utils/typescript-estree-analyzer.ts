import { ParsedFile, Method, MethodCall } from '@/types/codebase';
import crypto from 'crypto';

// TypeScript ESTree関連の型定義
interface ESTreeParser {
  parse: (content: string, options: any) => any; // 本来はTSESTree.Programだが、現状は依存性の問題でanyを使用
  TSESTreeTypes?: any;
}

interface ParseErrorInfo {
  file: string;
  fileSize: number;
  language: string;
  error: string;
  timestamp: string;
}

// パフォーマンス最適化用のキャッシュ（TTL機能付き）
interface CacheEntry {
  data: Method[];
  timestamp: number;
  accessCount: number;
}

const parseCache = new Map<string, CacheEntry>();
const CACHE_MAX_SIZE = 100; // 最大キャッシュサイズ
const CACHE_TTL = 30 * 60 * 1000; // 30分
const MAX_ACCESS_COUNT = 1000; // 最大アクセス回数
const MAX_FILE_SIZE = 1024 * 1024; // 1MB制限

// 定期的なキャッシュクリーニング（サーバーサイドのみ）
if (typeof window === 'undefined') {
  const cleanExpiredCache = (): void => {
    const now = Date.now();
    for (const [key, entry] of parseCache.entries()) {
      if (now - entry.timestamp > CACHE_TTL || entry.accessCount > MAX_ACCESS_COUNT) {
        parseCache.delete(key);
      }
    }
  };
  
  // 5分毎にキャッシュクリーニング実行
  setInterval(cleanExpiredCache, 5 * 60 * 1000);
}

/**
 * TypeScript ESTreeを動的に読み込む
 */
function loadTypeScriptESTree(): ESTreeParser | null {
  try {
    const tsEstree = require('@typescript-eslint/typescript-estree');
    const tsTypes = require('@typescript-eslint/types');
    return {
      parse: tsEstree.parse,
      TSESTreeTypes: tsTypes.TSESTree
    };
  } catch (error) {
    console.warn('TypeScript ESTree not available:', error);
    return null;
  }
}

/**
 * TypeScript ESTreeが利用可能かチェック
 */
function isTypeScriptESTreeAvailable(): boolean {
  // ブラウザ環境シミュレーション時（window が定義されているかつ require が undefined）はfalseを返す
  if (typeof window !== 'undefined' && typeof require === 'undefined') {
    console.warn('TypeScript ESTree not available in browser environment. Using fallback analysis.');
    return false;
  }
  
  // サーバーサイドまたは通常のテスト環境でのみ利用可能
  const isAvailable = typeof window === 'undefined' || 
                      (typeof process !== 'undefined' && process.env.NODE_ENV === 'test' && typeof require !== 'undefined');
  
  // 本番環境ではログを制限
  if (!isAvailable && process.env.NODE_ENV === 'development') {
    console.warn('TypeScript ESTree not available in browser environment. Using fallback analysis.');
  }
  
  return isAvailable;
}

/**
 * TypeScript ESTreeを使用したメソッド定義の抽出のみ（呼び出し検出なし）
 */
export function extractTypeScriptMethodDefinitionsWithESTree(file: ParsedFile): Method[] {
  if (!file.content.trim() || !isTypeScriptESTreeAvailable()) {
    return [];
  }

  // ファイルサイズ制限チェック
  if (file.content.length > MAX_FILE_SIZE) {
    console.warn(`File too large for AST parsing: ${file.path} (${file.content.length} bytes)`);
    return [];
  }

  const esTree = loadTypeScriptESTree();
  if (!esTree) {
    return [];
  }

  try {
    const ast = esTree.parse(file.content, parseOptions);

    const methods: Method[] = [];

    // ASTを走査してメソッド定義のみを抽出（呼び出しは除外）
    traverse(ast, {
      // インターフェース
      TSInterfaceDeclaration: (node) => {
        methods.push(...createInterfaceMethodsDefinitionOnly(node, file));
      },
      
      // クラス
      ClassDeclaration: (node) => {
        methods.push(...createClassMethodsDefinitionOnly(node, file));
      },
      
      // 関数
      FunctionDeclaration: (node) => {
        methods.push(createFunctionMethodDefinitionOnly(node, file));
      },
      
      // アロー関数と変数宣言
      VariableDeclaration: (node) => {
        methods.push(...createVariableDeclarationMethodsDefinitionOnly(node, file));
      }
    });

    return methods;
    
  } catch (error) {
    console.warn(`TypeScript ESTree parsing failed for ${file.path}:`, error);
    return [];
  }
}

/**
 * キャッシュキーを生成（内容ハッシュによる衝突回避）
 */
function generateCacheKey(file: ParsedFile, allDefinedMethods?: Set<string>): string {
  const contentHash = crypto.createHash('sha256').update(file.content).digest('hex').substring(0, 8);
  const methodsHash = allDefinedMethods ? Array.from(allDefinedMethods).sort().join(',') : '';
  return `${file.path}:${contentHash}:${methodsHash}:${file.language}`;
}

/**
 * キャッシュサイズを管理（LRU風 + TTL対応）
 */
function manageCacheSize(): void {
  if (parseCache.size > CACHE_MAX_SIZE) {
    const firstKey = parseCache.keys().next().value;
    if (firstKey) {
      parseCache.delete(firstKey);
    }
  }
}

/**
 * パフォーマンス最適化：キャッシュクリア機能
 */
export function clearParseCache(): void {
  parseCache.clear();
}

/**
 * パフォーマンス最適化：キャッシュ統計取得
 */
export function getCacheStats(): { size: number; maxSize: number; hitRate?: number } {
  return {
    size: parseCache.size,
    maxSize: CACHE_MAX_SIZE
  };
}

/**
 * TypeScript ESTreeを使用したTypeScriptファイルの包括的解析
 */
export function analyzeTypeScriptWithESTree(file: ParsedFile, allDefinedMethods?: Set<string>): Method[] {
  if (!file.content.trim()) {
    return [];
  }

  // ファイルサイズ制限チェック（DoS攻撃対策）
  if (file.content.length > MAX_FILE_SIZE) {
    console.warn(`File too large for AST parsing: ${file.path} (${file.content.length} bytes)`);
    return analyzeTypeScriptWithRegex(file, allDefinedMethods);
  }

  // キャッシュチェック
  const cacheKey = generateCacheKey(file, allDefinedMethods);
  if (parseCache.has(cacheKey)) {
    const cachedEntry = parseCache.get(cacheKey)!;
    // アクセス回数を増加
    cachedEntry.accessCount++;
    cachedEntry.timestamp = Date.now();
    // キャッシュヒット時はエントリを最新に移動（LRU）
    parseCache.delete(cacheKey);
    parseCache.set(cacheKey, cachedEntry);
    return cachedEntry.data;
  }

  let result: Method[];

  // TypeScript ESTreeが利用可能な場合はAST解析を使用
  if (isTypeScriptESTreeAvailable()) {
    const esTree = loadTypeScriptESTree();
    if (!esTree) {
      console.warn('Failed to load TypeScript ESTree, falling back to regex analysis');
      result = analyzeTypeScriptWithRegex(file, allDefinedMethods);
    } else {
      result = analyzeWithESTreeInternal(esTree, file, allDefinedMethods);
    }
  } else {
    // クライアントサイドでは正規表現ベースの解析を使用
    result = analyzeTypeScriptWithRegex(file, allDefinedMethods);
  }

  // 結果をキャッシュに保存（TTL対応）
  manageCacheSize();
  const cacheEntry: CacheEntry = {
    data: result,
    timestamp: Date.now(),
    accessCount: 1
  };
  parseCache.set(cacheKey, cacheEntry);

  return result;
}

/**
 * 解析オプションの定数
 */
const parseOptions = {
  loc: true,
  range: true,
  comment: true,
  tokens: true,
  errorOnUnknownASTType: false,
  errorOnTypeScriptSyntacticAndSemanticIssues: false,
  allowInvalidAST: true,
  jsx: true
};

/**
 * TypeScript ESTreeを使用した内部解析関数（改善版：責任分離）
 */
function analyzeWithESTreeInternal(esTree: ESTreeParser, file: ParsedFile, allDefinedMethods?: Set<string>): Method[] {
  try {
    const ast = esTree.parse(file.content, parseOptions);
    const methods: Method[] = [];
    
    // 各種類ごとに専用関数を呼び出し
    methods.push(...extractTypeDefinitions(ast, file));
    methods.push(...extractClassMethods(ast, file, allDefinedMethods));
    methods.push(...extractFunctionDefinitions(ast, file, allDefinedMethods));
    methods.push(...extractImportExports(ast, file));
    methods.push(...extractCallExpressionArrowFunctions(ast, file, allDefinedMethods));
    
    return methods;
    
  } catch (error) {
    const errorInfo = {
      file: file.path,
      fileSize: file.content.length,
      language: file.language,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    };
    
    if (process.env.NODE_ENV === 'development') {
      console.error('AST parsing failed:', errorInfo);
    } else {
      console.warn(`TypeScript ESTree parsing failed for ${file.path}`);
    }
    
    return analyzeTypeScriptWithRegex(file, allDefinedMethods);
  }
}

/**
 * 型定義（type alias, interface）の抽出
 */
function extractTypeDefinitions(ast: any, file: ParsedFile): Method[] {
  const methods: Method[] = [];
  traverse(ast, {
    TSTypeAliasDeclaration: (node) => {
      methods.push(createTypeAliasMethod(node, file));
    },
    TSInterfaceDeclaration: (node) => {
      methods.push(...createInterfaceMethods(node, file));
    }
  });
  return methods;
}

/**
 * クラスメソッドの抽出
 */
function extractClassMethods(ast: any, file: ParsedFile, allDefinedMethods?: Set<string>): Method[] {
  const methods: Method[] = [];
  traverse(ast, {
    ClassDeclaration: (node) => {
      methods.push(...createClassMethods(node, file, allDefinedMethods));
    }
  });
  return methods;
}

/**
 * 関数定義（function, arrow function）の抽出
 */
function extractFunctionDefinitions(ast: any, file: ParsedFile, allDefinedMethods?: Set<string>): Method[] {
  const methods: Method[] = [];
  traverse(ast, {
    FunctionDeclaration: (node) => {
      methods.push(createFunctionMethod(node, file, allDefinedMethods));
    },
    VariableDeclaration: (node) => {
      methods.push(...createVariableDeclarationMethods(node, file, allDefinedMethods));
    }
  });
  return methods;
}

/**
 * インポート・エクスポート文の抽出
 */
function extractImportExports(ast: any, file: ParsedFile): Method[] {
  const methods: Method[] = [];
  traverse(ast, {
    ImportDeclaration: (node) => {
      methods.push(createImportMethod(node, file));
    },
    ExportNamedDeclaration: (node) => {
      methods.push(...createExportMethods(node, file));
    },
    ExportDefaultDeclaration: (node) => {
      methods.push(createDefaultExportMethod(node, file));
    }
  });
  return methods;
}

/**
 * CallExpression内のアロー関数（useCallback等）の抽出
 */
function extractCallExpressionArrowFunctions(ast: any, file: ParsedFile, allDefinedMethods?: Set<string>): Method[] {
  const methods: Method[] = [];
  traverse(ast, {
    CallExpression: (node) => {
      methods.push(...extractArrowFunctionsFromCallExpression(node, file, allDefinedMethods));
    }
  });
  return methods;
}

/**
 * 正規表現ベースのTypeScript/TSX解析（クライアントサイド用フォールバック）
 */
function analyzeTypeScriptWithRegex(file: ParsedFile, allDefinedMethods?: Set<string>): Method[] {
  const methods: Method[] = [];
  const content = file.content;
  
  // 1. 型エイリアス検出
  const typeAliasMatches = content.matchAll(/(?:export\s+)?type\s+(\w+)/g);
  for (const match of typeAliasMatches) {
    if (match[1]) {
      const lineNumber = content.substring(0, match.index).split('\n').length;
      methods.push({
        name: match[1],
        type: 'type_alias',
        startLine: lineNumber,
        endLine: lineNumber,
        filePath: file.path,
        code: match[0],
        calls: [],
        isPrivate: false,
        parameters: []
      });
    }
  }
  
  // 2. インターフェース検出
  const interfaceMatches = content.matchAll(/(?:export\s+)?interface\s+(\w+)/g);
  for (const match of interfaceMatches) {
    if (match[1]) {
      const lineNumber = content.substring(0, match.index).split('\n').length;
      methods.push({
        name: match[1],
        type: 'interface',
        startLine: lineNumber,
        endLine: lineNumber,
        filePath: file.path,
        code: match[0],
        calls: [],
        isPrivate: false,
        parameters: []
      });
    }
  }
  
  // 3. 関数宣言
  const functionMatches = content.matchAll(/(?:export\s+)?(?:default\s+)?function\s+(\w+)/g);
  for (const match of functionMatches) {
    if (match[1]) {
      const lineNumber = content.substring(0, match.index).split('\n').length;
      const isComponent = match[1][0].match(/[A-Z]/) && 
                         file.content.includes('return') && 
                         (file.content.includes('<') && file.content.includes('>'));
      
      methods.push({
        name: match[1],
        type: isComponent ? 'component' : 'function',
        startLine: lineNumber,
        endLine: lineNumber,
        filePath: file.path,
        code: match[0],
        calls: [],
        isPrivate: false,
        parameters: []
      });
    }
  }
  
  // 4. アロー関数（const Component = () => {...}）
  const arrowFunctionMatches = content.matchAll(/(?:export\s+)?const\s+(\w+)(?::\s*[^=]+)?\s*=\s*\(/g);
  for (const match of arrowFunctionMatches) {
    if (match[1]) {
      const lineNumber = content.substring(0, match.index).split('\n').length;
      const isComponent = match[1][0].match(/[A-Z]/) && 
                         file.content.includes('return') && 
                         (file.content.includes('<') && file.content.includes('>'));
      
      methods.push({
        name: match[1],
        type: isComponent ? 'component' : 'function',
        startLine: lineNumber,
        endLine: lineNumber,
        filePath: file.path,
        code: match[0],
        calls: [],
        isPrivate: false,
        parameters: []
      });
    }
  }
  
  // 5. インポート文
  const importMatches = content.matchAll(/import\s+.+\s+from\s+['"`]([^'"`]+)['"`]/g);
  for (const match of importMatches) {
    if (match[1]) {
      const lineNumber = content.substring(0, match.index).split('\n').length;
      methods.push({
        name: `[Import: ${match[1]}]`,
        type: 'import',
        startLine: lineNumber,
        endLine: lineNumber,
        filePath: file.path,
        code: match[0],
        calls: [],
        isPrivate: false,
        parameters: []
      });
    }
  }
  
  // 6. エクスポート文
  const exportMatches = content.matchAll(/export default/g);
  for (const match of exportMatches) {
    const lineNumber = content.substring(0, match.index).split('\n').length;
    methods.push({
      name: '[Default Export]',
      type: 'export',
      startLine: lineNumber,
      endLine: lineNumber,
      filePath: file.path,
      code: match[0],
      calls: [],
      isPrivate: false,
      parameters: []
    });
  }
  
  return methods;
}

/**
 * AST走査のヘルパー関数
 */
function traverse(node: any, visitors: Record<string, (node: any) => void>) {
  const nodeType = node.type;
  
  if (visitors[nodeType]) {
    visitors[nodeType](node);
  }
  
  // 子ノードを再帰的に走査
  for (const key in node) {
    const child = node[key];
    if (Array.isArray(child)) {
      child.forEach(item => {
        if (item && typeof item === 'object' && item.type) {
          traverse(item, visitors);
        }
      });
    } else if (child && typeof child === 'object' && child.type) {
      traverse(child, visitors);
    }
  }
}

/**
 * 型エイリアスのMethod作成
 */
function createTypeAliasMethod(node: any, file: ParsedFile): Method {
  return {
    name: node.id.name,
    type: 'type_alias',
    startLine: node.loc!.start.line,
    endLine: node.loc!.end.line,
    filePath: file.path,
    code: getCodeSlice(file.content, node.loc!.start.line, node.loc!.end.line),
    calls: [],
    isPrivate: false,
    parameters: []
  };
}

/**
 * インターフェースのMethod作成
 */
function createInterfaceMethods(node: any, file: ParsedFile): Method[] {
  const methods: Method[] = [];
  
  // インターフェースのメソッドのみを抽出（インターフェース自体は除外）
  node.body.body.forEach((member: any) => {
    if (member.type === 'TSMethodSignature' && member.key.type === 'Identifier') {
      methods.push({
        name: member.key.name,
        type: 'interface_method',
        startLine: member.loc!.start.line,
        endLine: member.loc!.end.line,
        filePath: file.path,
        code: getCodeSlice(file.content, member.loc!.start.line, member.loc!.end.line),
        calls: [],
        isPrivate: false,
        parameters: extractParametersFromSignature(member)
      });
    }
  });
  
  return methods;
}

/**
 * クラスのMethod作成
 */
function createClassMethods(node: any, file: ParsedFile, allDefinedMethods?: Set<string>): Method[] {
  const methods: Method[] = [];
  
  if (!node.id) return methods;
  
  // クラスメソッドのみを抽出（クラス自体は除外）
  node.body.body.forEach((member: any) => {
    if (member.type === 'MethodDefinition' && member.key.type === 'Identifier') {
      const isStatic = member.static;
      const isPrivate = member.accessibility === 'private';
      
      const methodCalls = extractMethodCalls(member.value, allDefinedMethods);
      
      methods.push({
        name: member.key.name,
        type: isStatic ? 'class_method' : 'method',
        startLine: member.loc!.start.line,
        endLine: member.loc!.end.line,
        filePath: file.path,
        code: getCodeSlice(file.content, member.loc!.start.line, member.loc!.end.line),
        calls: methodCalls,
        isPrivate,
        parameters: extractParametersFromFunction(member.value)
      });
    }
  });
  
  return methods;
}

/**
 * 関数のMethod作成
 */
function createFunctionMethod(node: any, file: ParsedFile, allDefinedMethods?: Set<string>): Method {
  const methodCalls = extractMethodCalls(node, allDefinedMethods);
  
  // Reactコンポーネントかどうかを判定
  const isReactComponent = isReactFunctionComponent(node, file.content);
  
  return {
    name: node.id?.name || 'anonymous',
    type: isReactComponent ? 'component' : 'function',
    startLine: node.loc!.start.line,
    endLine: node.loc!.end.line,
    filePath: file.path,
    code: getCodeSlice(file.content, node.loc!.start.line, node.loc!.end.line),
    calls: methodCalls,
    isPrivate: false,
    parameters: extractParametersFromFunction(node)
  };
}

/**
 * 変数宣言（アロー関数含む）のMethod作成
 */
function createVariableDeclarationMethods(node: any, file: ParsedFile, allDefinedMethods?: Set<string>): Method[] {
  const methods: Method[] = [];
  
  node.declarations.forEach((declarator: any) => {
    if (declarator.id.type === 'Identifier' && declarator.init) {
      if (declarator.init.type === 'ArrowFunctionExpression') {
        const methodCalls = extractMethodCalls(declarator.init, allDefinedMethods);
        
        // Reactコンポーネントかどうかを判定
        const isReactComponent = isReactComponentFunction(declarator, file.content);
        
        methods.push({
          name: declarator.id.name,
          type: isReactComponent ? 'component' : 'function',
          startLine: node.loc!.start.line,
          endLine: node.loc!.end.line,
          filePath: file.path,
          code: getCodeSlice(file.content, node.loc!.start.line, node.loc!.end.line),
          calls: methodCalls,
          isPrivate: false,
          parameters: extractParametersFromFunction(declarator.init)
        });
      }
    }
  });
  
  return methods;
}

/**
 * インポートのMethod作成
 */
function createImportMethod(node: any, file: ParsedFile): Method {
  return {
    name: `[Import: ${node.source.value}]`,
    type: 'import',
    startLine: node.loc!.start.line,
    endLine: node.loc!.end.line,
    filePath: file.path,
    code: getCodeSlice(file.content, node.loc!.start.line, node.loc!.end.line),
    calls: [],
    isPrivate: false,
    parameters: []
  };
}

/**
 * エクスポートのMethod作成
 */
function createExportMethods(node: any, file: ParsedFile): Method[] {
  const methods: Method[] = [];
  
  if (node.declaration) {
    // export function, export class, etc.
    methods.push({
      name: `[Export Declaration]`,
      type: 'export',
      startLine: node.loc!.start.line,
      endLine: node.loc!.end.line,
      filePath: file.path,
      code: getCodeSlice(file.content, node.loc!.start.line, node.loc!.end.line),
      calls: [],
      isPrivate: false,
      parameters: []
    });
  }
  
  return methods;
}

/**
 * デフォルトエクスポートのMethod作成
 */
function createDefaultExportMethod(node: any, file: ParsedFile): Method {
  return {
    name: '[Default Export]',
    type: 'export',
    startLine: node.loc!.start.line,
    endLine: node.loc!.end.line,
    filePath: file.path,
    code: getCodeSlice(file.content, node.loc!.start.line, node.loc!.end.line),
    calls: [],
    isPrivate: false,
    parameters: []
  };
}

/**
 * AST内のメソッド呼び出しを抽出
 */
function extractMethodCalls(node: any, allDefinedMethods?: Set<string>): MethodCall[] {
  const calls: MethodCall[] = [];
  
  traverse(node, {
    CallExpression: (callNode) => {
      const methodName = extractMethodNameFromCallExpression(callNode);
      if (methodName && shouldIncludeMethodCall(methodName, allDefinedMethods)) {
        calls.push({
          methodName,
          line: callNode.loc!.start.line,
          context: ''
        });
      }
    }
  });
  
  return calls;
}

/**
 * CallExpressionからメソッド名を抽出
 */
function extractMethodNameFromCallExpression(node: any): string | null {
  if (node.callee.type === 'Identifier') {
    return node.callee.name;
  } else if (node.callee.type === 'MemberExpression' && node.callee.property.type === 'Identifier') {
    return node.callee.property.name;
  }
  return null;
}

/**
 * メソッド呼び出しをフィルタリング
 */
function shouldIncludeMethodCall(methodName: string, allDefinedMethods?: Set<string>): boolean {
  if (!allDefinedMethods) return true;
  
  // 定義済みメソッドまたはフレームワークメソッドのみ含める
  return allDefinedMethods.has(methodName) || isFrameworkMethod(methodName);
}

/**
 * フレームワークメソッドかどうか判定
 */
function isFrameworkMethod(methodName: string): boolean {
  const frameworkMethods = [
    'useState', 'useEffect', 'useCallback', 'useMemo', 'useContext',
    'console', 'setTimeout', 'setInterval', 'fetch', 'Promise'
  ];
  return frameworkMethods.includes(methodName);
}

/**
 * React関数コンポーネントかどうか判定（function宣言用）
 */
function isReactFunctionComponent(node: any, fileContent: string): boolean {
  // 関数名が大文字で始まる（Reactコンポーネントの命名規則）
  const functionName = node.id?.name;
  if (!functionName || !functionName[0].match(/[A-Z]/)) {
    return false;
  }
  
  // 関数本体にJSXが含まれているかチェック
  const functionCode = getCodeSlice(fileContent, node.loc!.start.line, node.loc!.end.line);
  
  // JSXパターンをチェック（より厳密に）
  const hasJSXReturn = functionCode.includes('return') && 
                       (functionCode.includes('<') && functionCode.includes('>'));
  
  // React要素の一般的なパターンをチェック
  const hasReactPatterns = /return\s*\(\s*<|return\s*</.test(functionCode) ||
                          /<[A-Z]/.test(functionCode) || // コンポーネント名
                          /className=/.test(functionCode) || // React特有の属性
                          /<div|<span|<article|<header|<main|<section/.test(functionCode); // HTML要素
  
  return hasJSXReturn || hasReactPatterns;
}

/**
 * Reactコンポーネントかどうか判定（変数宣言用）
 */
function isReactComponentFunction(declarator: any, fileContent: string): boolean {
  // 型注釈にReact.FCが含まれているかチェック
  if (declarator.id.typeAnnotation && declarator.id.typeAnnotation.typeAnnotation) {
    const typeCode = getCodeSliceFromRange(fileContent, declarator.id.typeAnnotation.range);
    if (typeCode.includes('React.FC') || typeCode.includes('FC<')) {
      return true;
    }
  }
  
  // 変数名が大文字で始まる（Reactコンポーネントの命名規則）
  const componentName = declarator.id.name;
  if (!componentName || !componentName[0].match(/[A-Z]/)) {
    return false;
  }
  
  // 関数本体にJSXが含まれているかチェック（簡易的）
  const functionCode = getCodeSliceFromRange(fileContent, declarator.init.range);
  const hasJSXReturn = functionCode.includes('return') && 
                       (functionCode.includes('<') && functionCode.includes('>'));
  
  const hasReactPatterns = /return\s*\(\s*<|return\s*</.test(functionCode) ||
                          /<[A-Z]/.test(functionCode) ||
                          /className=/.test(functionCode) ||
                          /<div|<span|<article|<header|<main|<section/.test(functionCode);
  
  return hasJSXReturn || hasReactPatterns;
}

/**
 * 範囲指定でコードを取得
 */
function getCodeSliceFromRange(content: string, range: [number, number]): string {
  return content.slice(range[0], range[1]);
}

/**
 * CallExpression内のアロー関数を抽出（useCallback等）
 */
function extractArrowFunctionsFromCallExpression(node: any, file: ParsedFile, allDefinedMethods?: Set<string>): Method[] {
  const methods: Method[] = [];
  
  // useCallback, useMemo等のフック内のアロー関数を検出
  if (node.callee.type === 'Identifier' && 
      ['useCallback', 'useMemo', 'useEffect'].includes(node.callee.name)) {
    
    node.arguments.forEach((arg: any, index: number) => {
      if (arg.type === 'ArrowFunctionExpression' && index === 0) {
        // フック関数名を推測（例：useCallbackの場合は親の変数名）
        const methodName = guessCallbackMethodName(node, file.content);
        if (methodName) {
          const methodCalls = extractMethodCalls(arg, allDefinedMethods);
          
          methods.push({
            name: methodName,
            type: 'function',
            startLine: arg.loc!.start.line,
            endLine: arg.loc!.end.line,
            filePath: file.path,
            code: getCodeSlice(file.content, arg.loc!.start.line, arg.loc!.end.line),
            calls: methodCalls,
            isPrivate: false,
            parameters: extractParametersFromFunction(arg)
          });
        }
      }
    });
  }
  
  return methods;
}

/**
 * コールバック関数の名前を推測
 */
function guessCallbackMethodName(callNode: any, fileContent: string): string | null {
  // 親ノードから変数名を取得する簡易的な方法
  // const handleClick = useCallback(() => {}) の場合のhandleClickを取得
  const lines = fileContent.split('\n');
  const line = lines[callNode.loc!.start.line - 1];
  const match = line.match(/const\s+(\w+)\s*=/);
  if (match) {
    return match[1];
  }
  return null;
}

/**
 * 関数のパラメータを抽出
 */
function extractParametersFromFunction(node: any): string[] {
  return node.params.map((param: any) => {
    if (param.type === 'Identifier') {
      return param.name;
    }
    return 'param';
  });
}

/**
 * メソッドシグネチャのパラメータを抽出
 */
function extractParametersFromSignature(node: any): string[] {
  return node.params.map((param: any) => {
    if (param.type === 'Identifier') {
      return param.name;
    }
    return 'param';
  });
}

/**
 * 呼び出しのパラメータを抽出
 */
function extractCallParameters(node: any): string[] {
  return node.arguments.map((_: any, index: number) => `arg${index}`);
}

/**
 * インターフェースのMethod作成（定義のみ）
 */
function createInterfaceMethodsDefinitionOnly(node: any, file: ParsedFile): Method[] {
  const methods: Method[] = [];
  
  // インターフェースのメソッド
  node.body.body.forEach((member: any) => {
    if (member.type === 'TSMethodSignature' && member.key.type === 'Identifier') {
      methods.push({
        name: member.key.name,
        type: 'interface_method',
        startLine: member.loc!.start.line,
        endLine: member.loc!.end.line,
        filePath: file.path,
        code: getCodeSlice(file.content, member.loc!.start.line, member.loc!.end.line),
        calls: [], // 定義抽出段階では空
        isPrivate: false,
        parameters: extractParametersFromSignature(member)
      });
    }
  });
  
  return methods;
}

/**
 * クラスのMethod作成（定義のみ）
 */
function createClassMethodsDefinitionOnly(node: any, file: ParsedFile): Method[] {
  const methods: Method[] = [];
  
  if (!node.id) return methods;
  
  // クラスメソッド
  node.body.body.forEach((member: any) => {
    if (member.type === 'MethodDefinition' && member.key.type === 'Identifier') {
      const isStatic = member.static;
      
      methods.push({
        name: member.key.name,
        type: isStatic ? 'class_method' : 'method',
        startLine: member.loc!.start.line,
        endLine: member.loc!.end.line,
        filePath: file.path,
        code: getCodeSlice(file.content, member.loc!.start.line, member.loc!.end.line),
        calls: [], // 定義抽出段階では空
        isPrivate: member.accessibility === 'private',
        parameters: extractParametersFromFunction(member.value)
      });
    }
  });
  
  return methods;
}

/**
 * 関数のMethod作成（定義のみ）
 */
function createFunctionMethodDefinitionOnly(node: any, file: ParsedFile): Method {
  return {
    name: node.id?.name || 'anonymous',
    type: 'function',
    startLine: node.loc!.start.line,
    endLine: node.loc!.end.line,
    filePath: file.path,
    code: getCodeSlice(file.content, node.loc!.start.line, node.loc!.end.line),
    calls: [], // 定義抽出段階では空
    isPrivate: false,
    parameters: extractParametersFromFunction(node)
  };
}

/**
 * 変数宣言（アロー関数含む）のMethod作成（定義のみ）
 */
function createVariableDeclarationMethodsDefinitionOnly(node: any, file: ParsedFile): Method[] {
  const methods: Method[] = [];
  
  node.declarations.forEach((declarator: any) => {
    if (declarator.id.type === 'Identifier' && declarator.init) {
      if (declarator.init.type === 'ArrowFunctionExpression') {
        methods.push({
          name: declarator.id.name,
          type: 'function',
          startLine: node.loc!.start.line,
          endLine: node.loc!.end.line,
          filePath: file.path,
          code: getCodeSlice(file.content, node.loc!.start.line, node.loc!.end.line),
          calls: [], // 定義抽出段階では空
          isPrivate: false,
          parameters: extractParametersFromFunction(declarator.init)
        });
      }
    }
  });
  
  return methods;
}

/**
 * ファイルの指定行範囲のコードを取得
 */
function getCodeSlice(content: string, startLine: number, endLine: number): string {
  const lines = content.split('\n');
  return lines.slice(startLine - 1, endLine).join('\n');
}