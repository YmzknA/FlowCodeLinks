import { useState, useCallback } from 'react';
import { ParsedFile, FloatingWindow } from '@/types';
import { MethodExclusionService } from '@/services/MethodExclusionService';
import { calculateCenteringPan } from '@/utils/window-centering';

export interface MethodJumpTarget {
  methodName: string;
  filePath: string;
  lineNumber?: number;
}

export interface UseMethodJumpParams {
  files: ParsedFile[];
  visibleFiles: string[];
  setVisibleFiles: React.Dispatch<React.SetStateAction<string[]>>;
  setHighlightedMethod: React.Dispatch<React.SetStateAction<MethodJumpTarget | null>>;
  setFloatingWindows: React.Dispatch<React.SetStateAction<FloatingWindow[]>>;
  setExternalPan: React.Dispatch<React.SetStateAction<{ x: number; y: number } | null>>;
  currentZoom: number;
  sidebarCollapsed: boolean;
  sidebarWidth: number;
}

export const useMethodJump = ({
  files,
  visibleFiles,
  setVisibleFiles,
  setHighlightedMethod,
  setFloatingWindows,
  setExternalPan,
  currentZoom,
  sidebarCollapsed,
  sidebarWidth
}: UseMethodJumpParams) => {

  // メソッド定義元を見つける関数
  const findMethodDefinition = useCallback((methodName: string): MethodJumpTarget | null => {
    // 全ファイルからメソッド定義を検索
    for (const file of files) {
      if (file.methods) {
        for (const method of file.methods) {
          if (method.name === methodName) {
            return {
              methodName: method.name,
              filePath: file.path
            };
          }
        }
      }
    }
    return null;
  }, [files]);

  // メソッド呼び出し元を全て検索する関数
  const findAllMethodCallers = useCallback((methodName: string): Array<MethodJumpTarget> => {
    const callers: Array<MethodJumpTarget> = [];
    
    // 全ファイルからメソッドを呼び出しているメソッドを検索
    for (const file of files) {
      if (file.methods) {
        for (const method of file.methods) {
          // メソッドの calls 配列からmethodNameを呼び出しているかチェック
          const call = method.calls?.find(call => call.methodName === methodName);
          if (call) {
            callers.push({
              methodName: method.name,
              filePath: file.path,
              lineNumber: call.line
            });
          }
        }
      }
    }
    
    return callers;
  }, [files]);

  // メソッド呼び出し元を見つける関数（単一）
  const findMethodCaller = useCallback((methodName: string, currentFilePath: string): MethodJumpTarget | null => {
    // 現在のファイルで該当メソッドを呼び出しているメソッドを検索
    const currentFile = files.find(f => f.path === currentFilePath);
    if (currentFile && currentFile.methods) {
      for (const method of currentFile.methods) {
        // メソッドの calls 配列からmethodNameを呼び出しているかチェック
        const hasCall = method.calls?.some(call => call.methodName === methodName);
        if (hasCall) {
          return {
            methodName: method.name,
            filePath: currentFile.path
          };
        }
      }
    }
    return null;
  }, [files]);

  // メソッドハイライト処理
  const handleMethodHighlight = useCallback((method: MethodJumpTarget) => {
    // ファイルが表示されていない場合は表示する
    if (!visibleFiles.includes(method.filePath)) {
      setVisibleFiles(prev => [...prev, method.filePath]);
    }
    
    setHighlightedMethod(method);
    
    // メソッドジャンプ機能を使用してウィンドウを画面中央に表示
    // ファイルが新規表示かどうかで遅延時間を調整
    const isNewFile = !visibleFiles.includes(method.filePath);
    const jumpDelay = isNewFile ? 350 : 50; // 新規ファイルは350ms、既存ファイルは50ms
    
    setTimeout(() => {
      // メソッドジャンプ処理をインライン実装
      setHighlightedMethod(null);
      setTimeout(() => {
        setHighlightedMethod(method);
      }, 10);

      // ウィンドウを画面中央に移動する処理
      setTimeout(() => {
        setFloatingWindows(currentWindows => {
          const targetWindow = currentWindows.find(w => w.file.path === method.filePath);
          
          if (targetWindow) {
            // キャンバスオフセット(2000px, 1000px)を考慮
            const canvasOffset = { x: 2000, y: 1000 };
            
            // ウィンドウの基本位置
            const windowX = targetWindow.position.x;
            const windowY = targetWindow.position.y;
            const windowWidth = targetWindow.position.width;
            const windowHeight = targetWindow.position.height;
            
            // ウィンドウ中央にパンを移動
            const targetMethodX = windowX + windowWidth / 2;
            const targetMethodY = windowY + windowHeight / 2;
            
            const targetCanvasX = targetMethodX + canvasOffset.x;
            const targetCanvasY = targetMethodY + canvasOffset.y;
            
            // 画面中央に表示するためのパン位置を計算
            const viewportWidth = window.innerWidth - (sidebarCollapsed ? 48 : sidebarWidth);
            const viewportHeight = window.innerHeight;
            
            const newPan = {
              x: viewportWidth / 2 - targetCanvasX * currentZoom,
              y: viewportHeight / 2 - targetCanvasY * currentZoom
            };
            
            // 外部パンとして設定（ZoomableCanvasに反映される）
            setExternalPan(newPan);
            // 少し遅れてリセット（一度だけ適用）
            setTimeout(() => {
              setExternalPan(null);
            }, 50);
          }
          return currentWindows; // 状態は変更しない
        });
      }, isNewFile ? 300 : 150);
    }, jumpDelay);
  }, [visibleFiles, currentZoom, sidebarCollapsed, sidebarWidth, setVisibleFiles, setHighlightedMethod, setFloatingWindows, setExternalPan]);

  // メソッドジャンプ機能
  const handleMethodJump = useCallback((method: MethodJumpTarget) => {
    const wasHidden = !visibleFiles.includes(method.filePath);
    
    if (wasHidden) {
      setVisibleFiles(prev => [...prev, method.filePath]);
    }

    setHighlightedMethod(null);
    setTimeout(() => {
      setHighlightedMethod(method);
    }, 10);

    const waitTime = wasHidden ? 300 : 150;
    
    setTimeout(() => {
      setFloatingWindows(currentWindows => {
        const targetWindow = currentWindows.find(w => w.file.path === method.filePath);
        
        if (targetWindow) {
          // キャンバスオフセット(2000px, 1000px)を考慮
          const canvasOffset = { x: 2000, y: 1000 };
          
          // ウィンドウの基本位置
          const windowX = targetWindow.position.x;
          const windowY = targetWindow.position.y;
          const windowWidth = targetWindow.position.width;
          const windowHeight = targetWindow.position.height;
          
          // ウィンドウ中央にパンを移動（従来通り）
          const targetMethodX = windowX + windowWidth / 2;
          const targetMethodY = windowY + windowHeight / 2;
          
          // 行番号の有無によってスクロール動作が変わる
          // lineNumber有り: 呼び出し行を中央表示
          // lineNumber無し: メソッド定義行を上端表示
          
          const targetCanvasX = targetMethodX + canvasOffset.x;
          const targetCanvasY = targetMethodY + canvasOffset.y;
          
          // 画面中央に表示するためのパン位置を計算
          const viewportWidth = window.innerWidth - (sidebarCollapsed ? 48 : sidebarWidth);
          const viewportHeight = window.innerHeight;
          
          const newPan = {
            x: viewportWidth / 2 - targetCanvasX * currentZoom,
            y: viewportHeight / 2 - targetCanvasY * currentZoom
          };
          
          // 外部パンとして設定（ZoomableCanvasに反映される）
          setExternalPan(newPan);
          // 少し遅れてリセット（一度だけ適用）
          setTimeout(() => {
            setExternalPan(null);
          }, 50);
        }
        return currentWindows; // 状態は変更しない
      });
    }, waitTime);
  }, [visibleFiles, currentZoom, sidebarCollapsed, sidebarWidth, setVisibleFiles, setHighlightedMethod, setFloatingWindows, setExternalPan]);

  // import文内のメソッドクリック処理
  const handleImportMethodClick = useCallback((methodName: string) => {
    // import文内のメソッドは必ず定義元にジャンプ
    const definition = findMethodDefinition(methodName);
    if (definition) {
      handleMethodJump(definition);
      return { type: 'jump' as const, target: definition };
    } else {
      return { type: 'not_found' as const, methodName };
    }
  }, [findMethodDefinition, handleMethodJump]);

  // メソッククリック時の処理
  const handleMethodClick = useCallback((methodName: string, currentFilePath: string) => {
    // 現在のファイルでクリックされたメソッドが定義されているかチェック
    const currentFile = files.find(f => f.path === currentFilePath);
    
    // 🎯 新API: 定義のクリック可否判定（粒度細分化）
    let isDefinedInCurrentFile = false;
    if (!MethodExclusionService.isDefinitionClickable(methodName, currentFilePath)) {
      // 除外対象メソッドは定義されていないものとして扱う
      isDefinedInCurrentFile = false;
    } else {
      isDefinedInCurrentFile = currentFile?.methods?.some(method => method.name === methodName) || false;
    }
    
    if (isDefinedInCurrentFile) {
      // 定義元メソッドの場合：呼び出し元一覧を返す
      const callers = findAllMethodCallers(methodName);
      return { type: 'callers' as const, methodName, callers };
    } else {
      // 呼び出されているメソッドの場合：定義元にジャンプ
      const definition = findMethodDefinition(methodName);
      if (definition) {
        handleMethodJump(definition);
        return { type: 'jump' as const, target: definition };
      } else {
        return { type: 'not_found' as const, methodName };
      }
    }
  }, [files, findAllMethodCallers, findMethodDefinition, handleMethodJump]);

  return {
    findMethodDefinition,
    findAllMethodCallers,
    findMethodCaller,
    handleMethodHighlight,
    handleMethodJump,
    handleMethodClick,
    handleImportMethodClick
  };
};