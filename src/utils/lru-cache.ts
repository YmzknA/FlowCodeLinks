/**
 * LRU (Least Recently Used) キャッシュ実装
 * メモリリーク防止のため、曲線パラメータの管理に使用
 */
export class LRUCurveCache {
  private cache = new Map<string, Set<string>>();
  private readonly maxSize: number;

  constructor(maxSize: number = 200) {  // より適切なデフォルト値
    if (maxSize < 10) {
      throw new Error('LRU cache size must be at least 10');
    }
    this.maxSize = maxSize;
  }

  /**
   * キーと値のペアをキャッシュに追加
   * 容量制限を超える場合は最も古いエントリを削除
   */
  set(key: string, value: Set<string>): void {
    // 既存のキーの場合は削除してから再追加（LRU更新）
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }
    
    // 容量制限チェック
    if (this.cache.size >= this.maxSize) {
      // 最も古いエントリ（最初のキー）を削除
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    
    // 新しいエントリを追加（最新として扱われる）
    this.cache.set(key, new Set(value));
  }

  /**
   * キーに対応する値を取得
   * アクセスされたエントリは最新として更新される
   */
  get(key: string): Set<string> | undefined {
    const value = this.cache.get(key);
    
    if (value !== undefined) {
      // アクセスされたエントリを最新として更新
      this.cache.delete(key);
      this.cache.set(key, value);
      
      // 新しいSetインスタンスを返して参照による変更を防ぐ
      return new Set(value);
    }
    
    return undefined;
  }

  /**
   * キーが存在するかチェック
   */
  has(key: string): boolean {
    return this.cache.has(key);
  }

  /**
   * キャッシュをクリア
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * 現在のキャッシュサイズを取得
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * キャッシュの使用率を取得（0-1の範囲）
   */
  usageRatio(): number {
    return this.cache.size / this.maxSize;
  }
}