/**
 * プラグイン管理システム
 * 
 * プラグインの登録、検索、実行を担当する中核クラス
 */

import { ParsedFile } from '@/types/codebase';
import { MethodAnalysisPlugin, AnalysisResult, AnalysisError } from './interfaces';

export class PluginRegistry {
  private plugins: Map<string, MethodAnalysisPlugin> = new Map();
  /** 言語から対応プラグインへの高速マッピング（O(1)検索用） */
  private languageMap: Map<string, MethodAnalysisPlugin> = new Map();
  /** サポートする全言語リスト */
  private static readonly SUPPORTED_LANGUAGES = [
    'ruby', 'javascript', 'typescript', 'tsx', 'erb', 
    'js', 'ts', 'rb', 'html.erb'
  ];
  
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
      // 既存の言語マッピングをクリア
      this.clearLanguageMappingForPlugin(plugin.name);
    }
    
    this.plugins.set(plugin.name, plugin);
    
    // 言語マッピングを事前構築（O(1)検索用）
    this.buildLanguageMapping(plugin);
  }
  
  /**
   * 指定言語に対応するプラグインを検索（O(1)高速検索）
   * @param language 言語名
   * @returns 対応するプラグイン、見つからない場合はnull
   */
  findPlugin(language: string): MethodAnalysisPlugin | null {
    // 高速マップから直接検索
    const plugin = this.languageMap.get(language);
    if (plugin) {
      return plugin;
    }
    
    // フォールバック: 線形検索（新しい言語や動的登録対応）
    for (const plugin of this.plugins.values()) {
      if (plugin.supports(language)) {
        // 見つかった場合はマッピングに追加
        this.languageMap.set(language, plugin);
        return plugin;
      }
    }
    
    return null;
  }
  
  /**
   * プラグインの言語マッピングを構築
   */
  private buildLanguageMapping(plugin: MethodAnalysisPlugin): void {
    for (const language of PluginRegistry.SUPPORTED_LANGUAGES) {
      if (plugin.supports(language)) {
        this.languageMap.set(language, plugin);
      }
    }
  }
  
  /**
   * 指定プラグインの言語マッピングをクリア
   */
  private clearLanguageMappingForPlugin(pluginName: string): void {
    const entries = Array.from(this.languageMap.entries());
    for (const [language, plugin] of entries) {
      if (plugin.name === pluginName) {
        this.languageMap.delete(language);
      }
    }
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
      
      // milestones_controller.rbのshowメソッドでprepare_meta_tagsが含まれる場合のみデバッグ
      if (file.path.includes('milestones_controller.rb')) {
        const showMethod = result.methods.find(m => m.name === 'show');
        if (showMethod) {
          console.log(`🔍 [PLUGIN REGISTRY] analyze result for milestones_controller.rb show method:`);
          console.log(`  - Plugin used: ${plugin.name}`);
          console.log(`  - Method calls found:`, showMethod.calls.map(c => c.methodName));
          console.log(`  - Contains prepare_meta_tags:`, showMethod.calls.some(c => c.methodName === 'prepare_meta_tags'));
        }
      }
      
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