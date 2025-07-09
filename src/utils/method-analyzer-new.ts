/**
 * Method Analyzer - New Architecture Integration Layer
 * 
 * 既存のAPIとの互換性を保ちながら、新しいパーサーアーキテクチャを使用
 * 段階的な移行のために、既存のmethod-analyzer.tsを置き換える準備版
 */

import { ParsedFile, Method } from '@/types/codebase';
import { methodAnalysisService } from '@/services/MethodAnalysisService';

/**
 * ファイル内のメソッドを解析（既存APIの互換実装）
 * 
 * @param file - 解析対象ファイル
 * @param allDefinedMethods - 全ファイルの定義済みメソッド一覧（変数フィルタリング用）
 * @returns 解析されたメソッド一覧
 */
export function analyzeMethodsInFile(file: ParsedFile, allDefinedMethods?: Set<string>): Method[] {
  // 新しいサービスにリダイレクト
  return methodAnalysisService.analyzeFile(file, allDefinedMethods);
}

/**
 * 複数ファイルからメソッド定義名の一覧を抽出（既存APIの互換実装）
 * 
 * @param files - 対象ファイル一覧
 * @returns メソッド名のSet
 */
export function extractAllMethodDefinitions(files: ParsedFile[]): Set<string> {
  // 新しいサービスにリダイレクト
  return methodAnalysisService.extractAllMethodDefinitions(files);
}

/**
 * 新しいアーキテクチャの統計情報を取得（デバッグ用）
 */
export function getParserStatistics() {
  return methodAnalysisService.getStatistics();
}

/**
 * 新しいアーキテクチャが使用可能かチェック（デバッグ用）
 */
export function isNewArchitectureAvailable(): boolean {
  try {
    const stats = methodAnalysisService.getStatistics();
    return stats.isInitialized && stats.supportedLanguages.length > 0;
  } catch (error) {
    return false;
  }
}

// 既存の内部関数群も互換性のためにエクスポート
// ただし、新しいアーキテクチャでは非推奨

/**
 * @deprecated 新しいアーキテクチャでは MethodAnalysisService を使用してください
 */
export function analyzeRubyMethods(file: ParsedFile, allDefinedMethods?: Set<string>): Method[] {
  console.warn('analyzeRubyMethods is deprecated. Use MethodAnalysisService instead.');
  return analyzeMethodsInFile(file, allDefinedMethods);
}

/**
 * @deprecated 新しいアーキテクチャでは MethodAnalysisService を使用してください
 */
export function analyzeJavaScriptMethods(file: ParsedFile): Method[] {
  console.warn('analyzeJavaScriptMethods is deprecated. Use MethodAnalysisService instead.');
  return analyzeMethodsInFile(file);
}

/**
 * @deprecated 新しいアーキテクチャでは MethodAnalysisService を使用してください
 */
export function analyzeTypeScriptMethods(file: ParsedFile): Method[] {
  console.warn('analyzeTypeScriptMethods is deprecated. Use MethodAnalysisService instead.');
  return analyzeMethodsInFile(file);
}

/**
 * @deprecated 新しいアーキテクチャでは MethodAnalysisService を使用してください
 */
export function analyzeErbMethods(file: ParsedFile, allDefinedMethods?: Set<string>): Method[] {
  console.warn('analyzeErbMethods is deprecated. Use MethodAnalysisService instead.');
  return analyzeMethodsInFile(file, allDefinedMethods);
}

// 互換性確保のための型エクスポート
export type { ParsedFile, Method } from '@/types/codebase';