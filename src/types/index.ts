// 統一された型定義ファイル

// ======== コードベース解析の型定義 ========

export type Language = 'ruby' | 'javascript' | 'typescript' | 'yaml' | 'markdown' | 'erb' | 'unknown';

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
  type: 'function' | 'method' | 'class_method' | 'erb_call';
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

// ======== Repomixファイルの構造 ========

export interface RepomixFile {
  content: string;
  directoryStructure: string;
  files: RepomixFileEntry[];
}

export interface RepomixFileEntry {
  path: string;
  content: string;
}

// ======== UI用の座標・ウィンドウ情報 ========

export interface WindowPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FloatingWindow {
  id: string;
  file: ParsedFile;
  position: WindowPosition;
  isVisible: boolean;
  isCollapsed: boolean;
  showMethodsOnly: boolean;
}

// ======== メソッドジャンプ機能用の型定義 ========

export interface MethodJumpTarget {
  methodName: string;
  filePath: string;
  lineNumber?: number;
}

// ======== ファイルアップロード機能用の型定義 ========

export interface FileUploadResult {
  content: string;
  isLoading: boolean;
  error: string | null;
}

// ======== 呼び出し元モーダル用の型定義 ========

export interface CallerInfo {
  methodName: string;
  filePath: string;
  lineNumber?: number;
}

export interface CallersModalState {
  isOpen: boolean;
  methodName: string | null;
  callers: CallerInfo[];
  showOpenWindowsOnly: boolean;
}

// ======== グローバル型拡張 ========

declare global {
  interface Window {
    Prism: any;
  }
}

// ======== サイドバー・レイアウト用の型定義 ========

export interface SidebarProps {
  files: ParsedFile[];
  visibleFiles: string[];
  highlightedMethod: MethodJumpTarget | null;
  onFileToggle: (filePath: string) => void;
  onShowAll: () => void;
  onHideAll: () => void;
  onMethodHighlight: (method: MethodJumpTarget) => void;
  onClearHighlight: () => void;
  onDirectoryToggle: (directoryPath: string) => void;
  sidebarWidth: number;
}

// ======== 依存関係線描画用の型定義 ========

export interface DependencyLinesProps {
  windows: FloatingWindow[];
  dependencies: Dependency[];
  highlightedMethod: MethodJumpTarget | null;
  zoom: number;
  pan: { x: number; y: number };
  sidebarCollapsed: boolean;
  sidebarWidth: number;
  onMethodJump: (method: MethodJumpTarget) => void;
}

// ======== レイアウトマネージャー用の型定義 ========

export interface LayoutManagerProps {
  files: ParsedFile[];
  dependencies: Dependency[];
  onFileToggle: (filePath: string) => void;
  onWindowsUpdate: (windows: FloatingWindow[]) => void;
  zoom: number;
  highlightedMethod: MethodJumpTarget | null;
  onMethodClick: (methodName: string, currentFilePath: string) => any;
}

// ======== ズーム可能キャンバス用の型定義 ========

export interface ZoomableCanvasProps {
  className?: string;
  children: React.ReactNode;
  onZoomChange: (zoom: number) => void;
  onPanChange: (pan: { x: number; y: number }) => void;
  externalPan: { x: number; y: number } | null;
}

// ======== エラーバウンダリ用の型定義 ========

export interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error?: Error }>;
}

// ======== パフォーマンス最適化用の型定義 ========

export interface OptimizedAnalysisCache {
  fileMap: Map<string, ParsedFile>;
  methodMap: Map<string, Method>;
  lastUpdated: number;
}

export interface OptimizedDependenciesResult {
  visible: Dependency[];
  hidden: Dependency[];
  total: number;
}

// ======== 検索・フィルタリング用の型定義 ========

export interface SearchResult {
  type: 'file' | 'method' | 'directory';
  title: string;
  subtitle?: string;
  filePath?: string;
  methodName?: string;
  directoryPath?: string;
}

export interface SearchState {
  query: string;
  results: SearchResult[];
  selectedIndex: number;
  isOpen: boolean;
}