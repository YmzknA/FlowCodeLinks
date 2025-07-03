# Code Visualizer

GitHubリポジトリのコードを可視化し、メソッド間の関係を線で表示するWebアプリケーション

## 🚀 Quick Start

### 前提条件
- Docker & Docker Compose

### 開発環境起動
```bash
# リポジトリクローン後
cd code_reading

# Docker環境起動
docker-compose up -d

# ブラウザでアクセス
open http://localhost:3000
```

### テスト実行
```bash
# テスト実行
docker-compose exec app npm test

# テスト監視モード
docker-compose exec app npm run test:watch
```

## 📋 プロジェクト情報

### 開発状況
- **現在**: Day 1 完了（環境構築）
- **次回**: Day 2 予定（mdファイル解析機能）

### 重要ファイル
- `CLAUDE.md`: プロジェクト引き継ぎ情報
- `requirements.md`: 要件定義
- `implementation-plan.md`: 12日間実装計画
- `daily_log/`: 日毎実装ログ

### 技術スタック
- Next.js 14 + TypeScript
- Tailwind CSS
- Jest + Testing Library
- Docker環境

## 🎯 機能概要

1. **ファイル解析**: Repomix生成mdファイルを解析
2. **フローティングUI**: ドラッグ可能なウィンドウ表示
3. **関係性可視化**: メソッド間の呼び出し関係を線で表示
4. **サイドバー制御**: 表示/検索/折りたたみ機能

## 🏗️ 開発方針

- **TDD**: テスト駆動開発
- **Docker**: 分離環境での開発
- **学習ログ**: 新入社員向け詳細記録

## 📞 コマンド

```bash
# 環境操作
docker-compose up -d        # 起動
docker-compose down         # 停止
docker-compose logs         # ログ確認

# 開発
docker-compose exec app npm test      # テスト
docker-compose exec app npm run dev   # 開発サーバー
```