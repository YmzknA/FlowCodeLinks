// コードベース解析のための型定義

export type Language = 'ruby' | 'javascript' | 'typescript' | 'yaml' | 'markdown' | 'unknown';

export interface ParsedFile {
  path: string;
  language: Language;
  content: string;
  code?: string; // 動的ウィンドウサイズ計算用（content と同じ内容）
  directory: string;
  fileName: string;
  methods: Method[];
  totalLines: number; // ファイルの総行数
}

export interface Method {
  name: string;
  type: 'function' | 'method' | 'class_method';
  startLine: number;
  endLine: number;
  filePath: string;
  code: string;
  calls: MethodCall[];
  isPrivate: boolean;
  parameters: string[];
  returnType?: string;
}

export interface MethodCall {
  methodName: string;
  line: number;
  context: string; // 呼び出し周辺のコード
}

export interface Dependency {
  from: {
    methodName: string;
    filePath: string;
  };
  to: {
    methodName: string;
    filePath: string;
  };
  count: number; // 呼び出し回数
  type: 'internal' | 'external'; // 同一ファイル内 or 外部ファイル
  fromLine?: number; // 呼び出し元の行番号
  toLine?: number; // 呼び出し先の行番号
}

export interface CodebaseAnalysis {
  files: ParsedFile[];
  methods: Method[];
  dependencies: Dependency[];
  stats: {
    totalFiles: number;
    totalMethods: number;
    totalDependencies: number;
    languageBreakdown: Record<Language, number>;
  };
}

// Repomixファイルの構造
export interface RepomixFile {
  content: string;
  directoryStructure: string;
  files: RepomixFileEntry[];
}

export interface RepomixFileEntry {
  path: string;
  content: string;
}

// UI用の座標情報
export interface WindowPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

// スクロール情報を表す型
export interface ScrollInfo {
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
  visibleStartRatio: number; // 表示開始位置の割合 (0-1)
  visibleEndRatio: number; // 表示終了位置の割合 (0-1)
}

export interface FloatingWindow {
  id: string;
  file: ParsedFile;
  position: WindowPosition;
  isVisible: boolean;
  isCollapsed: boolean;
  showMethodsOnly: boolean;
  scrollInfo?: ScrollInfo; // スクロール情報
}