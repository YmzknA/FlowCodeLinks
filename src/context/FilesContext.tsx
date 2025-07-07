'use client';

import React, { createContext, useContext, useState, ReactNode, useCallback, useRef, useEffect } from 'react';
import { ParsedFile, Method } from '@/types/codebase';

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
    
    // 100ms以内の連続更新を無視（重複チェック）
    if (now - lastUpdateTime.current < 100) {
      return;
    }
    
    // 更新中フラグチェック
    if (isUpdating.current) {
      return;
    }
    
    isUpdating.current = true;
    lastUpdateTime.current = now;
    
    setAllFilesState(files);
    setAllFilesVersion(prev => prev + 1);
    
    // グローバル変数も並行して更新（後方互換性維持）
    if (typeof window !== 'undefined') {
      (window as any).__allFiles = files;
      
      // FloatingWindowに更新を通知
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
  }, []);

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
  
  // フォールバック: グローバル変数から取得
  const fallbackFiles = typeof window !== 'undefined' ? (window as any).__allFiles || [] : [];
  
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