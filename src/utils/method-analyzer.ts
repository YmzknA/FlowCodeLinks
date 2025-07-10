// このファイルは互換性のためのリダイレクト層として機能します
// 実際の実装は新しいプラガブルアーキテクチャに移行されました

// 既存のインポートをLegacyApiAdapterからの再エクスポートに置き換え
export {
  analyzeMethodsInFile,
  extractAllMethodDefinitions,
  analyzeRubyMethods,
  analyzeErbMethods,
  analyzeJavaScriptMethodsWithFiltering,
  extractRubyMethodDefinitionsOnly,
  extractJavaScriptMethodDefinitionsOnly,
  getAnalysisStatistics,
  getPluginInfo
} from '@/architecture/pluggable/compat/LegacyApiAdapter';

// 型の再エクスポート（互換性維持）
export type { ParsedFile, Method, MethodCall } from '@/types/codebase';