import { ParsedFile, Method } from '@/types/codebase';
import { MethodJumpTarget } from '@/types';
import { MethodExclusionService } from '@/services/MethodExclusionService';

/**
 * メソッド検索に関する共通ロジックを提供するユーティリティクラス
 */
export class MethodFinder {
  private files: ParsedFile[];

  constructor(files: ParsedFile[]) {
    this.files = files;
  }

  /**
   * ファイル一覧を更新
   */
  updateFiles(files: ParsedFile[]): void {
    this.files = files;
  }

  /**
   * メソッド名から定義元を検索
   */
  findMethodDefinition(methodName: string): MethodJumpTarget | null {
    for (const file of this.files) {
      if (file.methods) {
        for (const method of file.methods) {
          if (method.name === methodName) {
            // 🎯 新API: 定義のジャンプ対象可否判定（粒度細分化）
            if (!MethodExclusionService.isDefinitionJumpTarget(methodName, file.path)) {
              continue; // 除外対象メソッドはスキップ
            }
            
            return {
              methodName: method.name,
              filePath: file.path
            };
          }
        }
      }
    }
    return null;
  }

  /**
   * メソッド名から定義元を検索（UI用・除外メソッドは対象外）
   * 同じファイル内を優先して検索
   */
  findMethodDefinitionForUI(methodName: string, currentFilePath?: string): { methodName: string; filePath: string; lineNumber?: number } | null {
    // 1. 同じファイル内に定義があるかチェック（優先）
    if (currentFilePath) {
      const currentFile = this.files.find(f => f.path === currentFilePath);
      if (currentFile?.methods) {
        for (const method of currentFile.methods) {
          if (method.name === methodName) {
            // 除外対象メソッドはジャンプ対象外
            if (!MethodExclusionService.isJumpTargetMethod(methodName, currentFile.path)) {
              continue; // 除外対象メソッドはスキップ
            }
            
            return {
              methodName: method.name,
              filePath: currentFile.path,
              lineNumber: method.startLine
            };
          }
        }
      }
    }
    
    // 2. 他のファイルから検索
    for (const file of this.files) {
      if (file.path === currentFilePath) continue; // 同じファイルは既にチェック済み
      if (file.methods) {
        for (const method of file.methods) {
          if (method.name === methodName) {
            // 🎯 新API: 定義のジャンプ対象可否判定（粒度細分化）
            if (!MethodExclusionService.isDefinitionJumpTarget(methodName, file.path)) {
              continue; // 除外対象メソッドはスキップ
            }
            
            return {
              methodName: method.name,
              filePath: file.path,
              lineNumber: method.startLine
            };
          }
        }
      }
    }
    return null;
  }

  /**
   * メソッド名から定義元を検索（依存関係追跡用・除外メソッドも含む）
   * 同じファイル内を優先して検索
   */
  findMethodDefinitionForTracking(methodName: string, currentFilePath?: string): { methodName: string; filePath: string; lineNumber?: number } | null {
    // 1. 同じファイル内に定義があるかチェック（優先）
    if (currentFilePath) {
      const currentFile = this.files.find(f => f.path === currentFilePath);
      if (currentFile?.methods) {
        for (const method of currentFile.methods) {
          if (method.name === methodName) {
            return {
              methodName: method.name,
              filePath: currentFile.path,
              lineNumber: method.startLine
            };
          }
        }
      }
    }
    
    // 2. 他のファイルから検索
    for (const file of this.files) {
      if (file.path === currentFilePath) continue; // 同じファイルは既にチェック済み
      if (file.methods) {
        for (const method of file.methods) {
          if (method.name === methodName) {
            return {
              methodName: method.name,
              filePath: file.path,
              lineNumber: method.startLine
            };
          }
        }
      }
    }
    return null;
  }

  /**
   * メソッド名から全ての呼び出し元を検索
   */
  findAllMethodCallers(methodName: string): MethodJumpTarget[] {
    const callers: MethodJumpTarget[] = [];
    
    for (const file of this.files) {
      if (file.methods) {
        for (const method of file.methods) {
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
  }

  /**
   * 指定ファイル内でメソッドを呼び出している最初のメソッドを検索
   */
  findMethodCaller(methodName: string, currentFilePath: string): MethodJumpTarget | null {
    const currentFile = this.files.find(f => f.path === currentFilePath);
    if (currentFile && currentFile.methods) {
      for (const method of currentFile.methods) {
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
  }

  /**
   * メソッドが指定ファイル内で定義されているかチェック
   */
  isMethodDefinedInFile(methodName: string, filePath: string): boolean {
    const file = this.files.find(f => f.path === filePath);
    return file?.methods?.some(method => method.name === methodName) ?? false;
  }

  /**
   * メソッド名で検索（部分一致）
   */
  searchMethods(query: string): MethodJumpTarget[] {
    const results: MethodJumpTarget[] = [];
    const lowerQuery = query.toLowerCase();
    
    for (const file of this.files) {
      if (file.methods) {
        for (const method of file.methods) {
          if (method.name.toLowerCase().includes(lowerQuery)) {
            results.push({
              methodName: method.name,
              filePath: file.path
            });
          }
        }
      }
    }
    
    return results;
  }

  /**
   * ファイル内の全メソッド一覧を取得
   */
  getMethodsInFile(filePath: string): Method[] {
    const file = this.files.find(f => f.path === filePath);
    return file?.methods ?? [];
  }

  /**
   * 全メソッド一覧を取得
   */
  getAllMethods(): Method[] {
    return this.files.flatMap(file => file.methods);
  }

  /**
   * メソッドの詳細情報を取得
   */
  getMethodDetails(methodName: string, filePath?: string): Method | null {
    if (filePath) {
      const file = this.files.find(f => f.path === filePath);
      return file?.methods?.find(method => method.name === methodName) ?? null;
    }
    
    // ファイルパスが指定されていない場合は最初に見つかったものを返す
    for (const file of this.files) {
      const method = file.methods?.find(method => method.name === methodName);
      if (method) {
        return method;
      }
    }
    
    return null;
  }

  /**
   * メソッドの呼び出し関係を取得
   */
  getMethodCallRelations(methodName: string, filePath?: string): {
    callers: MethodJumpTarget[];
    callees: MethodJumpTarget[];
  } {
    const callers = this.findAllMethodCallers(methodName);
    
    const method = this.getMethodDetails(methodName, filePath);
    const callees: MethodJumpTarget[] = [];
    
    if (method?.calls) {
      for (const call of method.calls) {
        const definition = this.findMethodDefinition(call.methodName);
        if (definition) {
          callees.push({
            ...definition,
            lineNumber: call.line
          });
        }
      }
    }
    
    return { callers, callees };
  }

  /**
   * 統計情報を取得
   */
  getStatistics() {
    const totalMethods = this.getAllMethods().length;
    const filesWithMethods = this.files.filter(f => f.methods.length > 0).length;
    const totalCalls = this.getAllMethods().reduce((sum, method) => sum + (method.calls?.length ?? 0), 0);
    
    const methodsByType = this.getAllMethods().reduce((acc, method) => {
      acc[method.type] = (acc[method.type] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const methodsByFile = this.files.reduce((acc, file) => {
      acc[file.path] = file.methods.length;
      return acc;
    }, {} as Record<string, number>);
    
    return {
      totalMethods,
      filesWithMethods,
      totalCalls,
      methodsByType,
      methodsByFile,
      averageMethodsPerFile: totalMethods / this.files.length
    };
  }
}

/**
 * グローバルなMethodFinderインスタンス用のファクトリ関数
 */
export const createMethodFinder = (files: ParsedFile[]): MethodFinder => {
  return new MethodFinder(files);
};

/**
 * React Hook として使用する場合のユーティリティ
 */
export const useMethodFinder = (files: ParsedFile[]): MethodFinder => {
  // useMemoを使って最適化することも可能
  return new MethodFinder(files);
};