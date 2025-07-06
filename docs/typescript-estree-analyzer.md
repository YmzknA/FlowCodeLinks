# TypeScript ESTree Analyzer

## 概要
TypeScript ESTreeを使用した高精度なTypeScript/JavaScript解析機能。従来の正規表現ベースの解析から、AST（抽象構文木）ベースの解析に移行することで、より正確で包括的なコード解析を実現します。

## 主な機能

### 1. 型定義の検出
- **型エイリアス**: `type UserData = { ... }`
- **インターフェース**: `interface Repository<T> { ... }`
- **ジェネリクス**: 複雑な型パラメータを持つ型定義もサポート

### 2. メソッド定義の検出
- **クラスメソッド**: インスタンスメソッド、静的メソッド、プライベートメソッド
- **関数宣言**: `function processData() { ... }`
- **アロー関数**: `const handler = () => { ... }`
- **Reactコンポーネント**: JSXを返す関数を自動判定

### 3. メソッド呼び出しの検出
- **通常の呼び出し**: `functionName()`
- **メソッドチェーン**: `obj.method1().method2()`
- **条件付き呼び出し**: if文内での呼び出しも検出
- **コールバック内の呼び出し**: useCallback等のフック内も解析

## 利点

### 正規表現ベース vs AST解析

| 項目 | 正規表現ベース | AST解析 |
|------|--------------|---------|
| 精度 | 中程度 | 高精度 |
| 複雑な構文 | 対応困難 | 完全対応 |
| ジェネリクス | 限定的 | 完全サポート |
| パフォーマンス | 高速 | やや低速 |
| メンテナンス性 | 低い | 高い |

### AST解析の優位性
1. **構文的に正確**: コードの構造を完全に理解
2. **エッジケース対応**: コメント内のコードや文字列リテラルを誤検出しない
3. **将来性**: TypeScriptの新機能に対応しやすい
4. **拡張性**: 追加の解析機能を実装しやすい

## 実装詳細

### アーキテクチャ
```typescript
// サーバーサイドのみで動作
if (typeof window === 'undefined') {
  const tsEstree = require('@typescript-eslint/typescript-estree');
  // AST解析を実行
}
```

### 主要な関数

#### `analyzeTypeScriptWithESTree`
TypeScriptファイルの包括的な解析を行う主要関数。

```typescript
export function analyzeTypeScriptWithESTree(
  file: ParsedFile, 
  allDefinedMethods?: Set<string>
): Method[]
```

#### `extractTypeScriptMethodDefinitionsWithESTree`
メソッド定義のみを抽出（呼び出し検出なし）。

```typescript
export function extractTypeScriptMethodDefinitionsWithESTree(
  file: ParsedFile
): Method[]
```

### 検出可能な要素
- 型エイリアス（type alias）
- インターフェース（interface）
- クラス（class）
- 関数宣言（function declaration）
- アロー関数（arrow function）
- メソッドシグネチャ
- インポート/エクスポート文

## パフォーマンス考慮事項

### 最適化戦略
1. **2段階解析**: 最初にメソッド定義を抽出し、次に呼び出しを検出
2. **キャッシュ**: 解析結果をメモリ内でキャッシュ
3. **選択的解析**: 必要なファイルのみを解析

### ベンチマーク結果
- 100クラス（約2600行）: < 5秒で解析完了
- メモリ使用量: 通常のNext.jsアプリケーションの範囲内

## 今後の拡張予定

1. **Web Worker対応**: ブラウザでのAST解析を可能に
2. **インクリメンタル解析**: 変更された部分のみを再解析
3. **型情報の活用**: TypeScriptコンパイラAPIとの連携
4. **視覚化の強化**: ASTの構造を図として表示

## トラブルシューティング

### よくある問題

#### 1. クライアントサイドでのエラー
```
Error: Cannot find module '@typescript-eslint/typescript-estree'
```
**解決策**: next.config.jsでクライアントサイドでの読み込みを無効化済み

#### 2. パース エラー
```
TypeScript ESTree parsing failed
```
**解決策**: 
- TypeScriptのバージョンを確認
- 構文エラーがないか確認
- `allowInvalidAST: true`オプションが設定されていることを確認

## 参考リンク
- [TypeScript ESTree Documentation](https://typescript-eslint.io/packages/typescript-estree/)
- [AST Explorer](https://astexplorer.net/) - ASTの構造を視覚的に確認
- [TypeScript Compiler API](https://github.com/microsoft/TypeScript/wiki/Using-the-Compiler-API)