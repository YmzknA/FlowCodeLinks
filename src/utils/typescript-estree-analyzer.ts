import { ParsedFile, Method, MethodCall } from '@/types/codebase';
import crypto from 'crypto';

// TypeScript ESTree関連の型定義
interface ParseOptions {
  jsx?: boolean;
  range?: boolean;
  loc?: boolean;
  tokens?: boolean;
  comment?: boolean;
  useJSXTextNode?: boolean;
  ecmaVersion?: number;
  sourceType?: 'script' | 'module';
}

interface LocationInfo {
  start: { line: number; column: number; };
  end: { line: number; column: number; };
}

interface BaseNode {
  type: string;
  range?: [number, number];
  loc?: LocationInfo;
}

interface Program extends BaseNode {
  type: 'Program';
  body: BaseNode[];
}

interface ESTreeParser {
  parse: (content: string, options: ParseOptions) => Program;
  TSESTreeTypes?: any; // 外部ライブラリの型定義のため、anyを許容
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
let cleanupTimer: NodeJS.Timeout | null = null;

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
  cleanupTimer = setInterval(cleanExpiredCache, 5 * 60 * 1000);
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
    // TypeScript ESTree not available
    return null;
  }
}

/**
 * TypeScript ESTreeが利用可能かチェック
 */
function isTypeScriptESTreeAvailable(): boolean {
  // テスト環境では常に利用可能とする
  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') {
    return true;
  }
  
  // ブラウザ環境シミュレーション時（window が定義されているかつ require が undefined）はfalseを返す
  if (typeof window !== 'undefined' && typeof require === 'undefined') {
    // TypeScript ESTree not available in browser environment. Using fallback analysis.
    return false;
  }
  
  // サーバーサイドでのみ利用可能
  const isAvailable = typeof window === 'undefined';
  
  // 本番環境ではログを制限
  if (!isAvailable && process.env.NODE_ENV === 'development') {
    // TypeScript ESTree not available in browser environment. Using fallback analysis.
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
    // File too large for AST parsing
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
    // TypeScript ESTree parsing failed
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
 * パフォーマンス最適化：タイマーのクリーンアップ機能
 */
export function cleanupTimers(): void {
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
  }
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
    // File too large for AST parsing
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
      // Failed to load TypeScript ESTree, falling back to regex analysis
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
const parseOptions: ParseOptions = {
  loc: true,
  range: true,
  comment: true,
  tokens: true,
  jsx: true,
  sourceType: 'module' as const,
  ecmaVersion: 2022
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
      // TypeScript ESTree parsing failed
    }
    
    return analyzeTypeScriptWithRegex(file, allDefinedMethods);
  }
}

/**
 * 型定義（type alias, interface, enum）の抽出
 */
function extractTypeDefinitions(ast: any, file: ParsedFile): Method[] {
  const methods: Method[] = [];
  traverse(ast, {
    TSTypeAliasDeclaration: (node) => {
      methods.push(createTypeAliasMethod(node, file));
    },
    TSInterfaceDeclaration: (node) => {
      // インターフェース自体を追加
      methods.push(createInterfaceDefinition(node, file));
      // インターフェースのメソッドも追加
      methods.push(...createInterfaceMethods(node, file));
    },
    TSEnumDeclaration: (node) => {
      methods.push(createEnumMethod(node, file));
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
  
  // カスタムhooksを追加抽出
  methods.push(...extractCustomHooks(ast, file, allDefinedMethods));
  
  return methods;
}

/**
 * インポート・エクスポート文の抽出
 */
function extractImportExports(ast: any, file: ParsedFile): Method[] {
  const methods: Method[] = [];
  traverse(ast, {
    ImportDeclaration: (node) => {
      const importMethod = createImportMethod(node, file);
      methods.push(importMethod);
      
      // インポート要素の使用箇所を個別のエントリとして追加
      const usageEntries = createImportUsageEntries(file, importMethod);
      methods.push(...usageEntries);
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
 * インポート文からメソッド名を抽出
 */
function extractImportedMethodNames(importStatement: string): string[] {
  const methodNames: string[] = [];
  
  // パターン1: import { method1, method2 } from 'module'
  const namedImportMatch = importStatement.match(/import\s*\{\s*([^}]+)\s*\}/);
  if (namedImportMatch) {
    const namedImports = namedImportMatch[1];
    // カンマで分割して個別のimportを処理
    namedImports.split(',').forEach(importItem => {
      const trimmed = importItem.trim();
      // "method as alias" または "method" の形式を処理
      const asMatch = trimmed.match(/(\w+)\s+as\s+(\w+)/);
      if (asMatch) {
        methodNames.push(asMatch[2]); // aliasを使用
      } else {
        const methodMatch = trimmed.match(/(\w+)/);
        if (methodMatch) {
          methodNames.push(methodMatch[1]);
        }
      }
    });
  }
  
  // パターン2: import DefaultMethod from 'module'
  const defaultImportMatch = importStatement.match(/import\s+(\w+)\s+from/);
  if (defaultImportMatch && !importStatement.includes('{')) {
    methodNames.push(defaultImportMatch[1]);
  }
  
  // パターン3: import * as namespace from 'module'
  const namespaceImportMatch = importStatement.match(/import\s*\*\s*as\s+(\w+)/);
  if (namespaceImportMatch) {
    methodNames.push(namespaceImportMatch[1]);
  }
  
  return methodNames;
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
  
  // 2b. Enum検出
  const enumMatches = content.matchAll(/(?:export\s+)?enum\s+(\w+)/g);
  for (const match of enumMatches) {
    if (match[1]) {
      const lineNumber = content.substring(0, match.index).split('\n').length;
      methods.push({
        name: match[1],
        type: 'enum',
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
  
  // 3. 関数宣言とカスタムフック
  const functionMatches = content.matchAll(/(?:export\s+)?(?:default\s+)?function\s+(\w+)/g);
  for (const match of functionMatches) {
    if (match[1]) {
      const lineNumber = content.substring(0, match.index).split('\n').length;
      const functionName = match[1];
      
      // カスタムフックの判定
      const isCustomHook = /^use[A-Z]/.test(functionName);
      
      // Reactコンポーネントの判定
      const isComponent = !isCustomHook && 
                         functionName[0].match(/[A-Z]/) && 
                         file.content.includes('return') && 
                         (file.content.includes('<') && file.content.includes('>'));
      
      let type: 'function' | 'component' | 'custom_hook' = 'function';
      if (isCustomHook) {
        type = 'custom_hook';
      } else if (isComponent) {
        type = 'component';
      }
      
      methods.push({
        name: functionName,
        type,
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
  
  // 4. アロー関数（const Component = () => {...}）とカスタムフック
  const arrowFunctionMatches = content.matchAll(/(?:export\s+)?const\s+(\w+)(?::\s*[^=]+)?\s*=\s*\(/g);
  for (const match of arrowFunctionMatches) {
    if (match[1]) {
      const lineNumber = content.substring(0, match.index).split('\n').length;
      const functionName = match[1];
      
      // カスタムフックの判定
      const isCustomHook = /^use[A-Z]/.test(functionName);
      
      // Reactコンポーネントの判定
      const isComponent = !isCustomHook && 
                         functionName[0].match(/[A-Z]/) && 
                         file.content.includes('return') && 
                         (file.content.includes('<') && file.content.includes('>'));
      
      let type: 'function' | 'component' | 'custom_hook' = 'function';
      if (isCustomHook) {
        type = 'custom_hook';
      } else if (isComponent) {
        type = 'component';
      }
      
      methods.push({
        name: functionName,
        type,
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
      const importStatement = match[0];
      
      // インポートされたメソッド名を抽出
      const importedMethods = extractImportedMethodNames(importStatement);
      
      // インポート使用箇所を検出
      const usageCalls = findImportUsagesWithRegex(file, importStatement);
      
      const importMethod = {
        name: `[Import: ${match[1]}]`,
        type: 'import' as const,
        startLine: lineNumber,
        endLine: lineNumber,
        filePath: file.path,
        code: importStatement,
        calls: usageCalls,
        isPrivate: false,
        parameters: importedMethods.map(p => ({ name: p }))
      };
      
      methods.push(importMethod);
      
      // インポート要素の使用箇所を個別のエントリとして追加
      const usageEntries = createImportUsageEntries(file, importMethod);
      methods.push(...usageEntries);
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
 * インターフェース定義の作成
 */
function createInterfaceDefinition(node: any, file: ParsedFile): Method {
  return {
    name: node.id.name,
    type: 'interface',
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
        parameters: extractParametersFromSignature(member).map(p => ({ name: p }))
      });
    }
  });
  
  return methods;
}

/**
 * Enumの作成
 */
function createEnumMethod(node: any, file: ParsedFile): Method {
  return {
    name: node.id.name,
    type: 'enum',
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
        parameters: extractParametersFromFunction(member.value).map(p => ({ name: p }))
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
    parameters: extractParametersFromFunction(node).map(p => ({ name: p }))
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
          parameters: extractParametersFromFunction(declarator.init).map(p => ({ name: p }))
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
  // インポートする具体的な要素を抽出
  const importedElements: string[] = [];
  const localNames: string[] = [];
  
  if (node.specifiers) {
    node.specifiers.forEach((spec: any) => {
      if (spec.type === 'ImportDefaultSpecifier') {
        importedElements.push(`default as ${spec.local.name}`);
        localNames.push(spec.local.name);
      } else if (spec.type === 'ImportSpecifier') {
        if (spec.imported.name !== spec.local.name) {
          importedElements.push(`${spec.imported.name} as ${spec.local.name}`);
        } else {
          importedElements.push(spec.imported.name);
        }
        localNames.push(spec.local.name);
      } else if (spec.type === 'ImportNamespaceSpecifier') {
        importedElements.push(`* as ${spec.local.name}`);
        localNames.push(spec.local.name);
      }
    });
  }
  
  const importName = importedElements.length > 0 
    ? `[Import: {${importedElements.join(', ')}} from '${node.source.value}']`
    : `[Import: ${node.source.value}]`;
  
  // インポートされた要素の使用箇所を検出
  const usageCalls = findImportUsages(file, localNames, node.loc!.start.line);
  
  return {
    name: importName,
    type: 'import',
    startLine: node.loc!.start.line,
    endLine: node.loc!.end.line,
    filePath: file.path,
    code: getCodeSlice(file.content, node.loc!.start.line, node.loc!.end.line),
    calls: usageCalls,
    isPrivate: false,
    parameters: localNames.map(p => ({ name: p }))
  };
}

/**
 * エクスポートのMethod作成
 */
function createExportMethods(node: any, file: ParsedFile): Method[] {
  const methods: Method[] = [];
  
  if (node.declaration) {
    // export function, export class, export const, etc.
    let exportName = '[Export Declaration]';
    let exportType: Method['type'] = 'export';
    
    if (node.declaration.id && node.declaration.id.name) {
      exportName = `[Export: ${node.declaration.id.name}]`;
    } else if (node.declaration.declarations) {
      // export const a = ..., b = ...
      const names = node.declaration.declarations.map((decl: any) => decl.id.name).join(', ');
      exportName = `[Export: ${names}]`;
    }
    
    methods.push({
      name: exportName,
      type: exportType,
      startLine: node.loc!.start.line,
      endLine: node.loc!.end.line,
      filePath: file.path,
      code: getCodeSlice(file.content, node.loc!.start.line, node.loc!.end.line),
      calls: [],
      isPrivate: false,
      parameters: []
    });
  } else if (node.specifiers) {
    // export { a, b } from './module'
    const exportedElements: string[] = [];
    
    node.specifiers.forEach((spec: any) => {
      if (spec.type === 'ExportSpecifier') {
        if (spec.exported.name !== spec.local.name) {
          exportedElements.push(`${spec.local.name} as ${spec.exported.name}`);
        } else {
          exportedElements.push(spec.local.name);
        }
      }
    });
    
    const exportName = exportedElements.length > 0 
      ? `[Export: {${exportedElements.join(', ')}}${node.source ? ` from '${node.source.value}'` : ''}]`
      : '[Export: re-export]';
    
    methods.push({
      name: exportName,
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
                          /<div|<span|<article|<header|<main|<section/.test(functionCode) || // HTML要素
                          /jsx|JSX/.test(functionCode) || // JSX明示的な記述
                          /React\.createElement/.test(functionCode); // React.createElement
  
  return hasJSXReturn || hasReactPatterns;
}

/**
 * Reactコンポーネントかどうか判定（変数宣言用）
 */
function isReactComponentFunction(declarator: any, fileContent: string): boolean {
  // 型注釈にReact.FCが含まれているかチェック
  if (declarator.id.typeAnnotation && declarator.id.typeAnnotation.typeAnnotation) {
    const typeCode = getCodeSliceFromRange(fileContent, declarator.id.typeAnnotation.range);
    if (typeCode.includes('React.FC') || typeCode.includes('FC<') || typeCode.includes('React.Component')) {
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
                          /<div|<span|<article|<header|<main|<section/.test(functionCode) ||
                          /jsx|JSX/.test(functionCode) ||
                          /React\.createElement/.test(functionCode) ||
                          /use[A-Z]/.test(functionCode); // React Hooks使用
  
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
            parameters: extractParametersFromFunction(arg).map(p => ({ name: p }))
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
        parameters: extractParametersFromSignature(member).map(p => ({ name: p }))
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
        parameters: extractParametersFromFunction(member.value).map(p => ({ name: p }))
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
    parameters: extractParametersFromFunction(node).map(p => ({ name: p }))
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
          parameters: extractParametersFromFunction(declarator.init).map(p => ({ name: p }))
        });
      }
    }
  });
  
  return methods;
}

/**
 * カスタムhooksの抽出
 */
function extractCustomHooks(ast: any, file: ParsedFile, allDefinedMethods?: Set<string>): Method[] {
  const methods: Method[] = [];
  
  traverse(ast, {
    FunctionDeclaration: (node) => {
      if (isCustomHook(node.id?.name)) {
        const methodCalls = extractMethodCalls(node, allDefinedMethods);
        methods.push({
          name: node.id.name,
          type: 'custom_hook',
          startLine: node.loc!.start.line,
          endLine: node.loc!.end.line,
          filePath: file.path,
          code: getCodeSlice(file.content, node.loc!.start.line, node.loc!.end.line),
          calls: methodCalls,
          isPrivate: false,
          parameters: extractParametersFromFunction(node).map(p => ({ name: p }))
        });
      }
    },
    VariableDeclaration: (node) => {
      node.declarations.forEach((declarator: any) => {
        if (declarator.id.type === 'Identifier' && 
            declarator.init && 
            declarator.init.type === 'ArrowFunctionExpression' &&
            isCustomHook(declarator.id.name)) {
          
          const methodCalls = extractMethodCalls(declarator.init, allDefinedMethods);
          methods.push({
            name: declarator.id.name,
            type: 'custom_hook',
            startLine: node.loc!.start.line,
            endLine: node.loc!.end.line,
            filePath: file.path,
            code: getCodeSlice(file.content, node.loc!.start.line, node.loc!.end.line),
            calls: methodCalls,
            isPrivate: false,
            parameters: extractParametersFromFunction(declarator.init).map(p => ({ name: p }))
          });
        }
      });
    }
  });
  
  return methods;
}

/**
 * カスタムhookかどうか判定
 */
function isCustomHook(functionName: string | undefined): boolean {
  if (!functionName) return false;
  
  // useで始まり、次の文字が大文字（Reactのカスタムhook命名規則）
  return /^use[A-Z]/.test(functionName);
}

/**
 * インポートされた要素の使用箇所を検出
 */
function findImportUsages(file: ParsedFile, importedNames: string[], importLine: number): MethodCall[] {
  const calls: MethodCall[] = [];
  const lines = file.content.split('\n');
  
  importedNames.forEach(importedName => {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;
      
      // インポート行自体はスキップ
      if (lineNumber === importLine) continue;
      
      // コメント行をスキップ（より厳密に）
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith('//') || 
          trimmedLine.startsWith('/*') || 
          trimmedLine.startsWith('*') ||
          trimmedLine.endsWith('*/')) {
        continue;
      }
      
      // インライン/ブロックコメントを除去
      let cleanLine = line;
      // 行末コメントを除去
      const lineCommentIndex = cleanLine.indexOf('//');
      if (lineCommentIndex !== -1) {
        cleanLine = cleanLine.substring(0, lineCommentIndex);
      }
      // ブロックコメントを除去（簡易版）
      cleanLine = cleanLine.replace(/\/\*.*?\*\//g, '');
      
      // インポート文はスキップ（より厳密に）
      if (cleanLine.trim().startsWith('import ') && cleanLine.includes('from')) {
        continue;
      }
      
      // 使用パターンを検出
      const usagePatterns = [
        // 1. 関数呼び出し: importedName(...)
        new RegExp(`\\b${escapeRegExp(importedName)}\\s*\\(`, 'g'),
        // 2. JSXコンポーネント: <importedName> または <importedName...>
        new RegExp(`<\\s*${escapeRegExp(importedName)}(?:\\s|>|/)`, 'g'),
        // 3. プロパティアクセス: importedName.something
        new RegExp(`\\b${escapeRegExp(importedName)}\\.\\w+`, 'g'),
        // 4. 変数使用: const x = importedName
        new RegExp(`=\\s*${escapeRegExp(importedName)}\\b`, 'g'),
        // 5. 型注釈: : importedName
        new RegExp(`:\\s*${escapeRegExp(importedName)}\\b`, 'g'),
        // 6. 配列/オブジェクト内: [importedName] or {importedName}
        new RegExp(`[\\[{,]\\s*${escapeRegExp(importedName)}\\s*[\\]},]`, 'g'),
        // 8. スプレッド構文: ...importedName
        new RegExp(`\\.\\.\\.\\s*${escapeRegExp(importedName)}\\b`, 'g'),
        // 7. 引数として渡す: func(importedName)
        new RegExp(`\\(\\s*${escapeRegExp(importedName)}\\s*[,)]`, 'g')
      ];
      
      for (const pattern of usagePatterns) {
        const matches = Array.from(cleanLine.matchAll(pattern));
        if (matches.length > 0) {
          calls.push({
            methodName: importedName,
            line: lineNumber,
            context: line.trim()
          });
          break; // 同じ行で複数パターンがマッチしても一度だけ追加
        }
      }
    }
  });
  
  // 重複を除去
  return calls.filter((call, index, self) =>
    index === self.findIndex(c => c.methodName === call.methodName && c.line === call.line)
  );
}

/**
 * 正規表現用の文字列をエスケープ
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * 正規表現ベースでのインポート使用箇所検出（フォールバック用）
 */
function findImportUsagesWithRegex(file: ParsedFile, importLine: string): MethodCall[] {
  const calls: MethodCall[] = [];
  const lines = file.content.split('\n');
  
  // インポート文から要素名を抽出
  const importMatches = importLine.match(/import\s+(?:{([^}]+)}|(\w+)|\*\s+as\s+(\w+))/);
  if (!importMatches) return calls;
  
  const importedNames: string[] = [];
  
  if (importMatches[1]) {
    // Named imports: import { a, b as c } from '...'
    const namedImports = importMatches[1].split(',').map(item => {
      const match = item.trim().match(/(\w+)(?:\s+as\s+(\w+))?/);
      return match ? (match[2] || match[1]) : '';
    }).filter(Boolean);
    importedNames.push(...namedImports);
  }
  
  if (importMatches[2]) {
    // Default import: import React from '...'
    importedNames.push(importMatches[2]);
  }
  
  if (importMatches[3]) {
    // Namespace import: import * as utils from '...'
    importedNames.push(importMatches[3]);
  }
  
  return findImportUsages(file, importedNames, lines.indexOf(importLine) + 1);
}

/**
 * インポート使用箇所のエントリを作成
 */
function createImportUsageEntries(file: ParsedFile, importMethod: Method): Method[] {
  const usageEntries: Method[] = [];
  
  importMethod.calls.forEach(call => {
    usageEntries.push({
      name: `${call.methodName} (imported)`,
      type: 'import_usage',
      startLine: call.line,
      endLine: call.line,
      filePath: file.path,
      code: call.context || '',
      calls: [], // import_usageは自分自身のimport文を参照すべきではない
      isPrivate: false,
      parameters: [],
      importSource: importMethod.startLine.toString() // これはimport文の行番号（正しい）
    });
  });
  
  return usageEntries;
}

/**
 * ファイルの指定行範囲のコードを取得
 */
function getCodeSlice(content: string, startLine: number, endLine: number): string {
  const lines = content.split('\n');
  return lines.slice(startLine - 1, endLine).join('\n');
}