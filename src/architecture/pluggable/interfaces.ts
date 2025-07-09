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