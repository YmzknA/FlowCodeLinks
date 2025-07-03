import { useState, useCallback } from 'react';

export interface FileUploadResult {
  content: string;
  isLoading: boolean;
  error: string | null;
}

export interface UseFileUploadReturn {
  uploadResult: FileUploadResult;
  handleFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  clearError: () => void;
  resetUpload: () => void;
}

export const useFileUpload = (): UseFileUploadReturn => {
  const [uploadResult, setUploadResult] = useState<FileUploadResult>({
    content: '',
    isLoading: false,
    error: null
  });

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // ファイルサイズ制限 (5MB)
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > MAX_FILE_SIZE) {
      setUploadResult(prev => ({
        ...prev,
        error: 'ファイルサイズが5MBを超えています。より小さなファイルを選択してください。'
      }));
      return;
    }

    // ファイル形式チェック
    if (!file.name.endsWith('.md')) {
      setUploadResult(prev => ({
        ...prev,
        error: 'mdファイルのみアップロード可能です。'
      }));
      return;
    }

    try {
      setUploadResult(prev => ({
        ...prev,
        isLoading: true,
        error: null
      }));

      const content = await file.text();
      
      // 空ファイルチェック
      if (!content.trim()) {
        setUploadResult(prev => ({
          ...prev,
          isLoading: false,
          error: 'ファイルが空です。内容のあるファイルを選択してください。'
        }));
        return;
      }

      setUploadResult({
        content,
        isLoading: false,
        error: null
      });
    } catch (err) {
      setUploadResult(prev => ({
        ...prev,
        isLoading: false,
        error: 'ファイルの読み込みに失敗しました。'
      }));
    }
  }, []);

  const clearError = useCallback(() => {
    setUploadResult(prev => ({
      ...prev,
      error: null
    }));
  }, []);

  const resetUpload = useCallback(() => {
    setUploadResult({
      content: '',
      isLoading: false,
      error: null
    });
  }, []);

  return {
    uploadResult,
    handleFileUpload,
    clearError,
    resetUpload
  };
};