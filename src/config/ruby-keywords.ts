/**
 * Ruby言語の予約語とビルトイン関数の定義
 * 新しいキーワードやビルトイン関数の追加時はここを更新
 */

/**
 * Rubyの予約語・キーワード
 * メソッド呼び出しとして検出すべきでない単語のリスト
 */
export const RUBY_KEYWORDS = [
  // 制御構造
  'if', 'else', 'elsif', 'unless', 'case', 'when', 'while', 'until', 'for', 'break', 'next', 'redo', 'retry', 'return',
  
  // 定義関連
  'def', 'class', 'module', 'alias', 'undef',
  
  // 例外処理
  'begin', 'rescue', 'ensure', 'raise',
  
  // その他の制御
  'yield', 'super', 'self', 'nil', 'true', 'false',
  
  // 可視性修飾子
  'private', 'protected', 'public',
  
  // ブロック・イテレータ
  'do', 'end', 'in', 'then',
  
  // 論理演算子
  'and', 'or', 'not',
  
  // 特殊変数・定数アクセス
  '__LINE__', '__FILE__', '__ENCODING__'
] as const;

/**
 * Rubyのビルトイン関数・メソッド
 * 標準で提供される関数で、通常はユーザー定義メソッドとして扱わない
 */
export const RUBY_BUILTINS = [
  // 入出力
  'puts', 'print', 'p', 'gets', 'getc', 'putc', 'printf', 'sprintf',
  
  // ファイル・ライブラリ操作
  'require', 'require_relative', 'load', 'autoload',
  
  // モジュール操作
  'include', 'extend', 'prepend',
  
  // オブジェクト・型操作
  'defined?', 'respond_to?', 'kind_of?', 'instance_of?', 'is_a?',
  
  // 変数・定数操作
  'local_variables', 'instance_variables', 'class_variables', 'global_variables',
  
  // 評価・実行
  'eval', 'instance_eval', 'class_eval', 'module_eval',
  
  // プロセス・システム
  'system', 'exec', 'spawn', 'fork', 'exit', 'exit!', 'abort',
  
  // 文字列・配列操作の基本メソッド
  'length', 'size', 'empty?', 'nil?',
  
  // 変換メソッド
  'to_s', 'to_i', 'to_f', 'to_a', 'to_h', 'to_sym'
] as const;

/**
 * RubyのCRUD操作に関連するメソッド名
 * 一般的なCRUDパターンだが、ユーザー定義の場合は検出対象とする
 */
export const RUBY_CRUD_METHODS = [
  'find', 'find_by', 'where', 'select', 'create', 'update', 'delete', 'destroy',
  'save', 'save!', 'reload', 'exists?', 'count', 'first', 'last', 'all'
] as const;

/**
 * 型安全性のためのタイプガード関数群
 */

export function isRubyKeyword(word: string): boolean {
  return (RUBY_KEYWORDS as readonly string[]).includes(word);
}

export function isRubyBuiltin(word: string): boolean {
  return (RUBY_BUILTINS as readonly string[]).includes(word);
}

export function isRubyCrudMethod(word: string): boolean {
  return (RUBY_CRUD_METHODS as readonly string[]).includes(word);
}