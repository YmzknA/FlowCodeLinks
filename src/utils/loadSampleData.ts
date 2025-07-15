/**
 * サンプルデータの読み込み機能
 */

export async function loadSampleData(): Promise<string> {
  try {
    const response = await fetch('/sample-ruby-code.md');
    if (!response.ok) {
      throw new Error(`サンプルデータの読み込みに失敗: ${response.status} ${response.statusText}`);
    }
    const content = await response.text();
    return content;
  } catch (error) {
    // console.errorを除去し、エラーをそのまま上位に伝播
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