/**
 * Method Analysis Service
 * 
 * 新しいパーサーシステムの統合レイヤー
 * 既存のAPIとの互換性を保ちながら、新しいアーキテクチャを提供
 */

import { ParsedFile, Method } from '@/types/codebase';
import { LanguageParserFactory, initializeAllParsers } from '@/parsers/base/LanguageParserFactory';

/**
 * メソッド解析サービス（シングルトン）
 */
export class MethodAnalysisService {
  private static instance: MethodAnalysisService;
  private isInitialized = false;
  
  // 段階的移行のためのフラグ
  private useNewArchitecture = false;
  private enabledLanguages = new Set<string>(); // 新アーキテクチャを有効にする言語

  private constructor() {
    this.initializeParsers();
    this.initializeFeatureFlags();
  }

  /**
   * 機能フラグの初期化
   */
  private initializeFeatureFlags(): void {
    // 環境変数またはデフォルト設定で新アーキテクチャの有効化を制御
    const enableNewArch = process.env.ENABLE_NEW_PARSER_ARCHITECTURE === 'true';
    const enabledLangs = process.env.NEW_PARSER_LANGUAGES?.split(',') || [];
    
    this.useNewArchitecture = enableNewArch;
    this.enabledLanguages = new Set(enabledLangs);
    
    // テスト環境では特定の言語のみ有効化（段階的テスト用）
    if (process.env.NODE_ENV === 'test' && process.env.TEST_NEW_PARSER_ONLY) {
      this.useNewArchitecture = true;
      this.enabledLanguages = new Set(['ruby', 'erb']); // まずRubyとERBのみ
    }
  }

  static getInstance(): MethodAnalysisService {
    if (!this.instance) {
      this.instance = new MethodAnalysisService();
    }
    return this.instance;
  }

  /**
   * パーサーの初期化
   */
  private initializeParsers(): void {
    if (!this.isInitialized) {
      try {
        initializeAllParsers();
        this.isInitialized = true;
      } catch (error) {
        console.error('Failed to initialize parsers:', error);
        // フォールバック: 空のパーサーファクトリを使用
        this.isInitialized = false;
      }
    }
  }

  /**
   * ファイル内のメソッドを解析（メインAPI）
   * 
   * @param file - 解析対象ファイル
   * @param allDefinedMethods - 全ファイルの定義済みメソッド一覧（変数フィルタリング用）
   * @returns 解析されたメソッド一覧
   */
  analyzeFile(file: ParsedFile, allDefinedMethods?: Set<string>): Method[] {
    // 新アーキテクチャを使用するかどうかの判定
    if (this.shouldUseNewArchitecture(file.language)) {
      try {
        const parser = LanguageParserFactory.create(file.language);
        if (parser) {
          return parser.analyzeFile(file, allDefinedMethods);
        }
      } catch (error) {
        console.warn(`New architecture analysis failed for ${file.path}:`, error);
      }
    }

    // デフォルトまたはフォールバック：レガシーシステムを使用
    return this.fallbackToLegacyAnalysis(file, allDefinedMethods);
  }

  /**
   * ファイルからメソッド定義のみを抽出
   * 
   * @param file - 解析対象ファイル
   * @returns メソッド定義一覧
   */
  extractDefinitions(file: ParsedFile): Method[] {
    // 新アーキテクチャを使用するかどうかの判定
    if (this.shouldUseNewArchitecture(file.language)) {
      try {
        const parser = LanguageParserFactory.create(file.language);
        if (parser) {
          return parser.extractDefinitions(file);
        }
      } catch (error) {
        console.warn(`New architecture definition extraction failed for ${file.path}:`, error);
      }
    }

    // デフォルトまたはフォールバック：レガシーシステムを使用
    return this.fallbackToLegacyDefinitionExtraction(file);
  }

  /**
   * 複数ファイルからメソッド定義名の一覧を抽出
   * 
   * @param files - 対象ファイル一覧
   * @returns メソッド名のSet
   */
  extractAllMethodDefinitions(files: ParsedFile[]): Set<string> {
    const methodNames = new Set<string>();
    
    for (const file of files) {
      try {
        const methods = this.extractDefinitions(file);
        methods.forEach(method => methodNames.add(method.name));
      } catch (error) {
        console.warn(`Failed to extract definitions from ${file.path}:`, error);
        continue;
      }
    }
    
    return methodNames;
  }

  /**
   * サポートされている言語一覧を取得
   */
  getSupportedLanguages(): string[] {
    return LanguageParserFactory.getSupportedLanguages();
  }

  /**
   * 新アーキテクチャを使用するかどうかの判定
   */
  private shouldUseNewArchitecture(language: string): boolean {
    return this.useNewArchitecture && this.enabledLanguages.has(language);
  }

  /**
   * 新アーキテクチャを有効化（テスト・デバッグ用）
   */
  enableNewArchitecture(languages?: string[]): void {
    this.useNewArchitecture = true;
    if (languages) {
      this.enabledLanguages = new Set(languages);
    }
  }

  /**
   * 新アーキテクチャを無効化（テスト・デバッグ用）
   */
  disableNewArchitecture(): void {
    this.useNewArchitecture = false;
    this.enabledLanguages.clear();
  }

  /**
   * 統計情報を取得
   */
  getStatistics(): {
    supportedLanguages: string[];
    parserStatus: any;
    isInitialized: boolean;
    newArchitecture: {
      enabled: boolean;
      enabledLanguages: string[];
    };
  } {
    return {
      supportedLanguages: this.getSupportedLanguages(),
      parserStatus: LanguageParserFactory.getDebugInfo(),
      isInitialized: this.isInitialized,
      newArchitecture: {
        enabled: this.useNewArchitecture,
        enabledLanguages: Array.from(this.enabledLanguages)
      }
    };
  }

  /**
   * レガシーシステムへのフォールバック（解析）
   */
  private fallbackToLegacyAnalysis(file: ParsedFile, allDefinedMethods?: Set<string>): Method[] {
    // デバッグ用：新アーキテクチャが有効な場合のみ警告を表示
    if (this.useNewArchitecture) {
      console.warn(`Falling back to legacy analysis for ${file.language}: ${file.path}`);
    }
    
    try {
      // 遅延ロードで既存のmethod-analyzerを呼び出し
      const { analyzeMethodsInFile } = require('@/utils/method-analyzer');
      return analyzeMethodsInFile(file, allDefinedMethods);
    } catch (error) {
      console.error('Legacy fallback also failed:', error);
      return [];
    }
  }

  /**
   * レガシーシステムへのフォールバック（定義抽出）
   */
  private fallbackToLegacyDefinitionExtraction(file: ParsedFile): Method[] {
    // デバッグ用：新アーキテクチャが有効な場合のみ警告を表示
    if (this.useNewArchitecture) {
      console.warn(`Falling back to legacy definition extraction for ${file.language}: ${file.path}`);
    }
    
    try {
      // 遅延ロードで既存のmethod-analyzerを呼び出し
      const { analyzeMethodsInFile } = require('@/utils/method-analyzer');
      // 呼び出し検出なしでメソッド定義のみ抽出
      const allMethods = analyzeMethodsInFile(file);
      return allMethods.map(method => ({
        ...method,
        calls: [] // 定義抽出時は呼び出し情報は不要
      }));
    } catch (error) {
      console.error('Legacy definition extraction fallback also failed:', error);
      return [];
    }
  }
}

/**
 * サービスインスタンスのエクスポート
 */
export const methodAnalysisService = MethodAnalysisService.getInstance();