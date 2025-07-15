#!/usr/bin/env node

/**
 * 継続的品質監視スクリプト
 * 定期的に品質チェックを実行し、アラートを発行
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { main: runQualityGate } = require('./quality-gate');

// 監視設定
const MONITORING_CONFIG = {
  interval: 5 * 60 * 1000, // 5分間隔
  alertThreshold: 80,       // 80点以下でアラート
  historySize: 100,         // 履歴保持数
  alertCooldown: 15 * 60 * 1000, // 15分間のアラート抑制
};

// 品質履歴管理
class QualityHistory {
  constructor() {
    this.historyFile = path.join(process.cwd(), 'quality-history.json');
    this.history = this.loadHistory();
    this.lastAlert = 0;
  }

  loadHistory() {
    try {
      if (fs.existsSync(this.historyFile)) {
        const data = fs.readFileSync(this.historyFile, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.warn('品質履歴の読み込みに失敗しました:', error.message);
    }
    return [];
  }

  saveHistory() {
    try {
      // 履歴サイズ制限
      if (this.history.length > MONITORING_CONFIG.historySize) {
        this.history = this.history.slice(-MONITORING_CONFIG.historySize);
      }
      
      fs.writeFileSync(this.historyFile, JSON.stringify(this.history, null, 2));
    } catch (error) {
      console.error('品質履歴の保存に失敗しました:', error.message);
    }
  }

  addRecord(record) {
    this.history.push({
      ...record,
      timestamp: new Date().toISOString()
    });
    this.saveHistory();
  }

  getLatestRecord() {
    return this.history[this.history.length - 1];
  }

  getTrend(periods = 5) {
    if (this.history.length < periods) {
      return { trend: 'insufficient_data', change: 0 };
    }

    const recent = this.history.slice(-periods);
    const scores = recent.map(record => record.scores.overall);
    
    const firstScore = scores[0];
    const lastScore = scores[scores.length - 1];
    const change = lastScore - firstScore;

    let trend = 'stable';
    if (change > 2) trend = 'improving';
    else if (change < -2) trend = 'declining';

    return { trend, change: change.toFixed(1) };
  }

  getAverageScore(periods = 10) {
    if (this.history.length === 0) return 0;
    
    const recent = this.history.slice(-periods);
    const scores = recent.map(record => record.scores.overall);
    return scores.reduce((sum, score) => sum + score, 0) / scores.length;
  }
}

// アラート管理
class AlertManager {
  constructor() {
    this.alertsFile = path.join(process.cwd(), 'quality-alerts.json');
    this.alerts = this.loadAlerts();
  }

  loadAlerts() {
    try {
      if (fs.existsSync(this.alertsFile)) {
        const data = fs.readFileSync(this.alertsFile, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.warn('アラート履歴の読み込みに失敗しました:', error.message);
    }
    return [];
  }

  saveAlerts() {
    try {
      fs.writeFileSync(this.alertsFile, JSON.stringify(this.alerts, null, 2));
    } catch (error) {
      console.error('アラート履歴の保存に失敗しました:', error.message);
    }
  }

  shouldAlert(score, lastAlertTime) {
    const now = Date.now();
    const isLowScore = score < MONITORING_CONFIG.alertThreshold;
    const cooldownExpired = (now - lastAlertTime) > MONITORING_CONFIG.alertCooldown;
    
    return isLowScore && cooldownExpired;
  }

  sendAlert(type, message, details = {}) {
    const alert = {
      type,
      message,
      details,
      timestamp: new Date().toISOString(),
      severity: this.determineSeverity(type, details)
    };

    this.alerts.push(alert);
    this.saveAlerts();

    // コンソールアラート
    const color = alert.severity === 'high' ? '\x1b[31m' : '\x1b[33m';
    console.log(`${color}🚨 ALERT: ${message}\x1b[0m`);
    
    // 詳細情報表示
    if (details) {
      console.log(`📊 詳細: ${JSON.stringify(details, null, 2)}`);
    }

    // 将来的な拡張: メール、Slack、Webhook等
    // this.sendEmailAlert(alert);
    // this.sendSlackAlert(alert);
    // this.sendWebhookAlert(alert);

    return alert;
  }

  determineSeverity(type, details) {
    switch (type) {
      case 'quality_degradation':
        return details.score < 70 ? 'high' : 'medium';
      case 'build_failure':
        return 'high';
      case 'security_vulnerability':
        return 'high';
      case 'test_failure':
        return 'medium';
      default:
        return 'low';
    }
  }

  getRecentAlerts(hours = 24) {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.alerts.filter(alert => new Date(alert.timestamp) > cutoff);
  }
}

// 品質監視メイン
class QualityMonitor {
  constructor() {
    this.history = new QualityHistory();
    this.alerts = new AlertManager();
    this.isRunning = false;
    this.intervalId = null;
  }

  async runSingleCheck() {
    console.log('\n🔍 品質チェック実行中...');
    
    try {
      // 品質ゲートを実行（サイレントモード）
      const originalExit = process.exit;
      let exitCode = 0;
      process.exit = (code) => { exitCode = code; };
      
      await runQualityGate();
      
      process.exit = originalExit;

      // 結果を読み込み
      const reportPath = path.join(process.cwd(), 'quality-report.json');
      if (fs.existsSync(reportPath)) {
        const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
        
        // 履歴に記録
        this.history.addRecord(report);
        
        // アラートチェック
        await this.checkAlerts(report);
        
        // 統計情報表示
        this.displayStats(report);
        
        return report;
      }
    } catch (error) {
      console.error('品質チェック中にエラーが発生しました:', error.message);
      
      this.alerts.sendAlert('monitoring_error', '品質チェックの実行に失敗しました', {
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  async checkAlerts(report) {
    const score = report.scores.overall;
    const lastAlert = this.history.getLatestRecord();
    const lastAlertTime = lastAlert?.alertTime || 0;

    // 品質低下アラート
    if (this.alerts.shouldAlert(score, lastAlertTime)) {
      const trend = this.history.getTrend();
      
      this.alerts.sendAlert('quality_degradation', `品質スコアが閾値を下回りました: ${score.toFixed(1)}/100`, {
        score,
        threshold: MONITORING_CONFIG.alertThreshold,
        trend,
        failedChecks: report.checks.filter(check => !check.passed)
      });
      
      // アラート時間を記録
      const latestRecord = this.history.getLatestRecord();
      if (latestRecord) {
        latestRecord.alertTime = Date.now();
        this.history.saveHistory();
      }
    }

    // ビルド失敗アラート
    if (!report.results.build.passed) {
      this.alerts.sendAlert('build_failure', 'ビルドが失敗しました', {
        timestamp: new Date().toISOString()
      });
    }

    // セキュリティ脆弱性アラート
    if (report.results.security.vulnerabilities > 0) {
      this.alerts.sendAlert('security_vulnerability', `${report.results.security.vulnerabilities}件の脆弱性が検出されました`, {
        vulnerabilities: report.results.security.vulnerabilities
      });
    }

    // テスト失敗アラート
    if (report.results.testCoverage.coverage < 80) {
      this.alerts.sendAlert('test_failure', `テストカバレッジが不足しています: ${report.results.testCoverage.coverage}%`, {
        coverage: report.results.testCoverage.coverage
      });
    }
  }

  displayStats(report) {
    const trend = this.history.getTrend();
    const averageScore = this.history.getAverageScore();
    const recentAlerts = this.alerts.getRecentAlerts();

    console.log('\n📊 品質統計情報');
    console.log('─'.repeat(40));
    console.log(`現在のスコア: ${report.scores.overall.toFixed(1)}/100`);
    console.log(`平均スコア(過去10回): ${averageScore.toFixed(1)}/100`);
    console.log(`トレンド: ${trend.trend} (${trend.change})`);
    console.log(`過去24時間のアラート: ${recentAlerts.length}件`);
    
    // 詳細スコア
    console.log('\n📋 詳細スコア');
    console.log(`セキュリティ: ${report.scores.security.toFixed(1)}/100`);
    console.log(`アクセシビリティ: ${report.scores.accessibility.toFixed(1)}/100`);
    console.log(`パフォーマンス: ${report.scores.performance.toFixed(1)}/100`);
    console.log(`保守性: ${report.scores.maintainability.toFixed(1)}/100`);
    console.log(`テストカバレッジ: ${report.scores.testCoverage.toFixed(1)}%`);
  }

  start() {
    if (this.isRunning) {
      console.log('品質監視は既に実行中です');
      return;
    }

    this.isRunning = true;
    console.log(`🚀 品質監視を開始しました (間隔: ${MONITORING_CONFIG.interval / 1000}秒)`);
    
    // 初回実行
    this.runSingleCheck();
    
    // 定期実行
    this.intervalId = setInterval(() => {
      this.runSingleCheck();
    }, MONITORING_CONFIG.interval);
  }

  stop() {
    if (!this.isRunning) {
      console.log('品質監視は実行されていません');
      return;
    }

    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    console.log('⏹️  品質監視を停止しました');
  }

  status() {
    console.log('\n📈 品質監視ステータス');
    console.log('─'.repeat(40));
    console.log(`状態: ${this.isRunning ? '実行中' : '停止中'}`);
    console.log(`監視間隔: ${MONITORING_CONFIG.interval / 1000}秒`);
    console.log(`アラート閾値: ${MONITORING_CONFIG.alertThreshold}点`);
    console.log(`履歴保持数: ${this.history.history.length}/${MONITORING_CONFIG.historySize}`);
    
    const recentAlerts = this.alerts.getRecentAlerts();
    console.log(`過去24時間のアラート: ${recentAlerts.length}件`);
    
    if (this.history.history.length > 0) {
      const latest = this.history.getLatestRecord();
      console.log(`最新スコア: ${latest.scores.overall.toFixed(1)}/100`);
      console.log(`最終チェック: ${latest.timestamp}`);
    }
  }
}

// CLI実行
function main() {
  const monitor = new QualityMonitor();
  const command = process.argv[2];

  switch (command) {
    case 'start':
      monitor.start();
      break;
    case 'stop':
      monitor.stop();
      break;
    case 'status':
      monitor.status();
      break;
    case 'check':
      monitor.runSingleCheck();
      break;
    default:
      console.log('品質監視スクリプト');
      console.log('使用方法:');
      console.log('  node quality-monitor.js start  - 監視開始');
      console.log('  node quality-monitor.js stop   - 監視停止');
      console.log('  node quality-monitor.js status - ステータス確認');
      console.log('  node quality-monitor.js check  - 単発チェック');
      break;
  }
}

// Ctrl+C対応
process.on('SIGINT', () => {
  console.log('\n品質監視を停止しています...');
  process.exit(0);
});

if (require.main === module) {
  main();
}

module.exports = { QualityMonitor, QualityHistory, AlertManager };