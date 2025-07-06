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
  const filePathRef = useRef(filePath);
  const maxRetries = 10; // 最大10回リトライ

  // filePathをrefで常に最新の値を保持
  useEffect(() => {
    filePathRef.current = filePath;
  }, [filePath]);

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


  useEffect(() => {
    // クライアントサイドでのみ実行
    if (!isClient) return;

    /**
     * __allFiles の状態をチェックし、変更があれば更新（ローカル関数）
     */
    const checkAllFilesLocal = (): boolean => {
      const allFiles = (window as any).__allFiles;
      const currentLength = allFiles?.length || 0;

      if (process.env.NODE_ENV === 'development' && filePathRef.current.includes('page.tsx')) {
        // eslint-disable-next-line no-console
        console.log(`Checking __allFiles for ${filePathRef.current}: ${currentLength} files`);
      }

      if (currentLength > 0 && currentLength !== lastLengthRef.current) {
        if (process.env.NODE_ENV === 'development') {
          // eslint-disable-next-line no-console
          console.log(`🔄 __allFiles detected change: ${lastLengthRef.current} → ${currentLength} for ${filePathRef.current}`);
        }
        lastLengthRef.current = currentLength;
        setAllFilesVersion(prev => prev + 1);
        retryCountRef.current = 0; // 成功したらリトライカウントリセット
        return true; // 成功を示す
      }

      return false; // まだデータが準備されていない
    };

    /**
     * 指数バックオフを使用したリトライループ（ローカル関数）
     */
    const startRetryLoopLocal = (): void => {
      const scheduleRetry = () => {
        const interval = getRetryInterval(retryCountRef.current);
        setTimeout(() => {
          if (checkAllFilesLocal() || retryCountRef.current >= maxRetries) {
            if (retryCountRef.current >= maxRetries) {
              if (process.env.NODE_ENV === 'development') {
                // eslint-disable-next-line no-console
                console.warn(`⚠️ __allFiles initialization failed after ${maxRetries} retries for ${filePathRef.current}`);
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

    /**
     * __allFiles_updated カスタムイベントのハンドラ
     */
    const handleAllFilesUpdate = (event: CustomEvent) => {
      retryCountRef.current = 0; // イベント受信時はリトライカウントリセット

      // より長い遅延でチェック（CodeVisualizerの処理完了を待つ）
      setTimeout(() => {
        if (!checkAllFilesLocal()) {
          // 失敗した場合は指数バックオフでリトライ
          startRetryLoopLocal();
        }
      }, 200);
    };

    // 初回チェック（より長い遅延）
    setTimeout(() => {
      if (!checkAllFilesLocal()) {
        startRetryLoopLocal();
      }
    }, 300);

    if (typeof window !== 'undefined' && window.addEventListener) {
      window.addEventListener('__allFiles_updated', handleAllFilesUpdate as EventListener);

      return () => {
        window.removeEventListener('__allFiles_updated', handleAllFilesUpdate as EventListener);
      };
    }
  }, [isClient]);


  return { allFilesVersion, isClient };
};