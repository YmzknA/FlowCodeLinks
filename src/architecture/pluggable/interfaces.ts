/**
 * プラガブルアーキテクチャの核となるインターフェース定義
 * 
 * 人間の可読性を最優先に設計された、シンプルで一貫性のあるインターフェース
 */

import { ParsedFile, Method } from '@/types/codebase';

/**
 * 解析プラグインの統一インターフェース
 * 
 * 全ての言語解析プラグインが実装すべき基本契約
 */
export interface MethodAnalysisPlugin {
  /** プラグイン名 (例: 'ruby', 'javascript') */
  readonly name: string;
  
  /** バージョン番号 (例: '1.0.0') */
  readonly version: string;
  
  /** 人間が読む説明文 */
  readonly description: string;
  
  /**
   * 指定された言語をサポートするかどうかを判定
   * @param language 言語名
   * @returns サポートする場合true
   */
  supports(language: string): boolean;
  
  /**
   * ファイルを解析してメソッド情報を抽出
   * @param file 解析対象ファイル
   * @returns 解析結果
   */
  analyze(file: ParsedFile): AnalysisResult;
}

/**
 * プラグインによる解析結果の統一型
 */
export interface AnalysisResult {
  /** 検出されたメソッド一覧 */
  methods: Method[];
  
  /** 発生したエラー一覧 */
  errors: AnalysisError[];
  
  /** 解析のメタデータ */
  metadata: AnalysisMetadata;
}

/**
 * 解析エラー情報
 */
export interface AnalysisError {
  /** エラーメッセージ */
  message: string;
  
  /** エラー発生行番号（省略可能） */
  line?: number;
  
  /** エラーの種類 */
  type: 'syntax' | 'extraction' | 'validation' | 'runtime';
  
  /** エラーの重要度 */
  severity: 'error' | 'warning' | 'info';
}

/**
 * 解析メタデータ
 */
export interface AnalysisMetadata {
  /** 処理時間（ミリ秒） */
  processingTime: number;
  
  /** 処理した行数 */
  linesProcessed: number;
  
  /** 使用した解析エンジン */
  engine?: string;
  
  /** 追加情報 */
  additionalInfo?: Record<string, unknown>;
}

/**
 * ファイル検証設定
 */
export interface FileValidationConfig {
  /** 最大ファイルサイズ（バイト）デフォルト: 10MB */
  maxFileSize?: number;
  
  /** 最大行数 デフォルト: 100,000行 */
  maxLines?: number;
  
  /** 許可されるファイル拡張子 */
  allowedExtensions?: string[];
  
  /** パス検証を有効にするか */
  enablePathValidation?: boolean;
}

/**
 * ファイル検証結果
 */
export interface FileValidationResult {
  /** 検証が成功したか */
  isValid: boolean;
  
  /** 検証エラー一覧 */
  errors: string[];
  
  /** 警告一覧 */
  warnings: string[];
}

/**
 * ファイルサイズとパス検証関数
 */
export function validateFile(
  file: ParsedFile,
  config: FileValidationConfig = {}
): FileValidationResult {
  const {
    maxFileSize = 10 * 1024 * 1024, // 10MB
    maxLines = 100000,
    allowedExtensions = ['.rb', '.js', '.ts', '.tsx', '.erb', '.html.erb'],
    enablePathValidation = true
  } = config;

  const errors: string[] = [];
  const warnings: string[] = [];

  // ファイルサイズチェック
  if (file.content.length > maxFileSize) {
    errors.push(
      `File size ${file.content.length} bytes exceeds maximum allowed size ${maxFileSize} bytes (${(maxFileSize / 1024 / 1024).toFixed(1)}MB)`
    );
  }

  // 行数チェック
  const lineCount = file.content.split('\n').length;
  if (lineCount > maxLines) {
    errors.push(
      `File has ${lineCount} lines, exceeding maximum allowed ${maxLines} lines`
    );
  }

  // ファイル拡張子チェック
  const fileExtension = getFileExtension(file.path);
  if (allowedExtensions.length > 0 && !allowedExtensions.includes(fileExtension)) {
    warnings.push(
      `File extension '${fileExtension}' is not in allowed list: ${allowedExtensions.join(', ')}`
    );
  }

  // パス検証
  if (enablePathValidation) {
    const pathValidation = validateFilePath(file.path);
    if (!pathValidation.isValid) {
      errors.push(...pathValidation.errors);
    }
  }

  // メモリ使用量警告
  const estimatedMemoryMB = file.content.length / 1024 / 1024;
  if (estimatedMemoryMB > 5) {
    warnings.push(
      `Large file (${estimatedMemoryMB.toFixed(1)}MB) may impact performance`
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * ファイルパス検証関数
 */
export function validateFilePath(filePath: string): FileValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // null/undefined チェック
  if (!filePath || typeof filePath !== 'string') {
    errors.push('File path is null, undefined, or not a string');
    return { isValid: false, errors, warnings };
  }

  // 危険なパスパターンのチェック
  const dangerousPatterns = [
    { pattern: /\.\.[\\/]|\.\.%2[fF]/i, message: 'Path traversal detected' },
    { pattern: /^~[\\/]/, message: 'Home directory access' },
    { pattern: /\x00/, message: 'Null byte injection' },
    { pattern: /^\/etc/, message: 'Path accesses system configuration directory' },
    { pattern: /^\/proc/, message: 'Path accesses system process directory' },
    { pattern: /^\/sys/, message: 'Path accesses system directory' },
    { pattern: /[\x00-\x1f]/, message: 'Path contains control characters' },
    { pattern: /[<>:"|?*]/, message: 'Path contains invalid characters' }
  ];

  for (const { pattern, message } of dangerousPatterns) {
    if (pattern.test(filePath)) {
      errors.push(message);
    }
  }

  // パス長制限
  if (filePath.length > 260) {
    warnings.push(`Path length ${filePath.length} exceeds recommended maximum of 260 characters`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * ファイル拡張子を取得
 */
function getFileExtension(filePath: string): string {
  if (!filePath) return '';
  
  // .html.erb のような複合拡張子を考慮
  if (filePath.endsWith('.html.erb')) {
    return '.html.erb';
  }
  
  const lastDotIndex = filePath.lastIndexOf('.');
  return lastDotIndex === -1 ? '' : filePath.substring(lastDotIndex);
}