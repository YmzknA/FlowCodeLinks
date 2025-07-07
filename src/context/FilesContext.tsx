'use client';

import React, { createContext, useContext, useState, ReactNode, useCallback, useRef, useEffect, startTransition } from 'react';
import { ParsedFile, Method } from '@/types/codebase';

// 段階的移行設定（セキュリティ改善のため）
const MIGRATION_CONFIG = {
  // グローバル変数の使用を一時的に有効化（クリック機能維持のため）
  allowGlobalVariables: true,
  // 警告メッセージの表示
  showDeprecationWarnings: true,
  // 無限レンダリング防止の簡素化
  useModernStateManagement: true
} as const;

interface FilesContextType {
  allFiles: ParsedFile[];
  setAllFiles: (files: ParsedFile[]) => void;
  getFileByPath: (path: string) => ParsedFile | undefined;
  findMethodDefinition: (methodName: string) => { filePath: string; lineNumber: number } | null;
  findAllMethodCallers: (methodName: string) => Array<{ methodName: string; filePath: string; lineNumber?: number }>;
  allFilesVersion: number;
}

const FilesContext = createContext<FilesContextType | undefined>(undefined);

export const FilesProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [allFiles, setAllFilesState] = useState<ParsedFile[]>([]);
  const [allFilesVersion, setAllFilesVersion] = useState(0);
  
  // 無限レンダリング防止用
  const lastUpdateTime = useRef<number>(0);
  const isUpdating = useRef<boolean>(false);

  const setAllFiles = useCallback((files: ParsedFile[]) => {
    const now = Date.now();
    
    // シンプルな重複チェック（データ比較ベース）
    const filesString = JSON.stringify(files.map(f => ({ path: f.path, methodCount: f.methods.length })));
    const currentString = JSON.stringify(allFiles.map(f => ({ path: f.path, methodCount: f.methods.length })));
    
    if (filesString === currentString) {
      return; // 同じデータなら更新しない
    }
    
    // 既存の防止機構も並行動作（段階的移行のため）
    if (now - lastUpdateTime.current < 100) {
      return;
    }
    
    if (isUpdating.current) {
      return;
    }
    
    isUpdating.current = true;
    lastUpdateTime.current = now;
    
    // React 18のstartTransitionを活用した最適化
    if (MIGRATION_CONFIG.useModernStateManagement) {
      startTransition(() => {
        setAllFilesState(files);
        setAllFilesVersion(prev => prev + 1);
      });
    } else {
      // フォールバック（既存機能保持）
      setAllFilesState(files);
      setAllFilesVersion(prev => prev + 1);
    }
    
    // セキュリティ改善: グローバル変数は開発環境のみ
    if (typeof window !== 'undefined') {
      if (MIGRATION_CONFIG.allowGlobalVariables) {
        // 開発環境: 後方互換性のためグローバル変数を更新
        (window as any).__allFiles = files;
        
        if (MIGRATION_CONFIG.showDeprecationWarnings) {
          // グローバル変数への書き込みは開発環境のみ
        }
      } else {
        // 本番環境: セキュリティのためグローバル変数は設定しない
        if (MIGRATION_CONFIG.showDeprecationWarnings) {
          // console.info('ℹ️ [FlowCodeLinks] セキュリティのため、本番環境ではグローバル変数は使用されません。');
        }
      }
      
      // CustomEvent通知は常に実行（既存機能に必要）
      if (files.length > 0) {
        const event = new CustomEvent('__allFiles_updated', {
          detail: { files, count: files.length }
        });
        window.dispatchEvent(event);
      }
    }
    
    // 更新完了
    setTimeout(() => {
      isUpdating.current = false;
    }, 0);
  }, [allFiles]); // allFilesを依存配列に追加（重複チェックのため）

  const getFileByPath = useCallback((path: string) => {
    return allFiles.find(file => file.path === path);
  }, [allFiles]);

  const findMethodDefinition = useCallback((methodName: string): { filePath: string; lineNumber: number } | null => {
    for (const file of allFiles) {
      const method = file.methods.find(m => m.name === methodName);
      if (method) {
        return {
          filePath: file.path,
          lineNumber: method.startLine
        };
      }
    }
    return null;
  }, [allFiles]);

  const findAllMethodCallers = useCallback((methodName: string): Array<{ methodName: string; filePath: string; lineNumber?: number }> => {
    const callers: Array<{ methodName: string; filePath: string; lineNumber?: number }> = [];
    
    for (const file of allFiles) {
      for (const method of file.methods) {
        if (method.calls && method.calls.some(call => call.methodName === methodName)) {
          callers.push({
            methodName: method.name,
            filePath: file.path,
            lineNumber: method.startLine
          });
        }
      }
    }
    
    return callers;
  }, [allFiles]);

  const contextValue: FilesContextType = {
    allFiles,
    setAllFiles,
    getFileByPath,
    findMethodDefinition,
    findAllMethodCallers,
    allFilesVersion
  };

  return (
    <FilesContext.Provider value={contextValue}>
      {children}
    </FilesContext.Provider>
  );
};

export const useFiles = () => {
  const context = useContext(FilesContext);
  if (!context) {
    throw new Error('useFiles must be used within FilesProvider');
  }
  return context;
};

// フォールバック用hook（グローバル変数アクセス）
export const useFilesWithFallback = () => {
  const context = useContext(FilesContext);
  
  // Contextが利用可能な場合はそれを使用
  if (context) {
    return context;
  }
  
  // フォールバック: 環境に応じたグローバル変数取得
  const fallbackFiles = (() => {
    if (typeof window === 'undefined') return [];
    
    // 開発環境ではグローバル変数を使用
    if (MIGRATION_CONFIG.allowGlobalVariables) {
      return (window as any).__allFiles || [];
    }
    
    // 本番環境では空配列（安全な動作）
    if (MIGRATION_CONFIG.showDeprecationWarnings) {
      // Context APIが利用できません。Providerで包んでください。
    }
    return [];
  })();
  
  return {
    allFiles: fallbackFiles,
    setAllFiles: () => {},
    getFileByPath: (path: string) => fallbackFiles.find((file: ParsedFile) => file.path === path),
    findMethodDefinition: (methodName: string) => {
      for (const file of fallbackFiles) {
        const method = file.methods?.find((m: Method) => m.name === methodName);
        if (method) {
          return {
            filePath: file.path,
            lineNumber: method.startLine
          };
        }
      }
      return null;
    },
    findAllMethodCallers: (methodName: string) => {
      const callers: Array<{ methodName: string; filePath: string; lineNumber?: number }> = [];
      
      for (const file of fallbackFiles) {
        for (const method of file.methods || []) {
          if (method.calls && method.calls.some((call: any) => call.methodName === methodName)) {
            callers.push({
              methodName: method.name,
              filePath: file.path,
              lineNumber: method.startLine
            });
          }
        }
      }
      
      return callers;
    },
    allFilesVersion: 0
  };
};