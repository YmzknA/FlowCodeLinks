/**
 * エラー処理ユーティリティ
 * 一貫したエラーハンドリングとエラー正規化を提供
 */

// 構造化エラーの完全実装
export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';
export type ErrorCategory = 'network' | 'validation' | 'security' | 'system' | 'business';

// 回復アクション定義
export interface RecoveryAction {
  label: string;
  action: () => void | Promise<void>;
  icon?: string;
  primary?: boolean;
}

// エラーコンテキスト
export interface ErrorContext {
  component?: string;
  function?: string;
  userId?: string;
  sessionId?: string;
  timestamp: number;
  userAgent?: string;
  url?: string;
  additionalData?: Record<string, unknown>;
}

// 完全な構造化エラー
export interface StructuredError extends Error {
  // 基本情報
  name: string;
  message: string;
  stack?: string;
  
  // 品質情報
  severity: ErrorSeverity;
  category: ErrorCategory;
  
  // ユーザー向け情報
  userMessage: string;
  recoveryActions: RecoveryAction[];
  
  // 開発者向け情報
  technicalDetails?: string;
  context?: ErrorContext;
  
  // 追跡情報
  timestamp: number;
  requestId?: string;
  errorId: string;
}

// エラーファクトリークラス
export class ErrorFactory {
  private static generateErrorId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * 基本的な構造化エラーを生成
   */
  static create(
    message: string,
    severity: ErrorSeverity,
    category: ErrorCategory,
    userMessage: string,
    recoveryActions: RecoveryAction[] = [],
    context?: ErrorContext,
    technicalDetails?: string
  ): StructuredError {
    const error = new Error(message) as StructuredError;
    
    error.name = `${category}Error`;
    error.severity = severity;
    error.category = category;
    error.userMessage = userMessage;
    error.recoveryActions = recoveryActions;
    error.context = context;
    error.technicalDetails = technicalDetails;
    error.timestamp = Date.now();
    error.errorId = this.generateErrorId();
    
    return error;
  }
  
  /**
   * ネットワークエラーを生成
   */
  static createNetworkError(
    details: string,
    context?: ErrorContext
  ): StructuredError {
    return this.create(
      'ネットワークエラーが発生しました',
      'high',
      'network',
      'インターネット接続を確認してください',
      [
        {
          label: '再試行',
          action: () => window.location.reload(),
          icon: 'refresh',
          primary: true
        },
        {
          label: '接続状態を確認',
          action: () => {
            if (navigator.onLine) {
              alert('インターネットに接続されています');
            } else {
              alert('インターネットに接続されていません');
            }
          },
          icon: 'wifi'
        }
      ],
      context,
      details
    );
  }
  
  /**
   * バリデーションエラーを生成
   */
  static createValidationError(
    field: string,
    value: unknown,
    context?: ErrorContext
  ): StructuredError {
    return this.create(
      `${field}の値が不正です`,
      'medium',
      'validation',
      `${field}を正しく入力してください`,
      [
        {
          label: '修正する',
          action: () => {
            // フォーカスを該当フィールドに移動
            const element = document.querySelector(`[name="${field}"]`) as HTMLElement;
            element?.focus();
          },
          icon: 'edit',
          primary: true
        }
      ],
      context,
      `Invalid value for ${field}: ${JSON.stringify(value)}`
    );
  }
  
  /**
   * セキュリティエラーを生成
   */
  static createSecurityError(
    details: string,
    context?: ErrorContext
  ): StructuredError {
    return this.create(
      'セキュリティエラーが発生しました',
      'critical',
      'security',
      'セキュリティ上の問題が発生しました。管理者にお問い合わせください',
      [
        {
          label: 'ログアウト',
          action: () => {
            // セッションクリア
            sessionStorage.clear();
            localStorage.clear();
            window.location.href = '/login';
          },
          icon: 'logout',
          primary: true
        }
      ],
      context,
      details
    );
  }
  
  /**
   * システムエラーを生成
   */
  static createSystemError(
    details: string,
    context?: ErrorContext
  ): StructuredError {
    return this.create(
      'システムエラーが発生しました',
      'high',
      'system',
      'システムエラーが発生しました。しばらく待ってから再試行してください',
      [
        {
          label: '再試行',
          action: () => window.location.reload(),
          icon: 'refresh',
          primary: true
        },
        {
          label: 'ホームに戻る',
          action: () => window.location.href = '/',
          icon: 'home'
        }
      ],
      context,
      details
    );
  }
}

/**
 * 未知のエラーを構造化エラーに正規化
 * @param err - 任意のエラー値
 * @param defaultMessage - エラーメッセージが取得できない場合のデフォルトメッセージ
 * @param context - エラーコンテキスト
 * @returns 正規化された構造化エラー
 */
export function normalizeError(
  err: unknown, 
  defaultMessage: string = '予期しないエラーが発生しました',
  context?: ErrorContext
): StructuredError {
  // 既に構造化エラーの場合はそのまま返す
  if (err && typeof err === 'object' && 'errorId' in err) {
    return err as StructuredError;
  }
  
  // 通常のErrorオブジェクトの場合
  if (err instanceof Error) {
    return ErrorFactory.create(
      err.message,
      'medium',
      'system',
      err.message,
      [],
      context,
      err.stack
    );
  }
  
  // 文字列の場合
  if (typeof err === 'string') {
    return ErrorFactory.create(
      err,
      'medium',
      'system',
      err,
      [],
      context
    );
  }
  
  // その他の場合
  return ErrorFactory.create(
    defaultMessage,
    'medium',
    'system',
    defaultMessage,
    [],
    context,
    `Unknown error type: ${typeof err}`
  );
}

/**
 * エラーメッセージを安全に取得
 * @param err - 任意のエラー値
 * @param defaultMessage - エラーメッセージが取得できない場合のデフォルトメッセージ
 * @returns エラーメッセージ文字列
 */
export function getErrorMessage(err: unknown, defaultMessage: string = '予期しないエラーが発生しました'): string {
  // 構造化エラーの場合
  if (err && typeof err === 'object' && 'userMessage' in err) {
    return (err as StructuredError).userMessage;
  }
  
  // 通常のエラーの場合
  if (err instanceof Error) {
    return err.message;
  }
  
  // 文字列の場合
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
 * @param err - エラーオブジェクト（構造化エラーまたは通常のエラー）
 * @returns ユーザーフレンドリーなエラーメッセージ
 */
export function getUserFriendlyErrorMessage(err: Error | StructuredError): string {
  // 構造化エラーの場合は、userMessageを使用
  if ('userMessage' in err && err.userMessage) {
    return err.userMessage;
  }
  
  // 通常のエラーの場合の既存処理
  if (isNetworkError(err)) {
    return 'ネットワーク接続に問題があります。インターネット接続を確認してください。';
  }
  
  // HTTPステータスコードを含むエラーの処理（セキュリティ強化）
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

/**
 * エラーの回復アクションを取得
 * @param err - 構造化エラー
 * @returns 回復アクションの配列
 */
export function getErrorRecoveryActions(err: StructuredError): RecoveryAction[] {
  return err.recoveryActions || [];
}

/**
 * エラーコンテキストを生成
 * @param component - コンポーネント名
 * @param functionName - 関数名
 * @param additionalData - 追加データ
 * @returns エラーコンテキスト
 */
export function createErrorContext(
  component?: string,
  functionName?: string,
  additionalData?: Record<string, unknown>
): ErrorContext {
  return {
    component,
    function: functionName,
    timestamp: Date.now(),
    userAgent: navigator.userAgent,
    url: window.location.href,
    additionalData
  };
}

/**
 * エラーログを送信（将来の実装用）
 * @param error - 構造化エラー
 */
export function logError(error: StructuredError): void {
  // 開発環境では詳細ログを出力
  if (process.env.NODE_ENV === 'development') {
    console.group(`🔥 [${error.severity.toUpperCase()}] ${error.category} Error`);
    console.error('Message:', error.message);
    console.error('User Message:', error.userMessage);
    console.error('Technical Details:', error.technicalDetails);
    console.error('Context:', error.context);
    console.error('Recovery Actions:', error.recoveryActions);
    console.error('Stack:', error.stack);
    console.groupEnd();
  }
  
  // 本番環境では必要最小限のログ送信（将来実装）
  if (process.env.NODE_ENV === 'production') {
    // TODO: エラーログサービスに送信
    // sendToErrorService(error);
  }
}