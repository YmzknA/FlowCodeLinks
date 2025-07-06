import { ParsedFile } from '@/types/codebase';

/**
 * インポート情報を表すインターface
 */
export interface ImportInfo {
  /** インポートされる名前 */
  importName: string;
  /** インポート元のパス */
  importPath: string;
  /** デフォルトインポートかどうか */
  isDefault: boolean;
  /** 名前空間インポートかどうか */
  isNamespace: boolean;
  /** 行番号 */
  line: number;
}

/**
 * エクスポート情報を表すインターface
 */
export interface ExportInfo {
  /** エクスポートされる名前 */
  exportName: string;
  /** 行番号 */
  line: number;
  /** デフォルトエクスポートかどうか */
  isDefault: boolean;
}

/**
 * TypeScript設定のパスマッピング
 */
export interface TsConfigPaths {
  [key: string]: string[];
}

/**
 * TypeScript設定ファイルの構造
 */
export interface TsConfig {
  compilerOptions?: {
    paths?: TsConfigPaths;
  };
}

/**
 * 相対パスを解決します
 * @param currentPath 現在のファイルパス
 * @param importPath インポートパス
 * @returns 解決されたパス
 */
export function resolveImportPath(file: ParsedFile, importPath: string): string {
  // 最小限の実装：相対パスの基本的な解決
  if (importPath.startsWith('./')) {
    return importPath.replace('./', file.directory + '/');
  }
  if (importPath.startsWith('../')) {
    const pathParts = file.directory.split('/');
    pathParts.pop(); // 一つ上のディレクトリに移動
    return importPath.replace('../', pathParts.join('/') + '/');
  }
  return importPath;
}

/**
 * tsconfig.jsonのpathsを使用してパスを解決します
 * @param file 現在のファイル
 * @param importPath インポートパス
 * @param tsConfig tsconfig.json設定
 * @returns 解決されたパス
 */
export function resolveImportPathWithTsConfig(
  file: ParsedFile, 
  importPath: string, 
  tsConfig: TsConfig
): string {
  // 最小限の実装：基本的なパスマッピング
  if (tsConfig.compilerOptions?.paths) {
    const paths = tsConfig.compilerOptions.paths;
    
    // @/* パターンの処理
    if (importPath.startsWith('@/') && paths['@/*']) {
      return importPath.replace('@/', paths['@/*'][0].replace('*', ''));
    }
    
    // ~/* パターンの処理
    if (importPath.startsWith('~/') && paths['~/*']) {
      return importPath.replace('~/', paths['~/*'][0].replace('*', ''));
    }
  }
  
  return resolveImportPath(file, importPath);
}

/**
 * 外部ライブラリかどうかを判定します
 * @param importPath インポートパス
 * @returns 外部ライブラリの場合true
 */
export function isExternalLibrary(importPath: string): boolean {
  // 最小限の実装：相対パスでない場合は外部ライブラリと判定
  return !importPath.startsWith('./') && !importPath.startsWith('../') && !importPath.startsWith('@/') && !importPath.startsWith('~/');
}

/**
 * 名前空間インポートを解析します
 */
const parseNamespaceImport = (line: string, lineNumber: number): ImportInfo | null => {
  const match = line.match(/import\s*\*\s*as\s+([^from]+)\s+from\s*['"]([^'"]+)['"]/);
  if (!match) return null;
  
  return {
    importName: match[1].trim(),
    importPath: match[2],
    isDefault: false,
    isNamespace: true,
    line: lineNumber
  };
};

/**
 * 名前付きインポートを解析します
 */
const parseNamedImports = (line: string, lineNumber: number): ImportInfo[] => {
  const match = line.match(/import\s*\{\s*([^}]+)\s*\}\s*from\s*['"]([^'"]+)['"]/);
  if (!match) return [];
  
  const importNames = match[1].split(',').map(name => name.trim());
  const importPath = match[2];
  const imports: ImportInfo[] = [];
  
  importNames.forEach(importName => {
    // type importをスキップ
    if (importName.startsWith('type ')) return;
    
    const finalName = importName.includes(' as ') 
      ? importName.split(' as ')[1].trim() 
      : importName;
      
    imports.push({
      importName: finalName,
      importPath,
      isDefault: false,
      isNamespace: false,
      line: lineNumber
    });
  });
  
  return imports;
};

/**
 * デフォルトインポートを解析します
 */
const parseDefaultImport = (line: string, lineNumber: number): ImportInfo | null => {
  const match = line.match(/import\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s+from\s*['"]([^'"]+)['"]/);
  if (!match) return null;
  
  return {
    importName: match[1].trim(),
    importPath: match[2],
    isDefault: true,
    isNamespace: false,
    line: lineNumber
  };
};

/**
 * インポート文を解析します
 * @param file 対象ファイル
 * @returns インポート情報の配列
 */
export function parseImportStatement(file: ParsedFile): ImportInfo[] {
  const imports: ImportInfo[] = [];
  const lines = file.content.split('\n');
  
  lines.forEach((line, index) => {
    const trimmedLine = line.trim();
    if (!trimmedLine.startsWith('import')) return;
    
    const lineNumber = index + 1;
    
    // 名前空間インポート（最初にチェック）
    const namespaceImport = parseNamespaceImport(trimmedLine, lineNumber);
    if (namespaceImport) {
      imports.push(namespaceImport);
      return;
    }
    
    // 名前付きインポート
    const namedImports = parseNamedImports(trimmedLine, lineNumber);
    if (namedImports.length > 0) {
      imports.push(...namedImports);
      return;
    }
    
    // デフォルトインポート
    const defaultImport = parseDefaultImport(trimmedLine, lineNumber);
    if (defaultImport) {
      imports.push(defaultImport);
    }
  });
  
  return imports;
}

/**
 * エクスポート文を検索します
 * @param file 対象ファイル
 * @param exportName エクスポート名
 * @returns エクスポート情報
 */
export function findExportStatement(file: ParsedFile, exportName: string): ExportInfo | null {
  // 最小限の実装：基本的なエクスポート文の検索
  const lines = file.content.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // 名前付きエクスポート
    if (line.includes(`export const ${exportName}`) || line.includes(`export function ${exportName}`)) {
      return {
        exportName,
        line: i + 1,
        isDefault: false
      };
    }
    
    // デフォルトエクスポート
    if (exportName === 'default' && line.includes('export default')) {
      return {
        exportName: 'default',
        line: i + 1,
        isDefault: true
      };
    }
  }
  
  return null;
}

/**
 * インポートジャンプを処理します
 * @param sourceFile ソースファイル
 * @param importName インポート名
 * @param files すべてのファイル
 * @returns ジャンプ先の情報
 */
export function handleImportJump(
  sourceFile: ParsedFile, 
  importName: string, 
  files: ParsedFile[]
): { targetFile: ParsedFile; exportInfo: ExportInfo } | null {
  // 最小限の実装：基本的なジャンプ処理
  const imports = parseImportStatement(sourceFile);
  const targetImport = imports.find(imp => imp.importName === importName);
  
  if (!targetImport) {
    return null;
  }
  
  // 外部ライブラリの場合は処理しない
  if (isExternalLibrary(targetImport.importPath)) {
    return null;
  }
  
  // 対象ファイルを検索
  const resolvedPath = resolveImportPath(sourceFile, targetImport.importPath);
  const targetFile = files.find(f => f.path.includes(resolvedPath));
  
  if (!targetFile) {
    return null;
  }
  
  // エクスポート文を検索
  const exportInfo = findExportStatement(targetFile, importName);
  
  if (!exportInfo) {
    return null;
  }
  
  return { targetFile, exportInfo };
}