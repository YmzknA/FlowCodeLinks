/**
 * 開発環境専用のデバッグユーティリティ
 * 本番環境では何も出力しない
 */

export const debugLog = (message: string, data?: any): void => {
  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console.log(message, data);
  }
};

export const debugWarn = (message: string, data?: any): void => {
  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console.warn(message, data);
  }
};

export const debugError = (message: string, data?: any): void => {
  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console.error(message, data);
  }
};