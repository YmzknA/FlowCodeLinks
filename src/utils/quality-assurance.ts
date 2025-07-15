/**
 * 品質保証フレームワーク
 * 統一された品質チェック、監視、改善のメカニズムを提供
 */

import { StructuredError, ErrorFactory, createErrorContext } from './error';
import React from 'react';

// 品質スコア型定義
export interface QualityScore {
  security: number;        // セキュリティスコア (0-100)
  accessibility: number;   // アクセシビリティスコア (0-100)
  performance: number;     // パフォーマンススコア (0-100)
  maintainability: number; // 保守性スコア (0-100)
  overall: number;         // 総合スコア (0-100)
  gate: 'PASS' | 'FAIL';   // 品質ゲート結果
  threshold: number;       // 品質ゲート閾値
}

// 品質メトリクス
export interface QualityMetrics {
  security: SecurityMetrics;
  accessibility: AccessibilityMetrics;
  performance: PerformanceMetrics;
  maintainability: MaintainabilityMetrics;
}

export interface SecurityMetrics {
  vulnerabilities: number;
  securityScore: number;
  policyViolations: number;
  authenticationFailures: number;
  rateLimitExceeded: number;
}

export interface AccessibilityMetrics {
  wcagViolations: number;
  accessibilityScore: number;
  keyboardNavigationIssues: number;
  screenReaderIssues: number;
  colorContrastIssues: number;
}

export interface PerformanceMetrics {
  loadTime: number;
  memoryUsage: number;
  performanceScore: number;
  bundleSize: number;
  renderTime: number;
}

export interface MaintainabilityMetrics {
  codeComplexity: number;
  testCoverage: number;
  technicalDebt: number;
  maintainabilityScore: number;
  codeSmells: number;
}

// 品質チェック結果
export interface QualityCheckResult {
  passed: boolean;
  score: number;
  issues: QualityIssue[];
  recommendations: QualityRecommendation[];
  timestamp: number;
}

export interface QualityIssue {
  id: string;
  type: 'security' | 'accessibility' | 'performance' | 'maintainability';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  file?: string;
  line?: number;
  column?: number;
  rule?: string;
  fix?: string;
}

export interface QualityRecommendation {
  id: string;
  type: 'improvement' | 'optimization' | 'refactoring' | 'upgrade';
  priority: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  impact: string;
  effort: 'low' | 'medium' | 'high';
  implementation: string;
}

// 品質保証設定
export interface QualityAssuranceConfig {
  thresholds: {
    security: number;
    accessibility: number;
    performance: number;
    maintainability: number;
    overall: number;
  };
  checks: {
    security: boolean;
    accessibility: boolean;
    performance: boolean;
    maintainability: boolean;
  };
  reporting: {
    enabled: boolean;
    format: 'json' | 'html' | 'console';
    detailed: boolean;
  };
  monitoring: {
    enabled: boolean;
    interval: number;
    alerts: boolean;
  };
}

// 品質保証クラス
export class QualityAssuranceManager {
  private config: QualityAssuranceConfig;
  private metrics: QualityMetrics;
  private lastCheck: Date | null = null;
  
  constructor(config: QualityAssuranceConfig) {
    this.config = config;
    this.metrics = this.initializeMetrics();
  }
  
  /**
   * 包括的品質チェック実行
   */
  async runQualityCheck(component?: string): Promise<QualityCheckResult> {
    const startTime = Date.now();
    const issues: QualityIssue[] = [];
    const recommendations: QualityRecommendation[] = [];
    
    try {
      // セキュリティチェック
      if (this.config.checks.security) {
        const securityResult = await this.checkSecurity(component);
        issues.push(...securityResult.issues);
        recommendations.push(...securityResult.recommendations);
      }
      
      // アクセシビリティチェック
      if (this.config.checks.accessibility) {
        const accessibilityResult = await this.checkAccessibility(component);
        issues.push(...accessibilityResult.issues);
        recommendations.push(...accessibilityResult.recommendations);
      }
      
      // パフォーマンスチェック
      if (this.config.checks.performance) {
        const performanceResult = await this.checkPerformance(component);
        issues.push(...performanceResult.issues);
        recommendations.push(...performanceResult.recommendations);
      }
      
      // 保守性チェック
      if (this.config.checks.maintainability) {
        const maintainabilityResult = await this.checkMaintainability(component);
        issues.push(...maintainabilityResult.issues);
        recommendations.push(...maintainabilityResult.recommendations);
      }
      
      // 品質スコア計算
      const qualityScore = this.calculateQualityScore(this.metrics);
      
      const result: QualityCheckResult = {
        passed: qualityScore.gate === 'PASS',
        score: qualityScore.overall,
        issues,
        recommendations,
        timestamp: Date.now()
      };
      
      this.lastCheck = new Date();
      
      // レポート出力
      if (this.config.reporting.enabled) {
        this.generateReport(result, qualityScore);
      }
      
      return result;
      
    } catch (error) {
      const structuredError = ErrorFactory.create(
        '品質チェック実行中にエラーが発生しました',
        'high',
        'system',
        '品質チェックを完了できませんでした',
        [
          {
            label: '再実行',
            action: () => this.runQualityCheck(component),
            primary: true
          }
        ],
        createErrorContext('QualityAssuranceManager', 'runQualityCheck'),
        error instanceof Error ? error.message : String(error)
      );
      
      throw structuredError;
    }
  }
  
  /**
   * セキュリティチェック
   */
  private async checkSecurity(component?: string): Promise<{ issues: QualityIssue[], recommendations: QualityRecommendation[] }> {
    const issues: QualityIssue[] = [];
    const recommendations: QualityRecommendation[] = [];
    
    // セキュリティメトリクス更新
    this.metrics.security.vulnerabilities = 0;
    this.metrics.security.policyViolations = 0;
    
    // 基本的なセキュリティチェック
    if (typeof window !== 'undefined') {
      // HTTPSチェック
      if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
        issues.push({
          id: 'security-001',
          type: 'security',
          severity: 'high',
          message: 'HTTPSが使用されていません',
          rule: 'require-https',
          fix: 'HTTPSを有効にしてください'
        });
        this.metrics.security.vulnerabilities++;
      }
      
      // CSPヘッダーチェック（簡易）
      const metaCSP = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
      if (!metaCSP) {
        recommendations.push({
          id: 'security-rec-001',
          type: 'improvement',
          priority: 'medium',
          title: 'Content Security Policy の追加',
          description: 'CSPヘッダーを追加してXSS攻撃を防止',
          impact: 'セキュリティ向上',
          effort: 'low',
          implementation: 'HTMLにCSPメタタグを追加'
        });
      }
    }
    
    // セキュリティスコア計算
    this.metrics.security.securityScore = Math.max(0, 100 - (this.metrics.security.vulnerabilities * 20));
    
    return { issues, recommendations };
  }
  
  /**
   * アクセシビリティチェック
   */
  private async checkAccessibility(component?: string): Promise<{ issues: QualityIssue[], recommendations: QualityRecommendation[] }> {
    const issues: QualityIssue[] = [];
    const recommendations: QualityRecommendation[] = [];
    
    // アクセシビリティメトリクス更新
    this.metrics.accessibility.wcagViolations = 0;
    this.metrics.accessibility.keyboardNavigationIssues = 0;
    
    if (typeof window !== 'undefined' && component) {
      const element = document.querySelector(`[data-component="${component}"]`);
      if (element) {
        // ARIA属性チェック
        const buttons = element.querySelectorAll('button');
        buttons.forEach((button, index) => {
          if (!button.getAttribute('aria-label') && !button.textContent?.trim()) {
            issues.push({
              id: `accessibility-001-${index}`,
              type: 'accessibility',
              severity: 'medium',
              message: 'ボタンにaria-labelまたはテキストが必要です',
              rule: 'button-has-accessible-name',
              fix: 'aria-label属性またはテキストを追加してください'
            });
            this.metrics.accessibility.wcagViolations++;
          }
        });
        
        // フォーカス可能要素チェック
        const focusableElements = element.querySelectorAll('button, input, select, textarea, a[href]');
        focusableElements.forEach((el, index) => {
          const tabIndex = el.getAttribute('tabindex');
          if (tabIndex === '-1' && !el.hasAttribute('disabled')) {
            recommendations.push({
              id: `accessibility-rec-001-${index}`,
              type: 'improvement',
              priority: 'medium',
              title: 'キーボードナビゲーションの改善',
              description: 'タブインデックスを適切に設定',
              impact: 'キーボードユーザーの利便性向上',
              effort: 'low',
              implementation: 'tabindex属性を削除またはtabindex="0"に設定'
            });
          }
        });
      }
    }
    
    // アクセシビリティスコア計算
    this.metrics.accessibility.accessibilityScore = Math.max(0, 100 - (this.metrics.accessibility.wcagViolations * 10));
    
    return { issues, recommendations };
  }
  
  /**
   * パフォーマンスチェック
   */
  private async checkPerformance(component?: string): Promise<{ issues: QualityIssue[], recommendations: QualityRecommendation[] }> {
    const issues: QualityIssue[] = [];
    const recommendations: QualityRecommendation[] = [];
    
    // パフォーマンスメトリクス更新
    if (typeof window !== 'undefined' && 'performance' in window) {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navigation) {
        this.metrics.performance.loadTime = navigation.loadEventEnd - navigation.loadEventStart;
        this.metrics.performance.renderTime = navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart;
      }
      
      // メモリ使用量チェック
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        this.metrics.performance.memoryUsage = memory.usedJSHeapSize;
        
        // メモリ使用量が多い場合の警告
        if (memory.usedJSHeapSize > 50 * 1024 * 1024) { // 50MB
          issues.push({
            id: 'performance-001',
            type: 'performance',
            severity: 'medium',
            message: 'メモリ使用量が多すぎます',
            rule: 'memory-usage-limit',
            fix: 'メモリリークを確認し、不要なオブジェクトを削除してください'
          });
        }
      }
      
      // 読み込み時間チェック
      if (this.metrics.performance.loadTime > 3000) { // 3秒
        issues.push({
          id: 'performance-002',
          type: 'performance',
          severity: 'high',
          message: '読み込み時間が長すぎます',
          rule: 'load-time-limit',
          fix: 'コード分割、遅延読み込み、圧縮を検討してください'
        });
      }
    }
    
    // パフォーマンススコア計算
    const loadTimeScore = Math.max(0, 100 - (this.metrics.performance.loadTime / 100));
    const memoryScore = Math.max(0, 100 - (this.metrics.performance.memoryUsage / (1024 * 1024)));
    this.metrics.performance.performanceScore = (loadTimeScore + memoryScore) / 2;
    
    return { issues, recommendations };
  }
  
  /**
   * 保守性チェック
   */
  private async checkMaintainability(component?: string): Promise<{ issues: QualityIssue[], recommendations: QualityRecommendation[] }> {
    const issues: QualityIssue[] = [];
    const recommendations: QualityRecommendation[] = [];
    
    // 保守性メトリクス更新（簡易実装）
    this.metrics.maintainability.codeComplexity = 5; // 実際にはAST解析が必要
    this.metrics.maintainability.testCoverage = 80; // 実際にはカバレッジレポートから取得
    this.metrics.maintainability.technicalDebt = 3; // 実際にはSonarQubeなどから取得
    this.metrics.maintainability.codeSmells = 2;
    
    // コード複雑度チェック
    if (this.metrics.maintainability.codeComplexity > 10) {
      issues.push({
        id: 'maintainability-001',
        type: 'maintainability',
        severity: 'medium',
        message: '循環的複雑度が高すぎます',
        rule: 'complexity-limit',
        fix: '関数を小さく分割してください'
      });
    }
    
    // テストカバレッジチェック
    if (this.metrics.maintainability.testCoverage < 80) {
      recommendations.push({
        id: 'maintainability-rec-001',
        type: 'improvement',
        priority: 'high',
        title: 'テストカバレッジの向上',
        description: 'テストカバレッジを80%以上に向上させる',
        impact: 'バグ発見率向上、保守性向上',
        effort: 'medium',
        implementation: '不足しているテストケースを追加'
      });
    }
    
    // 保守性スコア計算
    const complexityScore = Math.max(0, 100 - (this.metrics.maintainability.codeComplexity * 5));
    const coverageScore = this.metrics.maintainability.testCoverage;
    const debtScore = Math.max(0, 100 - (this.metrics.maintainability.technicalDebt * 10));
    this.metrics.maintainability.maintainabilityScore = (complexityScore + coverageScore + debtScore) / 3;
    
    return { issues, recommendations };
  }
  
  /**
   * 品質スコア計算
   */
  private calculateQualityScore(metrics: QualityMetrics): QualityScore {
    const overall = (
      metrics.security.securityScore * 0.3 +
      metrics.accessibility.accessibilityScore * 0.25 +
      metrics.performance.performanceScore * 0.25 +
      metrics.maintainability.maintainabilityScore * 0.2
    );
    
    return {
      security: metrics.security.securityScore,
      accessibility: metrics.accessibility.accessibilityScore,
      performance: metrics.performance.performanceScore,
      maintainability: metrics.maintainability.maintainabilityScore,
      overall,
      gate: overall >= this.config.thresholds.overall ? 'PASS' : 'FAIL',
      threshold: this.config.thresholds.overall
    };
  }
  
  /**
   * レポート生成
   */
  private generateReport(result: QualityCheckResult, score: QualityScore): void {
    if (this.config.reporting.format === 'console') {
      console.group('🎯 品質チェック結果');
      console.log(`総合スコア: ${score.overall.toFixed(1)}/100 (${score.gate})`);
      console.log(`セキュリティ: ${score.security.toFixed(1)}/100`);
      console.log(`アクセシビリティ: ${score.accessibility.toFixed(1)}/100`);
      console.log(`パフォーマンス: ${score.performance.toFixed(1)}/100`);
      console.log(`保守性: ${score.maintainability.toFixed(1)}/100`);
      
      if (result.issues.length > 0) {
        console.group('🚨 検出された問題');
        result.issues.forEach(issue => {
          console.warn(`[${issue.severity.toUpperCase()}] ${issue.message}`);
        });
        console.groupEnd();
      }
      
      if (result.recommendations.length > 0) {
        console.group('💡 改善提案');
        result.recommendations.forEach(rec => {
          console.info(`[${rec.priority.toUpperCase()}] ${rec.title}: ${rec.description}`);
        });
        console.groupEnd();
      }
      
      console.groupEnd();
    }
  }
  
  /**
   * メトリクス初期化
   */
  private initializeMetrics(): QualityMetrics {
    return {
      security: {
        vulnerabilities: 0,
        securityScore: 100,
        policyViolations: 0,
        authenticationFailures: 0,
        rateLimitExceeded: 0
      },
      accessibility: {
        wcagViolations: 0,
        accessibilityScore: 100,
        keyboardNavigationIssues: 0,
        screenReaderIssues: 0,
        colorContrastIssues: 0
      },
      performance: {
        loadTime: 0,
        memoryUsage: 0,
        performanceScore: 100,
        bundleSize: 0,
        renderTime: 0
      },
      maintainability: {
        codeComplexity: 0,
        testCoverage: 100,
        technicalDebt: 0,
        maintainabilityScore: 100,
        codeSmells: 0
      }
    };
  }
  
  /**
   * 現在の品質メトリクスを取得
   */
  getMetrics(): QualityMetrics {
    return { ...this.metrics };
  }
  
  /**
   * 最後のチェック日時を取得
   */
  getLastCheckTime(): Date | null {
    return this.lastCheck;
  }
}

// デフォルト品質保証設定
export const DEFAULT_QA_CONFIG: QualityAssuranceConfig = {
  thresholds: {
    security: 85,
    accessibility: 90,
    performance: 80,
    maintainability: 85,
    overall: 85
  },
  checks: {
    security: true,
    accessibility: true,
    performance: true,
    maintainability: true
  },
  reporting: {
    enabled: true,
    format: 'console',
    detailed: true
  },
  monitoring: {
    enabled: true,
    interval: 60000, // 1分
    alerts: true
  }
};

// 高品質設定
export const HIGH_QUALITY_CONFIG: QualityAssuranceConfig = {
  ...DEFAULT_QA_CONFIG,
  thresholds: {
    security: 95,
    accessibility: 95,
    performance: 90,
    maintainability: 90,
    overall: 92
  }
};

// デフォルト品質保証マネージャー
export const defaultQualityManager = new QualityAssuranceManager(DEFAULT_QA_CONFIG);

// 品質保証済みコンポーネント型
export type QualityAssured<T> = T & {
  readonly __qualityAssured: true;
  readonly __securityValidated: true;
  readonly __accessibilityValidated: true;
  readonly __performanceValidated: true;
};

// 品質保証フック
export function useQualityAssurance(componentName: string) {
  const [qualityScore, setQualityScore] = React.useState<QualityScore | null>(null);
  const [isChecking, setIsChecking] = React.useState(false);
  
  const runCheck = React.useCallback(async () => {
    setIsChecking(true);
    try {
      const result = await defaultQualityManager.runQualityCheck(componentName);
      const metrics = defaultQualityManager.getMetrics();
      const score = {
        security: metrics.security.securityScore,
        accessibility: metrics.accessibility.accessibilityScore,
        performance: metrics.performance.performanceScore,
        maintainability: metrics.maintainability.maintainabilityScore,
        overall: result.score,
        gate: result.passed ? 'PASS' as const : 'FAIL' as const,
        threshold: DEFAULT_QA_CONFIG.thresholds.overall
      };
      setQualityScore(score);
    } catch (error) {
      console.error('品質チェック失敗:', error);
    } finally {
      setIsChecking(false);
    }
  }, [componentName]);
  
  React.useEffect(() => {
    // 初回チェック
    runCheck();
    
    // 定期チェック
    const interval = setInterval(runCheck, DEFAULT_QA_CONFIG.monitoring.interval);
    
    return () => clearInterval(interval);
  }, [runCheck]);
  
  return {
    qualityScore,
    isChecking,
    runCheck
  };
}