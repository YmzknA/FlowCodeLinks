import { useState, useEffect, useRef } from 'react';

/**
 * __allFiles の変更を監視し、バージョン管理を行うカスタムフック
 * FloatingWindow.tsx から責任を分離し、単一責任原則に準拠
 */
export const useAllFilesMonitor = (filePath: string) => {
  const [allFilesVersion, setAllFilesVersion] = useState(0);
  const [isClient, setIsClient] = useState(false);
  const lastLengthRef = useRef(0);
  const retryCountRef = useRef(0);
  const maxRetries = 10; // 最大10回リトライ

  // クライアントサイド確認
  useEffect(() => {
    setIsClient(true);
  }, []);

  /**
   * 指数バックオフを使用したリトライ間隔計算
   * 100ms → 200ms → 400ms → 800ms → 1600ms → 2000ms (最大)
   */
  const getRetryInterval = (retryCount: number): number => {
    return Math.min(100 * Math.pow(2, retryCount), 2000);
  };

  /**
   * __allFiles の状態をチェックし、変更があれば更新
   */
  const checkAllFiles = (): boolean => {
    const allFiles = (window as any).__allFiles;
    const currentLength = allFiles?.length || 0;

    if (process.env.NODE_ENV === 'development' && filePath.includes('page.tsx')) {
      // eslint-disable-next-line no-console
      console.log(`Checking __allFiles for ${filePath}: ${currentLength} files`);
    }

    if (currentLength > 0 && currentLength !== lastLengthRef.current) {
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.log(`🔄 __allFiles detected change: ${lastLengthRef.current} → ${currentLength} for ${filePath}`);
      }
      lastLengthRef.current = currentLength;
      setAllFilesVersion(prev => prev + 1);
      retryCountRef.current = 0; // 成功したらリトライカウントリセット
      return true; // 成功を示す
    }

    return false; // まだデータが準備されていない
  };

  /**
   * 指数バックオフを使用したリトライループ
   */
  const startRetryLoop = (): void => {
    const scheduleRetry = () => {
      const interval = getRetryInterval(retryCountRef.current);
      setTimeout(() => {
        if (checkAllFiles() || retryCountRef.current >= maxRetries) {
          if (retryCountRef.current >= maxRetries) {
            if (process.env.NODE_ENV === 'development') {
              // eslint-disable-next-line no-console
              console.warn(`⚠️ __allFiles initialization failed after ${maxRetries} retries for ${filePath}`);
            }
          }
          return;
        }
        retryCountRef.current++;
        scheduleRetry();
      }, interval);
    };
    scheduleRetry();
  };

  useEffect(() => {
    // クライアントサイドでのみ実行
    if (!isClient) return;

    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.log('🔄 useAllFilesMonitor setting up monitoring for', filePath);
    }

    /**
     * __allFiles_updated カスタムイベントのハンドラ
     */
    const handleAllFilesUpdate = (event: CustomEvent) => {
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.log('🔄 useAllFilesMonitor received __allFiles event:', event.detail, 'for', filePath);
      }
      retryCountRef.current = 0; // イベント受信時はリトライカウントリセット

      // より長い遅延でチェック（CodeVisualizerの処理完了を待つ）
      setTimeout(() => {
        if (!checkAllFiles()) {
          // 失敗した場合は指数バックオフでリトライ
          startRetryLoop();
        }
      }, 200);
    };

    // 初回チェック（より長い遅延）
    setTimeout(() => {
      if (!checkAllFiles()) {
        startRetryLoop();
      }
    }, 300);

    if (typeof window !== 'undefined' && window.addEventListener) {
      window.addEventListener('__allFiles_updated', handleAllFilesUpdate as EventListener);
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.log('🔄 Event listener monitoring added for', filePath);
      }

      return () => {
        window.removeEventListener('__allFiles_updated', handleAllFilesUpdate as EventListener);
        if (process.env.NODE_ENV === 'development') {
          // eslint-disable-next-line no-console
          console.log('🔄 Monitoring removed for', filePath);
        }
      };
    }
  }, [isClient, filePath]);

  // allFilesVersionの変更をログ出力（開発環境のみ）
  useEffect(() => {
    if (allFilesVersion > 0 && process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.log(`🔄 allFilesVersion updated to: ${allFilesVersion} for ${filePath}`);
    }
  }, [allFilesVersion, filePath]);

  return { allFilesVersion, isClient };
};