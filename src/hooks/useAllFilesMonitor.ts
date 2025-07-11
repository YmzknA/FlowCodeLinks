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
  const isUpdatingRef = useRef(false); // 更新中フラグ
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


      // 無限レンダリング防止: 実際に内容が変更された場合のみバージョンを更新
      if (currentLength > 0 && currentLength !== lastLengthRef.current && !isUpdatingRef.current) {
        // 重複チェック: 短時間での連続更新を防止
        const now = Date.now();
        const lastUpdateTime = (window as any).__allFilesLastUpdate || 0;
        if (now - lastUpdateTime < 100) {
          return false; // 100ms以内の連続更新は無視
        }
        
        // 更新中フラグを設定
        isUpdatingRef.current = true;
        (window as any).__allFilesLastUpdate = now;

        lastLengthRef.current = currentLength;
        
        // 状態更新を非同期で実行し、フラグをリセット
        setTimeout(() => {
          setAllFilesVersion(prev => prev + 1);
          isUpdatingRef.current = false;
        }, 0);
        
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
                // __allFiles initialization failed after max retries
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