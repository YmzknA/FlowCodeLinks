/**
 * Language Parser Base Interface
 * 
 * 全言語パーサーの基盤となるインターフェース
 * 新しい言語対応時はこのインターフェースを実装するだけで対応可能
 */

import { ParsedFile, Method } from '@/types/codebase';

/**
 * 言語パーサーの基本インターフェース
 */
export interface LanguageParser {
  /**
   * 対応言語名
   */
  readonly language: string;

  /**
   * ファイルからメソッド定義とメソッド呼び出しを解析
   * 
   * @param file - 解析対象ファイル
   * @param allDefinedMethods - 全ファイルの定義済みメソッド一覧（変数フィルタリング用）
   * @returns 解析されたメソッド一覧
   */
  analyzeFile(file: ParsedFile, allDefinedMethods?: Set<string>): Method[];

  /**
   * ファイルからメソッド定義のみを抽出（変数フィルタリング用）
   * 
   * @param file - 解析対象ファイル
   * @returns メソッド定義一覧
   */
  extractDefinitions(file: ParsedFile): Method[];

  /**
   * パーサーが指定言語をサポートしているかチェック
   * 
   * @param language - 言語名
   * @returns サポートしている場合true
   */
  supports(language: string): boolean;
}

/**
 * パース結果の型
 */
export interface ParseResult {
  /** 検出されたメソッド定義 */
  readonly definitions: readonly Method[];
  /** 検出されたメソッド呼び出し */
  readonly calls: readonly Method[];
  /** パースエラー */
  readonly errors: readonly ParseError[];
}

/**
 * パースエラー情報
 */
export interface ParseError {
  /** エラーメッセージ */
  readonly message: string;
  /** エラー発生行番号 */
  readonly line?: number;
  /** エラーの種類 */
  readonly type: 'syntax' | 'extraction' | 'validation';
}

/**
 * 抽象基底クラス（共通ロジックを提供）
 */
export abstract class BaseLanguageParser implements LanguageParser {
  abstract readonly language: string;

  supports(language: string): boolean {
    return this.language === language;
  }

  abstract analyzeFile(file: ParsedFile, allDefinedMethods?: Set<string>): Method[];
  abstract extractDefinitions(file: ParsedFile): Method[];

  /**
   * ファイル内容の前処理（空ファイル・不正ファイルのチェック）
   */
  protected validateFile(file: ParsedFile): boolean {
    return file.content.trim().length > 0 && this.supports(file.language);
  }

  /**
   * エラーハンドリング付きでメソッドを実行
   */
  protected safeExecute<T>(operation: () => T, fallback: T): T {
    try {
      return operation();
    } catch (error) {
      console.warn(`Parser error in ${this.language}:`, error);
      return fallback;
    }
  }
}