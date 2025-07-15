/**
 * サンプルデータの読み込み機能
 * セキュリティ対策とパフォーマンス最適化を含む
 */

import { normalizeError } from './error';

// メモリキャッシュ
let cachedSampleData: string | null = null;

// ファイルサイズ制限 (1MB)
const MAX_FILE_SIZE = 1024 * 1024;

// 許可されるContent-Type
const ALLOWED_CONTENT_TYPES = ['text/markdown', 'text/plain'];

/**
 * サンプルデータを読み込む
 * @returns サンプルデータの文字列
 * @throws エラーが発生した場合はError オブジェクトをthrow
 */
export async function loadSampleData(): Promise<string> {
  // キャッシュから返却
  if (cachedSampleData) {
    return cachedSampleData;
  }

  try {
    const response = await fetch('/sample-ruby-code.md');
    
    // HTTPステータスチェック
    if (!response.ok) {
      throw new Error(`サンプルデータの読み込みに失敗: ${response.status} ${response.statusText}`);
    }

    // Content-Type検証
    const contentType = response.headers.get('content-type');
    if (!contentType || !ALLOWED_CONTENT_TYPES.some(type => contentType.includes(type))) {
      throw new Error('無効なコンテンツタイプです');
    }

    // ファイルサイズ制限チェック
    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > MAX_FILE_SIZE) {
      throw new Error('サンプルファイルが大きすぎます');
    }

    const content = await response.text();
    
    // レスポンス内容のサイズチェック（Content-Lengthが取得できない場合）
    if (content.length > MAX_FILE_SIZE) {
      throw new Error('サンプルファイルが大きすぎます');
    }

    // キャッシュに保存
    cachedSampleData = content;
    return content;
  } catch (error) {
    throw normalizeError(error, 'サンプルデータの読み込みに失敗しました');
  }
}

/**
 * サンプルデータキャッシュをクリア
 */
export function clearSampleDataCache(): void {
  cachedSampleData = null;
}

export const SAMPLE_DATA_INFO = {
  title: 'ECサイト注文処理',
  description: 'メソッド間の関係性を可視化したサンプルコード',
  features: [
    'メソッド呼び出しの可視化',
    'コード構造の理解',
    '依存関係の把握'
  ]
};