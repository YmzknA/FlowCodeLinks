/**
 * プラガブルアーキテクチャのエントリポイント
 * 
 * 外部からの使用を想定したAPI集約
 */

// 核となるインターフェース
export type {
  MethodAnalysisPlugin,
  AnalysisResult,
  AnalysisError,
  AnalysisMetadata
} from './interfaces';

// 主要クラス
export { PluginRegistry } from './PluginRegistry';
export { MethodAnalysisEngine } from './MethodAnalysisEngine';
export type { AnalysisStatistics, LanguageStatistics } from './MethodAnalysisEngine';

// 型のインポート
import { MethodAnalysisPlugin } from './interfaces';
import { PluginRegistry } from './PluginRegistry';
import { MethodAnalysisEngine } from './MethodAnalysisEngine';

// 利便性のためのファクトリ関数
export function createAnalysisEngine(): MethodAnalysisEngine {
  const registry = new PluginRegistry();
  return new MethodAnalysisEngine(registry);
}

// デバッグ用のヘルパー関数
export function createEngineWithPlugins(plugins: MethodAnalysisPlugin[]): MethodAnalysisEngine {
  const registry = new PluginRegistry();
  
  plugins.forEach(plugin => {
    registry.register(plugin);
  });
  
  return new MethodAnalysisEngine(registry);
}