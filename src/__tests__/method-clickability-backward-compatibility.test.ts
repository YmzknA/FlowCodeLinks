/**
 * メソッドクリック可能性の後方互換性テスト
 * 既存の機能が引き続き動作することを確認
 */

import { replaceMethodNameInText } from '@/utils/method-highlighting';

describe('Method Clickability Backward Compatibility', () => {
  test('should maintain backward compatibility when no judgment functions provided', () => {
    const html = '<pre>function test() { someMethod(); anotherMethod(); }</pre>';
    
    // 従来通りの呼び出し（判定関数なし）
    const result1 = replaceMethodNameInText(html, 'someMethod', 'someMethod');
    const result2 = replaceMethodNameInText(result1, 'anotherMethod', 'anotherMethod');
    
    // 両方ともクリック可能になる（従来の動作）
    expect(result2).toContain('data-method-name="someMethod"');
    expect(result2).toContain('data-method-name="anotherMethod"');
    expect(result2).toContain('cursor-pointer');
  });

  test('should work with partial parameters', () => {
    const html = '<pre>function test() { partialMethod(); }</pre>';
    
    // 一部のパラメータのみ提供
    const findMethodDefinition = jest.fn().mockReturnValue({ methodName: 'partialMethod', filePath: '/test.ts' });
    
    const result = replaceMethodNameInText(
      html, 
      'partialMethod', 
      'partialMethod',
      findMethodDefinition
      // findAllMethodCallers, currentFilePath, files を省略
    );
    
    // 不完全なパラメータの場合はデフォルトでクリック可能
    expect(result).toContain('data-method-name="partialMethod"');
    expect(result).toContain('cursor-pointer');
  });

  test('should apply smart clickability only when all parameters provided', () => {
    const html = '<pre>function test() { smartMethod(); }</pre>';
    
    const findMethodDefinition = jest.fn().mockReturnValue(null); // 定義が見つからない
    const findAllMethodCallers = jest.fn().mockReturnValue([]);
    const currentFilePath = '/test.ts';
    const files = [{ path: '/test.ts', methods: [] }];
    
    const result = replaceMethodNameInText(
      html, 
      'smartMethod', 
      'smartMethod',
      findMethodDefinition,
      findAllMethodCallers,
      currentFilePath,
      files
    );
    
    // 全パラメータ提供時は詳細判定が効く
    expect(result).not.toContain('data-method-name="smartMethod"');
    expect(result).toBe(html); // 変更されない
  });

  test('should handle mixed scenarios correctly', () => {
    const html = '<pre>existingMethod(); newMethod();</pre>';
    
    // existingMethodは従来通りの処理
    const step1 = replaceMethodNameInText(html, 'existingMethod', 'existingMethod');
    
    // newMethodは詳細判定付き
    const findMethodDefinition = jest.fn().mockReturnValue({
      methodName: 'newMethod',
      filePath: '/target.ts'
    });
    const findAllMethodCallers = jest.fn().mockReturnValue([]);
    const currentFilePath = '/test.ts';
    const files = [
      { path: '/test.ts', methods: [] },
      { path: '/target.ts', methods: [{ name: 'newMethod' }] }
    ];
    
    const step2 = replaceMethodNameInText(
      step1,
      'newMethod',
      'newMethod',
      findMethodDefinition,
      findAllMethodCallers,
      currentFilePath,
      files
    );
    
    // existingMethodはクリック可能、newMethodは定義元にジャンプできるのでクリック可能
    expect(step2).toContain('data-method-name="existingMethod"');
    expect(step2).toContain('data-method-name="newMethod"');
  });

  test('should work in FloatingWindow context simulation', () => {
    // FloatingWindowでの使用パターンをシミュレート
    const html = '<pre>method1(); method2(); method3();</pre>';
    
    // __allFilesが設定されていない場合（従来動作）
    const originalAllFiles = (global as any).__allFiles;
    delete (global as any).__allFiles;
    
    let result = html;
    const methods = ['method1', 'method2', 'method3'];
    
    methods.forEach(methodName => {
      const escapedMethodName = methodName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const enableSmartClickability = (global as any).__allFiles && (global as any).__allFiles.length > 0;
      
      if (!enableSmartClickability) {
        // 従来通りの動作
        result = replaceMethodNameInText(result, methodName, escapedMethodName);
      }
    });
    
    // 全てクリック可能になる
    expect(result).toContain('data-method-name="method1"');
    expect(result).toContain('data-method-name="method2"');
    expect(result).toContain('data-method-name="method3"');
    
    // 元の状態を復元
    if (originalAllFiles) {
      (global as any).__allFiles = originalAllFiles;
    }
  });
});