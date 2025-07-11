# FlowCodeLinks

**コードの関係性を可視化するWebアプリケーション**

複雑なコードベースのメソッド間の関係を直感的に理解できるよう、フローティングウィンドウと矢印で可視化します。

## 🚀 今すぐ試す

**👉 [https://flow-code-links.vercel.app/](https://flow-code-links.vercel.app/)**

## ✨ 主な機能

### 📁 簡単ファイルアップロード
- **Repomix**で生成されたマークダウンファイルをアップロード

### 🔍 インテリジェントなコード解析
- メソッドの呼び出し関係を解析し、依存関係を抽出

### 🪟 フローティングウィンドウ
- ファイルごとに独立したドラッグ可能なウィンドウ
- シンタックスハイライト対応

### 🔗 関係性の可視化
- メソッド間の呼び出しを **矢印** で表示
- 呼び出し元に応じて色分け
- 複雑な依存関係も一目で把握

### 🎛️ 直感的な操作
- **サイドバー**からファイル/メソッドの表示切り替え
- **検索機能**で特定のメソッドやファイルを素早く発見
- **ズーム機能**で大規模なコードベースにも対応

## 📖 使い方

### 1. Repomixファイルを準備
https://repomix.com/
このサイトでリポジトリを入力し、markdown化してください。

### 2. FlowCodeLinksで可視化

1. **[FlowCodeLinks](https://flow-code-links.vercel.app/)** にアクセス
2. 生成された `.md` ファイルをアップロード
3. 自動的にコードが解析されます
4. サイドバーから表示するファイルやメソッドを選択

### 3. コードの関係性を探索

- **メソッド名をクリック** → 定義箇所にジャンプ
- **矢印をたどる** → 依存関係を視覚的に追跡
- **検索機能** → 特定のメソッドやファイルを素早く発見

## 🎯 こんな方におすすめ

- **📚 大規模なコードベースを理解したい開発者**
- **🔍 コードリーディングを効率化したい方**
- **🎓 新しいプロジェクトに参加したエンジニア**
- **📊 システムアーキテクチャを可視化したい設計者**

## 🛠️ 対応言語

- **Ruby** / **Ruby on Rails**
- **JavaScript**

*その他の言語対応は今後追加予定*

## 🔒 セキュリティ

- **完全クライアントサイド処理** - ファイルはサーバーに送信されません
- **一時的な処理** - ページを閉じるとデータは完全に削除されます

## 💡 使用例

### コードレビュー時
```
新しいPRの影響範囲を視覚的に確認
「この変更はどのメソッドに影響するか？」が一目でわかる
```

### 新メンバーのオンボーディング
```
システム全体の構造を素早く把握
「このメソッドは何をしているか？」が追跡しやすい
```


## 🚀 技術スタック

- **フロントエンド**: Next.js 14 + TypeScript
- **UI/UX**: Tailwind CSS
- **コード解析**: 独自パーサー
- **可視化**: SVG + Canvas
- **デプロイ**: Vercel

## 📝 フィードバック・貢献

バグ報告や機能要望は [GitHub Issues](https://github.com/YmzknA/code_flow_reader/issues) までお寄せください。

---

**作成者**: [YmzknA](https://github.com/YmzknA)  
**リポジトリ**: [GitHub](https://github.com/YmzknA/code_flow_reader)
