/**
 * メソッド解析エンジン
 * 
 * プラグインシステムの統合点として機能し、既存APIとの互換性を提供
 */

import { ParsedFile, Method } from '@/types/codebase';
import { PluginRegistry } from './PluginRegistry';
import { AnalysisResult } from './interfaces';

export class MethodAnalysisEngine {
  constructor(private registry: PluginRegistry) {}
  
  /**
   * 単一ファイルを解析
   * @param file 解析対象ファイル
   * @returns 検出されたメソッド一覧
   */
  analyzeFile(file: ParsedFile): Method[] {
    const result = this.registry.analyze(file);
    
    // エラーがある場合は警告を出力（開発時のみ）
    // 無効化: 大量のログ出力を防ぐため
    // if (result.errors.length > 0 && process.env.NODE_ENV === 'development') {
    //   console.warn(`Analysis warnings for ${file.path}:`, result.errors);
    // }
    
    return result.methods;
  }
  
  /**
   * 複数ファイルを解析
   * @param files 解析対象ファイル一覧
   * @returns メソッド情報が追加されたファイル一覧
   */
  analyzeFiles(files: ParsedFile[]): ParsedFile[] {
    return files.map(file => ({
      ...file,
      methods: this.analyzeFile(file)
    }));
  }
  
  /**
   * 複数ファイルからメソッド定義を抽出
   * 変数フィルタリングのために使用
   * @param files 解析対象ファイル一覧
   * @returns メソッド名のSet
   */
  extractDefinitions(files: ParsedFile[]): Set<string> {
    const definitions = new Set<string>();
    
    files.forEach(file => {
      const methods = this.analyzeFile(file);
      methods.forEach(method => {
        // 定義タイプのメソッドのみを抽出（呼び出しは除外）
        if (this.isMethodDefinition(method)) {
          definitions.add(method.name);
        }
      });
    });
    
    return definitions;
  }
  
  /**
   * ファイルの解析結果を詳細情報付きで取得
   * @param file 解析対象ファイル
   * @returns 詳細な解析結果
   */
  analyzeFileWithDetails(file: ParsedFile): AnalysisResult {
    return this.registry.analyze(file);
  }
  
  /**
   * 複数ファイルの解析統計情報を取得
   * @param files 解析対象ファイル一覧
   * @returns 解析統計情報
   */
  getAnalysisStatistics(files: ParsedFile[]): AnalysisStatistics {
    const results = files.map(file => this.analyzeFileWithDetails(file));
    
    const totalMethods = results.reduce((sum, result) => sum + result.methods.length, 0);
    const totalErrors = results.reduce((sum, result) => sum + result.errors.length, 0);
    const totalProcessingTime = results.reduce((sum, result) => sum + result.metadata.processingTime, 0);
    const totalLinesProcessed = results.reduce((sum, result) => sum + result.metadata.linesProcessed, 0);
    
    const languageStats = this.calculateLanguageStatistics(files, results);
    
    return {
      totalFiles: files.length,
      totalMethods,
      totalErrors,
      totalProcessingTime,
      totalLinesProcessed,
      averageProcessingTime: totalProcessingTime / files.length,
      languageStats
    };
  }
  
  /**
   * 登録済みプラグインの情報を取得
   * @returns プラグイン情報一覧
   */
  getPluginInfo(): Array<{
    name: string;
    version: string;
    description: string;
    supportedLanguages: string[];
  }> {
    return this.registry.getRegisteredPlugins();
  }
  
  /**
   * メソッドが定義タイプかどうかを判定
   * @param method 判定対象メソッド
   * @returns 定義タイプの場合true
   */
  private isMethodDefinition(method: Method): boolean {
    return method.type === 'function' || 
           method.type === 'method' || 
           method.type === 'class_method' ||
           method.type === 'component';
  }
  
  /**
   * 言語別の統計情報を計算
   * @param files ファイル一覧
   * @param results 解析結果一覧
   * @returns 言語別統計情報
   */
  private calculateLanguageStatistics(
    files: ParsedFile[], 
    results: AnalysisResult[]
  ): Record<string, LanguageStatistics> {
    const languageStats: Record<string, LanguageStatistics> = {};
    
    files.forEach((file, index) => {
      const result = results[index];
      
      if (!languageStats[file.language]) {
        languageStats[file.language] = {
          fileCount: 0,
          methodCount: 0,
          errorCount: 0,
          totalProcessingTime: 0,
          totalLinesProcessed: 0
        };
      }
      
      const stats = languageStats[file.language];
      stats.fileCount++;
      stats.methodCount += result.methods.length;
      stats.errorCount += result.errors.length;
      stats.totalProcessingTime += result.metadata.processingTime;
      stats.totalLinesProcessed += result.metadata.linesProcessed;
    });
    
    return languageStats;
  }
}

/**
 * 解析統計情報
 */
export interface AnalysisStatistics {
  totalFiles: number;
  totalMethods: number;
  totalErrors: number;
  totalProcessingTime: number;
  totalLinesProcessed: number;
  averageProcessingTime: number;
  languageStats: Record<string, LanguageStatistics>;
}

/**
 * 言語別統計情報
 */
export interface LanguageStatistics {
  fileCount: number;
  methodCount: number;
  errorCount: number;
  totalProcessingTime: number;
  totalLinesProcessed: number;
}