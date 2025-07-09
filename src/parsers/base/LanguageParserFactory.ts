/**
 * Language Parser Factory
 * 
 * ファクトリパターンによる言語パーサーの生成・管理
 * 新しい言語対応時はここにパーサーを登録するだけで対応可能
 */

import { LanguageParser } from './LanguageParser';
import { Language } from '@/types/codebase';

/**
 * 言語パーサーファクトリ
 */
export class LanguageParserFactory {
  private static parsers = new Map<string, () => LanguageParser>();
  private static instances = new Map<string, LanguageParser>();

  /**
   * パーサーを登録（シングルトンパターン）
   * 
   * @param language - 対応言語
   * @param parserFactory - パーサー生成関数
   */
  static registerParser(language: string, parserFactory: () => LanguageParser): void {
    this.parsers.set(language, parserFactory);
  }

  /**
   * 指定言語のパーサーを取得
   * 
   * @param language - 言語名
   * @returns 対応するパーサー、対応していない場合はnull
   */
  static create(language: Language): LanguageParser | null {
    // 既存インスタンスがあれば再利用
    if (this.instances.has(language)) {
      return this.instances.get(language)!;
    }

    // 新規作成
    const parserFactory = this.parsers.get(language);
    if (!parserFactory) {
      console.warn(`No parser registered for language: ${language}`);
      return null;
    }

    try {
      const parser = parserFactory();
      this.instances.set(language, parser);
      return parser;
    } catch (error) {
      console.error(`Failed to create parser for ${language}:`, error);
      return null;
    }
  }

  /**
   * サポートされている言語一覧を取得
   * 
   * @returns サポート言語の配列
   */
  static getSupportedLanguages(): string[] {
    return Array.from(this.parsers.keys());
  }

  /**
   * 指定言語がサポートされているかチェック
   * 
   * @param language - チェック対象の言語
   * @returns サポートされている場合true
   */
  static isSupported(language: string): boolean {
    return this.parsers.has(language);
  }

  /**
   * 全パーサーをクリア（テスト用）
   */
  static clear(): void {
    this.parsers.clear();
    this.instances.clear();
  }

  /**
   * デバッグ情報を取得
   */
  static getDebugInfo(): {
    registeredParsers: string[];
    activeInstances: string[];
  } {
    return {
      registeredParsers: Array.from(this.parsers.keys()),
      activeInstances: Array.from(this.instances.keys())
    };
  }
}

/**
 * パーサー登録用のデコレータ（将来的な拡張用）
 */
export function RegisterParser(language: string) {
  return function(target: new () => LanguageParser) {
    LanguageParserFactory.registerParser(language, () => new target());
  };
}

/**
 * 全パーサーの一括登録関数
 * アプリケーション起動時に呼び出される
 */
export function initializeAllParsers(): void {
  // 遅延インポートでパーサーを登録
  // これにより、使用されるパーサーのみがロードされる
  
  // Ruby パーサー
  LanguageParserFactory.registerParser('ruby', () => {
    const { RubyMethodParser } = require('../ruby/RubyMethodParser');
    return new RubyMethodParser();
  });

  // ERB パーサー  
  LanguageParserFactory.registerParser('erb', () => {
    const { ErbMethodParser } = require('../ruby/ErbMethodParser');
    return new ErbMethodParser();
  });

  // JavaScript パーサー
  LanguageParserFactory.registerParser('javascript', () => {
    const { JavaScriptMethodParser } = require('../javascript/JavaScriptMethodParser');
    return new JavaScriptMethodParser();
  });

  // TypeScript パーサー
  LanguageParserFactory.registerParser('typescript', () => {
    const { TypeScriptMethodParser } = require('../typescript/TypeScriptMethodParser');
    return new TypeScriptMethodParser();
  });

  // TSX パーサー
  LanguageParserFactory.registerParser('tsx', () => {
    const { TypeScriptMethodParser } = require('../typescript/TypeScriptMethodParser');
    return new TypeScriptMethodParser();
  });
}