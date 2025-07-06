/**
 * useAuthのクリック可能性問題をデバッグ
 */

import { replaceMethodNameInText } from '@/utils/method-highlighting';

describe('useAuth Clickability Debug', () => {
  test('should debug useAuth definition search', () => {
    const htmlContent = 'const { login, autoLogin } = useAuth();';
    const methodName = 'useAuth';
    const escapedMethodName = 'useAuth';
    
    console.log('\n=== USEAUTH DEFINITION SEARCH DEBUG ===');
    
    // 実際のUIで使用される全ファイルの構造をシミュレート
    const allFiles = [
      {
        path: 'front/src/app/page.tsx',
        methods: [
          { name: 'Home', type: 'function' },
          { name: '[Import: @/api]', type: 'import' },
          { name: 'useAuth (imported)', type: 'import_usage' },
          // ... その他のメソッド
        ]
      },
      {
        path: 'front/src/api/index.ts', // useAuthの定義がありそうなファイル
        methods: [
          { name: 'useAuth', type: 'custom_hook' }, // ここに定義があるとする
          { name: 'login', type: 'function' },
          { name: 'autoLogin', type: 'function' }
        ]
      },
      {
        path: 'front/src/utils/helpers.ts',
        methods: [
          { name: 'formatDate', type: 'function' },
          { name: 'validateInput', type: 'function' }
        ]
      }
    ];
    
    // 定義検索関数（実際のUIと同じロジック）
    const findMethodDefinition = (name: string) => {
      console.log(`Searching definition for: ${name}`);
      
      for (const searchFile of allFiles) {
        if (searchFile.methods) {
          for (const method of searchFile.methods) {
            if (method.name === name) {
              console.log(`Found definition: ${name} in ${searchFile.path}`);
              return {
                methodName: method.name,
                filePath: searchFile.path
              };
            }
          }
        }
      }
      console.log(`No definition found for: ${name}`);
      return null;
    };
    
    // 呼び出し元検索関数
    const findAllMethodCallers = (name: string) => {
      console.log(`Searching callers for: ${name}`);
      const callers: Array<{ methodName: string; filePath: string; lineNumber?: number }> = [];
      
      for (const searchFile of allFiles) {
        if (searchFile.methods) {
          for (const method of searchFile.methods) {
            // methodにcallsプロパティがある場合のみチェック
            if ((method as any).calls) {
              const call = (method as any).calls.find((call: any) => call.methodName === name);
              if (call) {
                callers.push({
                  methodName: method.name,
                  filePath: searchFile.path,
                  lineNumber: call.line
                });
              }
            }
          }
        }
      }
      
      console.log(`Found ${callers.length} callers for ${name}:`, callers);
      return callers;
    };
    
    const currentFilePath = 'front/src/app/page.tsx';
    
    // 完全なパラメータでテスト
    console.log('\n--- Full parameter test ---');
    const resultFull = replaceMethodNameInText(
      htmlContent,
      methodName,
      escapedMethodName,
      findMethodDefinition,
      findAllMethodCallers,
      currentFilePath,
      allFiles
    );
    
    console.log('Result with full parameters:', resultFull);
    console.log('Contains clickable:', resultFull.includes('data-method-name'));
    
    // 簡易パラメータでテスト（フォールバック）
    console.log('\n--- Fallback test ---');
    const resultFallback = replaceMethodNameInText(
      htmlContent,
      methodName,
      escapedMethodName,
      findMethodDefinition
    );
    
    console.log('Result with fallback:', resultFallback);
    console.log('Contains clickable:', resultFallback.includes('data-method-name'));
    
    expect(resultFull).toContain('data-method-name="useAuth"');
    expect(resultFallback).toContain('data-method-name="useAuth"');
  });

  test('should debug missing definition scenario', () => {
    const htmlContent = 'const { login, autoLogin } = useAuth();';
    const methodName = 'useAuth';
    const escapedMethodName = 'useAuth';
    
    console.log('\n=== MISSING DEFINITION SCENARIO ===');
    
    // useAuthの定義が見つからない場合
    const allFilesWithoutUseAuth = [
      {
        path: 'front/src/app/page.tsx',
        methods: [
          { name: 'Home', type: 'function' },
          { name: 'useAuth (imported)', type: 'import_usage' }
        ]
      },
      {
        path: 'front/src/utils/helpers.ts',
        methods: [
          { name: 'formatDate', type: 'function' }
        ]
      }
    ];
    
    const findMethodDefinition = (name: string) => {
      console.log(`Searching for missing ${name}`);
      return null; // useAuthの定義が見つからない
    };
    
    const findAllMethodCallers = (name: string) => {
      return [];
    };
    
    const result = replaceMethodNameInText(
      htmlContent,
      methodName,
      escapedMethodName,
      findMethodDefinition,
      findAllMethodCallers,
      'front/src/app/page.tsx',
      allFilesWithoutUseAuth
    );
    
    console.log('Result with missing definition:', result);
    console.log('Should be non-clickable:', !result.includes('data-method-name'));
    
    // 定義が見つからない場合はクリック不可
    expect(result).toBe(htmlContent);
  });

  test('should debug currentFile method detection', () => {
    const htmlContent = 'const { login, autoLogin } = useAuth();';
    const methodName = 'useAuth';
    
    // 現在のファイルでuseAuthが定義されている場合
    const allFilesWithLocalUseAuth = [
      {
        path: 'front/src/app/page.tsx',
        methods: [
          { name: 'Home', type: 'function' },
          { name: 'useAuth', type: 'custom_hook' }, // 現在のファイルで定義
          { name: 'useAuth (imported)', type: 'import_usage' }
        ]
      }
    ];
    
    const findMethodDefinition = (name: string) => {
      if (name === 'useAuth') {
        return { methodName: name, filePath: 'front/src/app/page.tsx' };
      }
      return null;
    };
    
    const findAllMethodCallers = (name: string) => {
      if (name === 'useAuth') {
        return [
          { methodName: 'Home', filePath: 'front/src/app/page.tsx', lineNumber: 16 }
        ];
      }
      return [];
    };
    
    console.log('\n=== LOCAL DEFINITION SCENARIO ===');
    
    const result = replaceMethodNameInText(
      htmlContent,
      methodName,
      methodName,
      findMethodDefinition,
      findAllMethodCallers,
      'front/src/app/page.tsx',
      allFilesWithLocalUseAuth
    );
    
    console.log('Result with local definition:', result);
    console.log('Should be clickable (has callers):', result.includes('data-method-name'));
    
    // ローカル定義で呼び出し元がある場合はクリック可能
    expect(result).toContain('data-method-name="useAuth"');
  });
});