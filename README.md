# FlowCodeLinks

GitHubリポジトリのコードを読みやすく可視化し、メソッド間の関係を線で結んで表示するWebアプリケーション

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
- **フロントエンド**: Next.js 14 + TypeScript
- **スタイリング**: Tailwind CSS（CSS最小限）
- **テスト**: Jest + Testing Library (TDD)
- **ドラッグ&ドロップ**: @dnd-kit/core
- **シンタックスハイライト**: Prism.js
- **開発環境**: Docker Compose

## 🎯 機能概要

1. **ファイルアップロード**: Repomixで生成されたmdファイル
2. **コード解析**: Ruby(Rails)とJavaScriptのメソッド/関数を解析
3. **フローティングウィンドウ**: ドラッグ可能なファイル表示
4. **関係性可視化**: メソッド間の呼び出し関係を矢印で表示
5. **サイドバー制御**: 表示/非表示、検索、折りたたみ機能

## 🏗️ 開発方針

- **TDD**: t_wadaのTDD原則に従い、Red-Green-Refactorサイクル
- **指導ログ**: 新入社員向けに詳細な実装ログを記録
- **Docker環境**: ホストPCに影響を与えない分離環境
- **Tailwind中心**: CSSファイルは最小限に抑制

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