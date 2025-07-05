/**
 * 正規表現パターンを構造化して管理するユーティリティ
 * 複雑な正規表現を読みやすく保守しやすい形で定義
 */

/**
 * メソッド検出用の正規表現ビルダー
 * 可読性と保守性を向上させるため、正規表現を要素に分解して構築
 */
export class MethodPatternBuilder {
  /**
   * スタンドアロンメソッド検出パターンを構築
   * 例: "method_call", "  validate!", "update_task", "if user_signed_in?"
   */
  static createStandalonePattern(): RegExp {
    // メソッド名: 英数字・アンダースコア + 任意の?または!
    const methodName = '(\\w+[?!]?)';
    
    // 前方先読みで単語境界を検出（空白、行末、括弧、演算子など）
    const wordEnd = '(?=\\s|$|\\(|\\)|,|&&|\\|\\|)';
    
    return new RegExp(`${methodName}${wordEnd}`, 'g');
  }

  /**
   * ドット記法メソッド呼び出しパターンを構築
   * 例: "user.admin?", "post.comments.count"
   */
  static createDotMethodPattern(): RegExp {
    // ドット + メソッド名
    const dotMethod = '\\.(\\w+[?!]?)';
    
    // 後続: 括弧、ドット、空白、行末、カンマ、閉じ括弧など
    const methodEnd = '(?=\\s*\\(|\\s*\\.|\\s|$|,|\\))';
    
    return new RegExp(`${dotMethod}${methodEnd}`, 'g');
  }

  /**
   * 文字列補間内の単純メソッド呼び出しパターンを構築
   * 例: "#{user_name}", "#{get_count()}"
   */
  static createInterpolationSimplePattern(): RegExp {
    // 文字列補間開始
    const interpolationStart = '#{';
    
    // メソッド名
    const methodName = '(\\w+[?!]?)';
    
    // 任意の括弧開始 + 補間終了
    const interpolationEnd = '(?:\\s*\\()?}';
    
    return new RegExp(`${interpolationStart}${methodName}${interpolationEnd}`, 'g');
  }

  /**
   * 文字列補間内のオブジェクトメソッド呼び出しパターンを構築
   * 例: "#{user.name}", "#{task.completed?}"
   */
  static createInterpolationObjectPattern(): RegExp {
    // 文字列補間開始 + オブジェクト名 + ドット
    const interpolationStart = '#{\\w+\\.';
    
    // メソッド名
    const methodName = '(\\w+[?!]?)';
    
    // 任意の括弧開始 + 補間終了
    const interpolationEnd = '(?:\\s*\\()?}';
    
    return new RegExp(`${interpolationStart}${methodName}${interpolationEnd}`, 'g');
  }

  /**
   * Rubyメソッド定義パターンを構築
   * 例: "def method_name", "def self.class_method"
   */
  static createMethodDefinitionPattern(): RegExp {
    // def キーワード + 空白
    const defKeyword = '^def\\s+';
    
    // 任意の self. プレフィックス
    const selfPrefix = '(self\\.)?';
    
    // メソッド名
    const methodName = '(\\w+[?!]?)';
    
    // 任意のパラメータ
    const parameters = '(\\([^)]*\\))?';
    
    // フラグなし: 単一のメソッド定義をマッチングするため
    return new RegExp(`${defKeyword}${selfPrefix}${methodName}${parameters}`);
  }

  /**
   * 指定されたメソッド名の検索パターンを構築
   * HTML内での安全な置換用
   */
  static createMethodNameSearchPattern(methodName: string): RegExp {
    // メソッド名をエスケープ
    const escapedName = methodName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // 単語境界を使用した厳密な検索
    return new RegExp(`(?<!\\w)(${escapedName})(?![\\w])`, 'g');
  }

  /**
   * ERBタグ内のメソッド呼び出しパターンを構築
   * 例: "<%= user.name %>", "<% if current_user %>"
   */
  static createErbTagPattern(): RegExp {
    // ERBタグ開始: <%= または <%
    const erbStart = '<%=?\\s*';
    
    // 内容をキャプチャ
    const content = '(.*?)';
    
    // ERBタグ終了
    const erbEnd = '\\s*%>';
    
    return new RegExp(`${erbStart}${content}${erbEnd}`, 'g');
  }
}

/**
 * 定義済みパターンのキャッシュ
 * パフォーマンス向上のため頻繁に使用されるパターンをキャッシュ
 */
export class PatternCache {
  private static cache = new Map<string, RegExp>();

  /**
   * キャッシュからパターンを取得、または新規作成
   */
  static getPattern(key: string, factory: () => RegExp): RegExp {
    if (!this.cache.has(key)) {
      this.cache.set(key, factory());
    }
    return this.cache.get(key)!;
  }

  /**
   * キャッシュクリア（テスト用）
   */
  static clearCache(): void {
    this.cache.clear();
  }
}

/**
 * よく使用される正規表現パターンの定数
 */
export const COMMON_PATTERNS = {
  /**
   * スタンドアロンメソッド呼び出しパターン
   * 行頭または空白の後のメソッド名を検出
   */
  STANDALONE_METHOD: MethodPatternBuilder.createStandalonePattern(),

  /**
   * ドット記法メソッド呼び出しパターン
   * オブジェクト.メソッド名の形式を検出
   */
  DOT_METHOD: MethodPatternBuilder.createDotMethodPattern(),

  /**
   * 文字列補間内の単純メソッド呼び出しパターン
   * #{method_name} 形式を検出
   */
  INTERPOLATION_SIMPLE: MethodPatternBuilder.createInterpolationSimplePattern(),

  /**
   * 文字列補間内のオブジェクトメソッド呼び出しパターン
   * #{object.method_name} 形式を検出
   */
  INTERPOLATION_OBJECT: MethodPatternBuilder.createInterpolationObjectPattern(),

  /**
   * Rubyメソッド定義パターン
   * def method_name 形式を検出
   */
  METHOD_DEFINITION: MethodPatternBuilder.createMethodDefinitionPattern(),

  /**
   * ERBタグパターン
   * <%= %> と <% %> 形式を検出
   */
  ERB_TAG: MethodPatternBuilder.createErbTagPattern(),
} as const;