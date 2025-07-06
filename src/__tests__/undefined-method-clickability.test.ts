/**
 * 定義が存在しないメソッドのクリック可能性テスト
 * 飛ぶ先がない呼び出し元はクリック不可にする
 */

import { replaceMethodNameInText } from '@/utils/method-highlighting';

describe('Undefined Method Clickability', () => {
  test('should not make methods clickable when no definition exists', () => {
    const html = 'const result = undefinedMethod();';
    const methodName = 'undefinedMethod';
    const escapedMethodName = 'undefinedMethod';
    
    // 定義が見つからないfindMethodDefinition関数
    const findMethodDefinition = (name: string) => {
      if (name === 'undefinedMethod') {
        return null; // 定義が存在しない
      }
      return { methodName: name, filePath: 'somewhere.ts' };
    };
    
    // 呼び出し元は存在しない
    const findAllMethodCallers = (name: string) => {
      return []; // 呼び出し元なし
    };
    
    const currentFilePath = 'test.ts';
    const files = [{
      path: 'test.ts',
      methods: [] // undefinedMethodの定義は存在しない
    }];
    
    const result = replaceMethodNameInText(
      html,
      methodName,
      escapedMethodName,
      findMethodDefinition,
      findAllMethodCallers,
      currentFilePath,
      files
    );
    
    // 定義が存在しないため、クリック可能にしてはいけない
    expect(result).toBe(html); // 元のHTMLと同じ（置換されていない）
    expect(result).not.toContain('data-method-name');
    expect(result).not.toContain('cursor-pointer');
  });

  test('should not make caller methods clickable when definition not found', () => {
    const html = 'function caller() { undefinedMethod(); }';
    const methodName = 'undefinedMethod';
    const escapedMethodName = 'undefinedMethod';
    
    // 定義が見つからないfindMethodDefinition関数
    const findMethodDefinition = (name: string) => {
      return null; // どのメソッドも定義が見つからない
    };
    
    // 呼び出し元は存在する（caller関数）
    const findAllMethodCallers = (name: string) => {
      if (name === 'undefinedMethod') {
        return [{ methodName: 'caller', filePath: 'test.ts', lineNumber: 1 }];
      }
      return [];
    };
    
    const currentFilePath = 'test.ts';
    const files = [{
      path: 'test.ts',
      methods: [
        { name: 'caller', type: 'function' } // callerは定義されているが、undefinedMethodは未定義
      ]
    }];
    
    const result = replaceMethodNameInText(
      html,
      methodName,
      escapedMethodName,
      findMethodDefinition,
      findAllMethodCallers,
      currentFilePath,
      files
    );
    
    // 定義が存在しないため、クリック可能にしてはいけない
    expect(result).toBe(html);
    expect(result).not.toContain('data-method-name="undefinedMethod"');
  });

  test('should make methods clickable when definition exists', () => {
    const html = 'const result = definedMethod();';
    const methodName = 'definedMethod';
    const escapedMethodName = 'definedMethod';
    
    // 定義が存在するfindMethodDefinition関数
    const findMethodDefinition = (name: string) => {
      if (name === 'definedMethod') {
        return { methodName: name, filePath: 'utils.ts' };
      }
      return null;
    };
    
    const findAllMethodCallers = (name: string) => [];
    
    const currentFilePath = 'test.ts';
    const files = [{
      path: 'test.ts',
      methods: [] // 現在のファイルには定義されていない（呼び出し元）
    }];
    
    const result = replaceMethodNameInText(
      html,
      methodName,
      escapedMethodName,
      findMethodDefinition,
      findAllMethodCallers,
      currentFilePath,
      files
    );
    
    // 定義が存在するため、クリック可能にする
    expect(result).toContain('data-method-name="definedMethod"');
    expect(result).toContain('cursor-pointer');
  });

  test('should make defined methods clickable when they have callers', () => {
    const html = 'function definedMethod() { return true; }';
    const methodName = 'definedMethod';
    const escapedMethodName = 'definedMethod';
    
    const findMethodDefinition = (name: string) => {
      return { methodName: name, filePath: 'test.ts' }; // 定義は存在
    };
    
    // 呼び出し元が存在する
    const findAllMethodCallers = (name: string) => {
      if (name === 'definedMethod') {
        return [{ methodName: 'caller', filePath: 'app.ts', lineNumber: 10 }];
      }
      return [];
    };
    
    const currentFilePath = 'test.ts';
    const files = [{
      path: 'test.ts',
      methods: [
        { name: 'definedMethod', type: 'function' } // 現在のファイルで定義されている
      ]
    }];
    
    const result = replaceMethodNameInText(
      html,
      methodName,
      escapedMethodName,
      findMethodDefinition,
      findAllMethodCallers,
      currentFilePath,
      files
    );
    
    // 呼び出し元が存在するため、クリック可能（モーダル表示用）
    expect(result).toContain('data-method-name="definedMethod"');
    expect(result).toContain('cursor-pointer');
  });

  test('should not make defined methods clickable when they have no callers', () => {
    const html = 'function orphanMethod() { return true; }';
    const methodName = 'orphanMethod';
    const escapedMethodName = 'orphanMethod';
    
    const findMethodDefinition = (name: string) => {
      return { methodName: name, filePath: 'test.ts' }; // 定義は存在
    };
    
    // 呼び出し元が存在しない
    const findAllMethodCallers = (name: string) => {
      return []; // 誰からも呼ばれていない
    };
    
    const currentFilePath = 'test.ts';
    const files = [{
      path: 'test.ts',
      methods: [
        { name: 'orphanMethod', type: 'function' } // 現在のファイルで定義されているが使われていない
      ]
    }];
    
    const result = replaceMethodNameInText(
      html,
      methodName,
      escapedMethodName,
      findMethodDefinition,
      findAllMethodCallers,
      currentFilePath,
      files
    );
    
    // 呼び出し元が存在しないため、クリック不可（モーダル表示する内容がない）
    expect(result).toBe(html);
    expect(result).not.toContain('data-method-name="orphanMethod"');
  });
});