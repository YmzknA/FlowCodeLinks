/**
 * エラー処理ユーティリティ
 * 一貫したエラーハンドリングとエラー正規化を提供
 */

/**
 * 未知のエラーを Error オブジェクトに正規化
 * @param err - 任意のエラー値
 * @param defaultMessage - エラーメッセージが取得できない場合のデフォルトメッセージ
 * @returns 正規化された Error オブジェクト
 */
export function normalizeError(err: unknown, defaultMessage: string = '予期しないエラーが発生しました'): Error {
  if (err instanceof Error) {
    return err;
  }
  
  if (typeof err === 'string') {
    return new Error(err);
  }
  
  return new Error(defaultMessage);
}

/**
 * エラーメッセージを安全に取得
 * @param err - 任意のエラー値
 * @param defaultMessage - エラーメッセージが取得できない場合のデフォルトメッセージ
 * @returns エラーメッセージ文字列
 */
export function getErrorMessage(err: unknown, defaultMessage: string = '予期しないエラーが発生しました'): string {
  if (err instanceof Error) {
    return err.message;
  }
  
  if (typeof err === 'string') {
    return err;
  }
  
  return defaultMessage;
}

/**
 * ネットワークエラーを判定
 * @param err - エラーオブジェクト
 * @returns ネットワークエラーかどうか
 */
export function isNetworkError(err: Error): boolean {
  const networkErrorMessages = [
    'fetch',
    'network',
    'timeout',
    'connection',
    'internet',
    'offline'
  ];
  
  const message = err.message.toLowerCase();
  return networkErrorMessages.some(keyword => message.includes(keyword));
}

/**
 * エラーの種類に応じたユーザーフレンドリーなメッセージを生成
 * @param err - エラーオブジェクト
 * @returns ユーザーフレンドリーなエラーメッセージ
 */
export function getUserFriendlyErrorMessage(err: Error): string {
  if (isNetworkError(err)) {
    return 'ネットワーク接続に問題があります。インターネット接続を確認してください。';
  }
  
  // HTTPステータスコードを含むエラーの処理
  if (err.message.includes('404')) {
    return 'リクエストされたファイルが見つかりませんでした。';
  }
  
  if (err.message.includes('403')) {
    return 'ファイルへのアクセスが許可されていません。';
  }
  
  if (err.message.includes('500')) {
    return 'サーバーエラーが発生しました。しばらく待ってから再試行してください。';
  }
  
  return err.message;
}