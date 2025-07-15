/**
 * サンプルデータの読み込み機能
 */

export async function loadSampleData(): Promise<string> {
  try {
    const response = await fetch('/sample-ruby-code.md');
    if (!response.ok) {
      throw new Error('サンプルデータの読み込みに失敗しました');
    }
    const content = await response.text();
    return content;
  } catch (error) {
    console.error('サンプルデータ読み込みエラー:', error);
    throw error;
  }
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