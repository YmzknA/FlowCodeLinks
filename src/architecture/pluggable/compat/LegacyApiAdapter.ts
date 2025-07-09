/**
 * 既存API互換性アダプター
 * 
 * 既存のmethod-analyzer.tsのAPIを新しいプラガブルアーキテクチャで実装
 * 既存コードを一切変更せずに新システムに移行可能
 */

import { ParsedFile, Method } from '@/types/codebase';
import { MethodAnalysisEngine, PluginRegistry } from '../index';
import { createAllPlugins } from '../plugins';

/**
 * シングルトンのメソッド解析エンジン
 * 既存コードからの呼び出しに対応
 */
class LegacyAnalysisEngine {
  private static instance: MethodAnalysisEngine | null = null;
  
  static getInstance(): MethodAnalysisEngine {
    if (!this.instance) {
      const registry = new PluginRegistry();
      const plugins = createAllPlugins();
      
      plugins.forEach(plugin => {
        registry.register(plugin);
      });
      
      this.instance = new MethodAnalysisEngine(registry);
      
      if (process.env.NODE_ENV === 'development') {
        console.log('🔌 Pluggable architecture initialized with legacy compatibility');
      }
    }
    
    return this.instance;
  }
  
  static reset(): void {
    this.instance = null;
  }
}

/**
 * 既存API: ファイル内のメソッドを解析
 * 
 * @param file 解析対象ファイル
 * @param allDefinedMethods 全ファイルの定義済みメソッド一覧（変数フィルタリング用）
 * @returns 解析されたメソッド一覧
 */
export function analyzeMethodsInFile(file: ParsedFile, allDefinedMethods?: Set<string>): Method[] {
  const engine = LegacyAnalysisEngine.getInstance();
  
  try {
    // 新システムでは allDefinedMethods の処理が内部で行われるため
    // 互換性のために一旦既存の動作を再現
    return engine.analyzeFile(file);
  } catch (error) {
    console.error(`Legacy API compatibility error for ${file.path}:`, error);
    return [];
  }
}

/**
 * 既存API: 全ファイルからメソッド定義名の一覧を抽出
 * 
 * @param files 対象ファイル一覧
 * @returns メソッド名のSet
 */
export function extractAllMethodDefinitions(files: ParsedFile[]): Set<string> {
  const engine = LegacyAnalysisEngine.getInstance();
  
  try {
    return engine.extractDefinitions(files);
  } catch (error) {
    console.error('Legacy API compatibility error for method definitions extraction:', error);
    return new Set<string>();
  }
}

/**
 * 既存API: Rubyファイルからメソッド定義のみを抽出（呼び出し検出なし）
 * 
 * @deprecated 新アーキテクチャでは analyzeMethodsInFile を使用してください
 */
export function extractRubyMethodDefinitionsOnly(file: ParsedFile): Method[] {
  console.warn('extractRubyMethodDefinitionsOnly is deprecated. Use analyzeMethodsInFile instead.');
  const engine = LegacyAnalysisEngine.getInstance();
  
  try {
    const methods = engine.analyzeFile(file);
    // 定義のみを返すため、callsを空にする
    return methods.map(method => ({
      ...method,
      calls: []
    }));
  } catch (error) {
    console.error(`Legacy Ruby definitions extraction error for ${file.path}:`, error);
    return [];
  }
}

/**
 * 既存API: Rubyメソッド解析
 * 
 * @deprecated 新アーキテクチャでは analyzeMethodsInFile を使用してください
 */
export function analyzeRubyMethods(file: ParsedFile, allDefinedMethods?: Set<string>): Method[] {
  console.warn('analyzeRubyMethods is deprecated. Use analyzeMethodsInFile instead.');
  return analyzeMethodsInFile(file, allDefinedMethods);
}

/**
 * 既存API: ERBメソッド解析
 * 
 * @deprecated 新アーキテクチャでは analyzeMethodsInFile を使用してください
 */
export function analyzeErbMethods(file: ParsedFile, allDefinedMethods?: Set<string>): Method[] {
  console.warn('analyzeErbMethods is deprecated. Use analyzeMethodsInFile instead.');
  return analyzeMethodsInFile(file, allDefinedMethods);
}

/**
 * 既存API: JavaScriptメソッド解析（フィルタリング付き）
 * 
 * @deprecated 新アーキテクチャでは analyzeMethodsInFile を使用してください
 */
export function analyzeJavaScriptMethodsWithFiltering(file: ParsedFile, allDefinedMethods?: Set<string>): Method[] {
  console.warn('analyzeJavaScriptMethodsWithFiltering is deprecated. Use analyzeMethodsInFile instead.');
  return analyzeMethodsInFile(file, allDefinedMethods);
}

/**
 * 既存API: JavaScriptメソッド定義のみを抽出
 * 
 * @deprecated 新アーキテクチャでは analyzeMethodsInFile を使用してください
 */
export function extractJavaScriptMethodDefinitionsOnly(file: ParsedFile): Method[] {
  console.warn('extractJavaScriptMethodDefinitionsOnly is deprecated. Use analyzeMethodsInFile instead.');
  return extractRubyMethodDefinitionsOnly(file); // 同じロジックを使用
}

/**
 * 新機能: 解析統計情報の取得
 * 
 * @param files 解析対象ファイル一覧
 * @returns 詳細な解析統計情報
 */
export function getAnalysisStatistics(files: ParsedFile[]) {
  const engine = LegacyAnalysisEngine.getInstance();
  return engine.getAnalysisStatistics(files);
}

/**
 * 新機能: 登録済みプラグイン情報の取得
 * 
 * @returns プラグイン情報一覧
 */
export function getPluginInfo() {
  const engine = LegacyAnalysisEngine.getInstance();
  return engine.getPluginInfo();
}

/**
 * デバッグ用: エンジンインスタンスの取得
 * 
 * @returns MethodAnalysisEngine インスタンス
 */
export function getAnalysisEngine(): MethodAnalysisEngine {
  return LegacyAnalysisEngine.getInstance();
}

/**
 * テスト用: エンジンのリセット
 */
export function resetAnalysisEngine(): void {
  LegacyAnalysisEngine.reset();
}

// TypeScript型の再エクスポート（既存コードとの互換性）
export type { ParsedFile, Method, MethodCall } from '@/types/codebase';