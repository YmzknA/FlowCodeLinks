/**
 * 互換性レイヤーのエントリポイント
 * 
 * 既存コードからの移行を簡単にするためのエクスポート集約
 */

// 既存API互換関数
export {
  analyzeMethodsInFile,
  extractAllMethodDefinitions,
  extractRubyMethodDefinitionsOnly,
  analyzeRubyMethods,
  analyzeErbMethods,
  analyzeJavaScriptMethodsWithFiltering,
  extractJavaScriptMethodDefinitionsOnly,
  getAnalysisStatistics,
  getPluginInfo,
  getAnalysisEngine,
  resetAnalysisEngine
} from './LegacyApiAdapter';

// 型の再エクスポート
export type { ParsedFile, Method, MethodCall } from '@/types/codebase';