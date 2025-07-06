/**
 * 実際のUI上でのクリック可能性問題をデバッグ
 */

import { replaceMethodNameInText } from '@/utils/method-highlighting';

describe('Real UI Clickability Debug', () => {
  test('should debug actual method highlighting behavior', () => {
    // 実際のコード例を再現
    const htmlContent = `
      <div class="line">
        <span class="line-number">10</span>
        <span class="code">const result = unknownMethod();</span>
      </div>
    `;
    
    console.log('=== DEBUGGING METHOD CLICKABILITY ===');
    console.log('Input HTML:', htmlContent);
    
    const methodName = 'unknownMethod';
    const escapedMethodName = 'unknownMethod';
    
    // 定義が見つからない場合
    const findMethodDefinition = (name: string) => {
      console.log(`Looking for definition of: ${name}`);
      return null; // 定義が見つからない
    };
    
    const findAllMethodCallers = (name: string) => {
      console.log(`Looking for callers of: ${name}`);
      return []; // 呼び出し元もない
    };
    
    const currentFilePath = 'test.ts';
    const files = [{
      path: 'test.ts',
      methods: [] // メソッド定義なし
    }];
    
    const result = replaceMethodNameInText(
      htmlContent,
      methodName,
      escapedMethodName,
      findMethodDefinition,
      findAllMethodCallers,
      currentFilePath,
      files
    );
    
    console.log('Output HTML:', result);
    console.log('Contains data-method-name:', result.includes('data-method-name'));
    console.log('Contains cursor-pointer:', result.includes('cursor-pointer'));
    
    // 定義が存在しないため、変更されるべきではない
    expect(result).toBe(htmlContent);
  });

  test('should debug with all files context available', () => {
    const htmlContent = 'const result = missingFunction();';
    
    // より現実的なファイル構成をシミュレート
    const methodName = 'missingFunction';
    const escapedMethodName = 'missingFunction';
    
    const findMethodDefinition = (name: string) => {
      console.log(`\nSearching definition for: ${name}`);
      // 全ファイルを検索するシミュレート
      const allFiles = [
        { path: 'src/utils.ts', methods: [{ name: 'helperFunction' }] },
        { path: 'src/main.ts', methods: [{ name: 'mainFunction' }] }
      ];
      
      for (const file of allFiles) {
        const found = file.methods.find(m => m.name === name);
        if (found) {
          console.log(`Found definition in: ${file.path}`);
          return { methodName: name, filePath: file.path };
        }
      }
      console.log('No definition found');
      return null;
    };
    
    const findAllMethodCallers = (name: string) => {
      console.log(`Searching callers for: ${name}`);
      return []; // 呼び出し元なし
    };
    
    const currentFilePath = 'src/component.tsx';
    const files = [
      { path: 'src/component.tsx', methods: [] },
      { path: 'src/utils.ts', methods: [{ name: 'helperFunction' }] },
      { path: 'src/main.ts', methods: [{ name: 'mainFunction' }] }
    ];
    
    console.log('\n=== FULL CONTEXT SEARCH ===');
    
    const result = replaceMethodNameInText(
      htmlContent,
      methodName,
      escapedMethodName,
      findMethodDefinition,
      findAllMethodCallers,
      currentFilePath,
      files
    );
    
    console.log('Final result:', result);
    
    // 定義が見つからないため、クリック可能にしてはいけない
    expect(result).toBe(htmlContent);
  });

  test('should verify all parameters are properly passed', () => {
    const htmlContent = 'function testMethod() { return true; }';
    const methodName = 'testMethod';
    const escapedMethodName = 'testMethod';
    
    let findMethodDefinitionCalled = false;
    let findAllMethodCallersCalled = false;
    
    const findMethodDefinition = (name: string) => {
      findMethodDefinitionCalled = true;
      console.log(`findMethodDefinition called with: ${name}`);
      return { methodName: name, filePath: 'test.ts' };
    };
    
    const findAllMethodCallers = (name: string) => {
      findAllMethodCallersCalled = true;
      console.log(`findAllMethodCallers called with: ${name}`);
      return []; // 呼び出し元なし
    };
    
    const currentFilePath = 'test.ts';
    const files = [{
      path: 'test.ts',
      methods: [{ name: 'testMethod', type: 'function' }]
    }];
    
    console.log('\n=== PARAMETER PASSING TEST ===');
    console.log('All parameters provided:', {
      hasHtml: !!htmlContent,
      hasMethodName: !!methodName,
      hasEscapedMethodName: !!escapedMethodName,
      hasFindMethodDefinition: !!findMethodDefinition,
      hasFindAllMethodCallers: !!findAllMethodCallers,
      hasCurrentFilePath: !!currentFilePath,
      hasFiles: !!files
    });
    
    const result = replaceMethodNameInText(
      htmlContent,
      methodName,
      escapedMethodName,
      findMethodDefinition,
      findAllMethodCallers,
      currentFilePath,
      files
    );
    
    console.log('Functions called:', {
      findMethodDefinitionCalled,
      findAllMethodCallersCalled
    });
    
    console.log('Result contains clickable elements:', result.includes('cursor-pointer'));
    
    // 定義されているが呼び出し元がないため、クリック不可になるべき
    expect(result).toBe(htmlContent);
    expect(findAllMethodCallersCalled).toBe(true);
  });
});