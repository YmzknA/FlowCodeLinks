/**
 * プラグイン管理システム
 * 
 * プラグインの登録、検索、実行を担当する中核クラス
 */

import { ParsedFile } from '@/types/codebase';
import { MethodAnalysisPlugin, AnalysisResult, AnalysisError } from './interfaces';

export class PluginRegistry {
  private plugins: Map<string, MethodAnalysisPlugin> = new Map();
  
  /**
   * プラグインを登録
   * @param plugin 登録するプラグイン
   * @throws プラグインが無効な場合
   */
  register(plugin: MethodAnalysisPlugin): void {
    // プラグインの有効性検証
    this.validatePlugin(plugin);
    
    // 既存プラグインの重複チェック
    if (this.plugins.has(plugin.name)) {
      console.warn(`Plugin ${plugin.name} is already registered. Overwriting...`);
    }
    
    this.plugins.set(plugin.name, plugin);
    console.log(`✅ Plugin registered: ${plugin.name} v${plugin.version}`);
  }
  
  /**
   * 指定言語に対応するプラグインを検索
   * @param language 言語名
   * @returns 対応するプラグイン、見つからない場合はnull
   */
  findPlugin(language: string): MethodAnalysisPlugin | null {
    for (const plugin of this.plugins.values()) {
      if (plugin.supports(language)) {
        return plugin;
      }
    }
    return null;
  }
  
  /**
   * ファイルを解析
   * @param file 解析対象ファイル
   * @returns 解析結果
   */
  analyze(file: ParsedFile): AnalysisResult {
    const plugin = this.findPlugin(file.language);
    
    if (!plugin) {
      return this.createUnsupportedLanguageResult(file);
    }
    
    const startTime = performance.now();
    
    try {
      const result = plugin.analyze(file);
      const endTime = performance.now();
      
      // 処理時間をメタデータに追加
      return {
        ...result,
        metadata: {
          ...result.metadata,
          processingTime: endTime - startTime,
          engine: plugin.name
        }
      };
      
    } catch (error) {
      const endTime = performance.now();
      
      return {
        methods: [],
        errors: [{
          message: `Plugin ${plugin.name} failed: ${error instanceof Error ? error.message : String(error)}`,
          type: 'runtime',
          severity: 'error'
        }],
        metadata: {
          processingTime: endTime - startTime,
          linesProcessed: 0,
          engine: plugin.name
        }
      };
    }
  }
  
  /**
   * 登録済みプラグインの一覧を取得
   * @returns プラグイン情報の配列
   */
  getRegisteredPlugins(): Array<{
    name: string;
    version: string;
    description: string;
    supportedLanguages: string[];
  }> {
    return Array.from(this.plugins.values()).map(plugin => ({
      name: plugin.name,
      version: plugin.version,
      description: plugin.description,
      supportedLanguages: this.getSupportedLanguages(plugin)
    }));
  }
  
  /**
   * 全プラグインを削除（テスト用）
   */
  clear(): void {
    this.plugins.clear();
  }
  
  /**
   * プラグインの有効性を検証
   * @param plugin 検証対象プラグイン
   * @throws プラグインが無効な場合
   */
  private validatePlugin(plugin: MethodAnalysisPlugin): void {
    if (!plugin.name || typeof plugin.name !== 'string') {
      throw new Error('Plugin name must be a non-empty string');
    }
    
    if (!plugin.version || typeof plugin.version !== 'string') {
      throw new Error('Plugin version must be a non-empty string');
    }
    
    if (!plugin.description || typeof plugin.description !== 'string') {
      throw new Error('Plugin description must be a non-empty string');
    }
    
    if (typeof plugin.supports !== 'function') {
      throw new Error('Plugin must implement supports method');
    }
    
    if (typeof plugin.analyze !== 'function') {
      throw new Error('Plugin must implement analyze method');
    }
  }
  
  /**
   * 未サポート言語用の結果を作成
   * @param file 解析対象ファイル
   * @returns エラー結果
   */
  private createUnsupportedLanguageResult(file: ParsedFile): AnalysisResult {
    return {
      methods: [],
      errors: [{
        message: `Unsupported language: ${file.language}`,
        type: 'validation',
        severity: 'error'
      }],
      metadata: {
        processingTime: 0,
        linesProcessed: 0
      }
    };
  }
  
  /**
   * プラグインがサポートする言語の一覧を取得
   * @param plugin 対象プラグイン
   * @returns サポート言語の配列
   */
  private getSupportedLanguages(plugin: MethodAnalysisPlugin): string[] {
    const commonLanguages = ['ruby', 'javascript', 'typescript', 'tsx', 'erb', 'python', 'java', 'csharp'];
    return commonLanguages.filter(lang => plugin.supports(lang));
  }
}