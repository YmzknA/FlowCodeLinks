/**
 * フォールバック時のクリック可能性テスト
 * __allFilesが利用できない場合の動作確認
 */

import { replaceMethodNameInText } from '@/utils/method-highlighting';

// ウィンドウオブジェクトのモック設定用
const mockWindow = (allFiles: any[] | null = null) => {
  if (allFiles) {
    (global.window as any).__allFiles = allFiles;
  } else {
    delete (global.window as any).__allFiles;
  }
};

describe('Fallback Clickability', () => {
  beforeEach(() => {
    // 各テスト前にウィンドウオブジェクトをクリア
    delete (global.window as any).__allFiles;
  });

  test('should not make undefined methods clickable in fallback mode', () => {
    const htmlContent = 'function test() { undefinedMethod(); }';
    const methodName = 'undefinedMethod';
    const escapedMethodName = 'undefinedMethod';
    
    // 定義が見つからない場合
    const findMethodDefinition = (name: string) => {
      return null; // 定義が見つからない
    };
    
    // フォールバック時（__allFilesが利用できない）の動作をシミュレート
    // findAllMethodCallersとcurrentFilePathを提供しない場合
    const result = replaceMethodNameInText(
      htmlContent,
      methodName,
      escapedMethodName,
      findMethodDefinition
      // findAllMethodCallersやcurrentFilePathは未提供（フォールバック状況）
    );
    
    // 定義が存在しないため、クリック可能にしてはいけない
    expect(result).toBe(htmlContent);
    expect(result).not.toContain('data-method-name');
    expect(result).not.toContain('cursor-pointer');
  });

  test('should make defined methods clickable in fallback mode', () => {
    const htmlContent = 'function test() { definedMethod(); }';
    const methodName = 'definedMethod';
    const escapedMethodName = 'definedMethod';
    
    // 定義が存在する場合
    const findMethodDefinition = (name: string) => {
      if (name === 'definedMethod') {
        return { methodName: name, filePath: 'utils.ts' };
      }
      return null;
    };
    
    // フォールバック時の動作テスト
    const result = replaceMethodNameInText(
      htmlContent,
      methodName,
      escapedMethodName,
      findMethodDefinition
    );
    
    // 定義が存在するため、クリック可能になるべき
    expect(result).toContain('data-method-name="definedMethod"');
    expect(result).toContain('cursor-pointer');
  });

  test('should handle mixed defined and undefined methods', () => {
    const htmlContent = 'function test() { definedMethod(); undefinedMethod(); }';
    
    // definedMethodの処理
    const findMethodDefinition = (name: string) => {
      if (name === 'definedMethod') {
        return { methodName: name, filePath: 'utils.ts' };
      }
      return null; // undefinedMethodは定義なし
    };
    
    // definedMethodを処理
    let result = replaceMethodNameInText(
      htmlContent,
      'definedMethod',
      'definedMethod',
      findMethodDefinition
    );
    
    // undefinedMethodを処理
    result = replaceMethodNameInText(
      result,
      'undefinedMethod',
      'undefinedMethod',
      findMethodDefinition
    );
    
    // definedMethodはクリック可能、undefinedMethodはクリック不可
    expect(result).toContain('data-method-name="definedMethod"');
    expect(result).not.toContain('data-method-name="undefinedMethod"');
  });
});