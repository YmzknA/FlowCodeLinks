/**
 * プラガブルアーキテクチャ移行ガイド
 * 
 * 既存コードを新しいアーキテクチャに段階的に移行するためのガイダンス
 */

import { ParsedFile, Method } from '@/types/codebase';
import { MethodAnalysisEngine, PluginRegistry } from '../index';
import { createAllPlugins } from '../plugins';
import { analyzeMethodsInFile as legacyAnalyzeMethodsInFile } from '../compat';

/**
 * 移行段階の定義
 */
export enum MigrationPhase {
  /** 既存システムのみ使用 */
  LEGACY_ONLY = 'legacy_only',
  /** 新システムを並行実行（比較のみ） */
  PARALLEL_TESTING = 'parallel_testing',
  /** 新システムメイン、既存システムはフォールバック */
  NEW_MAIN_LEGACY_FALLBACK = 'new_main_legacy_fallback',
  /** 新システムのみ使用 */
  NEW_ONLY = 'new_only'
}

/**
 * 移行制御クラス
 */
export class MigrationController {
  private currentPhase: MigrationPhase = MigrationPhase.LEGACY_ONLY;
  private engine: MethodAnalysisEngine | null = null;
  private migrationStats = {
    totalFiles: 0,
    successfulMigrations: 0,
    failedMigrations: 0,
    performanceComparisons: [] as Array<{
      file: string;
      legacyTime: number;
      newTime: number;
      improvement: number;
    }>
  };

  /**
   * 移行段階を設定
   */
  setMigrationPhase(phase: MigrationPhase): void {
    this.currentPhase = phase;
    
    if (phase !== MigrationPhase.LEGACY_ONLY && !this.engine) {
      this.initializeNewEngine();
    }
    
  }

  /**
   * 新しいエンジンを初期化
   */
  private initializeNewEngine(): void {
    const registry = new PluginRegistry();
    const plugins = createAllPlugins();
    
    plugins.forEach(plugin => {
      registry.register(plugin);
    });
    
    this.engine = new MethodAnalysisEngine(registry);
  }

  /**
   * 段階的なメソッド解析
   */
  analyzeFile(file: ParsedFile): Method[] {
    this.migrationStats.totalFiles++;

    switch (this.currentPhase) {
      case MigrationPhase.LEGACY_ONLY:
        return this.analyzeLegacyOnly(file);
      
      case MigrationPhase.PARALLEL_TESTING:
        return this.analyzeParallelTesting(file);
      
      case MigrationPhase.NEW_MAIN_LEGACY_FALLBACK:
        return this.analyzeNewMainLegacyFallback(file);
      
      case MigrationPhase.NEW_ONLY:
        return this.analyzeNewOnly(file);
      
      default:
        console.warn(`Unknown migration phase: ${this.currentPhase}`);
        return this.analyzeLegacyOnly(file);
    }
  }

  /**
   * 既存システムのみで解析
   */
  private analyzeLegacyOnly(file: ParsedFile): Method[] {
    try {
      // 既存のmethod-analyzerを使用
      const { analyzeMethodsInFile } = require('@/utils/method-analyzer');
      return analyzeMethodsInFile(file);
    } catch (error) {
      console.error(`Legacy analysis failed for ${file.path}:`, error);
      return [];
    }
  }

  /**
   * 並行テスト実行
   */
  private analyzeParallelTesting(file: ParsedFile): Method[] {
    if (!this.engine) {
      console.error('New engine not initialized for parallel testing');
      return this.analyzeLegacyOnly(file);
    }

    try {
      // 両方のシステムで解析を実行
      const legacyStart = performance.now();
      const legacyResults = this.analyzeLegacyOnly(file);
      const legacyEnd = performance.now();

      const newStart = performance.now();
      const newResults = this.engine.analyzeFile(file);
      const newEnd = performance.now();

      // パフォーマンス比較
      const legacyTime = legacyEnd - legacyStart;
      const newTime = newEnd - newStart;
      const improvement = ((legacyTime - newTime) / legacyTime) * 100;

      this.migrationStats.performanceComparisons.push({
        file: file.path,
        legacyTime,
        newTime,
        improvement
      });

      // 結果の比較
      const comparison = this.compareResults(legacyResults, newResults, file.path);
      
      if (comparison.isCompatible) {
        this.migrationStats.successfulMigrations++;
      } else {
        this.migrationStats.failedMigrations++;
      }

      // 既存システムの結果を返す（並行テスト段階では既存システムを使用）
      return legacyResults;
    } catch (error) {
      return this.analyzeLegacyOnly(file);
    }
  }

  /**
   * 新システムメイン、既存システムフォールバック
   */
  private analyzeNewMainLegacyFallback(file: ParsedFile): Method[] {
    if (!this.engine) {
      return this.analyzeLegacyOnly(file);
    }

    try {
      const results = this.engine.analyzeFile(file);
      this.migrationStats.successfulMigrations++;
      return results;
    } catch (error) {
      this.migrationStats.failedMigrations++;
      return this.analyzeLegacyOnly(file);
    }
  }

  /**
   * 新システムのみで解析
   */
  private analyzeNewOnly(file: ParsedFile): Method[] {
    if (!this.engine) {
      console.error('New engine not initialized');
      return [];
    }

    try {
      const results = this.engine.analyzeFile(file);
      this.migrationStats.successfulMigrations++;
      return results;
    } catch (error) {
      console.error(`New system analysis failed for ${file.path}:`, error);
      this.migrationStats.failedMigrations++;
      return [];
    }
  }

  /**
   * 結果の比較
   */
  private compareResults(legacyResults: Method[], newResults: Method[], filePath: string): {
    isCompatible: boolean;
    differences: string[];
  } {
    const differences: string[] = [];

    // メソッド数の比較
    if (legacyResults.length !== newResults.length) {
      differences.push(`Method count mismatch: legacy=${legacyResults.length}, new=${newResults.length}`);
    }

    // メソッド名の比較
    const legacyNames = new Set(legacyResults.map(m => m.name));
    const newNames = new Set(newResults.map(m => m.name));

    const missingInNew = [...legacyNames].filter(name => !newNames.has(name));
    const extraInNew = [...newNames].filter(name => !legacyNames.has(name));

    if (missingInNew.length > 0) {
      differences.push(`Missing in new: ${missingInNew.join(', ')}`);
    }

    if (extraInNew.length > 0) {
      differences.push(`Extra in new: ${extraInNew.join(', ')}`);
    }

    // メソッドタイプの比較
    for (const legacyMethod of legacyResults) {
      const newMethod = newResults.find(m => m.name === legacyMethod.name);
      if (newMethod && legacyMethod.type !== newMethod.type) {
        differences.push(`Type mismatch for ${legacyMethod.name}: legacy=${legacyMethod.type}, new=${newMethod.type}`);
      }
    }

    return {
      isCompatible: differences.length === 0,
      differences
    };
  }

  /**
   * 移行統計情報の取得
   */
  getMigrationStats() {
    const avgImprovement = this.migrationStats.performanceComparisons.length > 0
      ? this.migrationStats.performanceComparisons.reduce((sum, comp) => sum + comp.improvement, 0) / this.migrationStats.performanceComparisons.length
      : 0;

    return {
      ...this.migrationStats,
      successRate: (this.migrationStats.successfulMigrations / this.migrationStats.totalFiles) * 100,
      averagePerformanceImprovement: avgImprovement,
      currentPhase: this.currentPhase
    };
  }

  /**
   * 移行統計情報のリセット
   */
  resetStats(): void {
    this.migrationStats = {
      totalFiles: 0,
      successfulMigrations: 0,
      failedMigrations: 0,
      performanceComparisons: []
    };
  }
}

/**
 * グローバル移行制御インスタンス
 */
export const migrationController = new MigrationController();

/**
 * 移行対応版のanalyzeMethodsInFile
 */
export function analyzeMethodsInFile(file: ParsedFile): Method[] {
  return migrationController.analyzeFile(file);
}

/**
 * 移行フェーズの設定ヘルパー
 */
export function setMigrationPhase(phase: MigrationPhase): void {
  migrationController.setMigrationPhase(phase);
}

/**
 * 移行統計情報の取得ヘルパー
 */
export function getMigrationStats() {
  return migrationController.getMigrationStats();
}

/**
 * 移行ガイドライン
 */
export const MIGRATION_GUIDELINES = {
  phase1: {
    title: 'Phase 1: 並行テスト',
    description: '新システムと既存システムを並行実行し、結果を比較',
    action: 'setMigrationPhase(MigrationPhase.PARALLEL_TESTING)',
    duration: '1-2週間',
    criteria: '成功率95%以上、パフォーマンス改善確認'
  },
  phase2: {
    title: 'Phase 2: 段階的移行',
    description: '新システムをメインとし、失敗時は既存システムにフォールバック',
    action: 'setMigrationPhase(MigrationPhase.NEW_MAIN_LEGACY_FALLBACK)',
    duration: '2-3週間',
    criteria: '成功率99%以上、安定運用確認'
  },
  phase3: {
    title: 'Phase 3: 完全移行',
    description: '新システムのみで運用',
    action: 'setMigrationPhase(MigrationPhase.NEW_ONLY)',
    duration: '継続',
    criteria: '既存システムの完全除去'
  }
};

/**
 * 移行レポートの生成
 */
export function generateMigrationReport(): string {
  const stats = migrationController.getMigrationStats();
  
  return `
# プラガブルアーキテクチャ移行レポート

## 現在の状況
- **移行フェーズ**: ${stats.currentPhase}
- **処理ファイル数**: ${stats.totalFiles}
- **成功率**: ${stats.successRate.toFixed(1)}%
- **平均パフォーマンス改善**: ${stats.averagePerformanceImprovement.toFixed(1)}%

## 詳細統計
- 成功: ${stats.successfulMigrations}
- 失敗: ${stats.failedMigrations}
- パフォーマンス比較データ: ${stats.performanceComparisons.length}件

## 推奨アクション
${stats.successRate >= 95 ? '✅ 次の段階に進む準備が整いました' : '⚠️ 成功率の向上が必要です'}

## パフォーマンス改善トップ5
${stats.performanceComparisons
  .sort((a, b) => b.improvement - a.improvement)
  .slice(0, 5)
  .map((comp, i) => `${i + 1}. ${comp.file}: ${comp.improvement.toFixed(1)}%改善`)
  .join('\n')}
`;
}