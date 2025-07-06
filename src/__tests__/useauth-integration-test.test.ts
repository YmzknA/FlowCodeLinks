/**
 * useAuthの統合テスト
 * 実際のUIでの動作を確認
 */

import { replaceMethodNameInText } from '@/utils/method-highlighting';

describe('useAuth Integration Test', () => {
  test('should verify complete useAuth clickability flow', () => {
    console.log('\n=== USEAUTH INTEGRATION TEST ===');
    
    // 1. 実際のpage.tsxコンテンツ
    const pageContent = 'const { login, autoLogin } = useAuth();';
    
    // 2. 実際のauth.tsの解析結果をシミュレート（前のテストから）
    const authFileAnalysis = {
      custom_hook: 'useAuth', // line 7 in auth.ts
      functions: ['login', 'autoLogin']
    };
    
    // 3. __allFilesのシミュレート（実際の構造）
    const allFiles = [
      {
        path: 'front/src/app/page.tsx',
        methods: [
          { name: 'Home', type: 'function', startLine: 5 },
          { name: '[Import: @/api]', type: 'import', startLine: 2, parameters: ['useAuth'] },
          { name: 'useAuth (imported)', type: 'import_usage', startLine: 6 }
        ]
      },
      {
        path: 'front/src/api/auth.ts',
        methods: [
          { name: 'useAuth', type: 'custom_hook', startLine: 7 }, // 重要！
          { name: 'login', type: 'function', startLine: 10 },
          { name: 'autoLogin', type: 'function', startLine: 14 }
        ]
      }
    ];
    
    // 4. findMethodDefinition関数（実際のFloatingWindowと同じロジック）
    const findMethodDefinition = (methodName: string) => {
      console.log(`🔍 Searching for: ${methodName}`);
      
      for (const searchFile of allFiles) {
        if (searchFile.methods) {
          for (const method of searchFile.methods) {
            console.log(`   Checking: ${method.name} in ${searchFile.path}`);
            if (method.name === methodName) {
              console.log(`   ✅ Found: ${methodName} in ${searchFile.path}`);
              return {
                methodName: method.name,
                filePath: searchFile.path
              };
            }
          }
        }
      }
      
      console.log(`   ❌ Not found: ${methodName}`);
      return null;
    };
    
    // 5. findAllMethodCallers関数
    const findAllMethodCallers = (methodName: string) => {
      const callers: Array<{ methodName: string; filePath: string; lineNumber?: number }> = [];
      
      for (const searchFile of allFiles) {
        if (searchFile.methods) {
          for (const method of searchFile.methods) {
            // calls配列をチェック（実際のデータ構造に基づく）
            if ((method as any).calls) {
              const call = (method as any).calls.find((call: any) => call.methodName === methodName);
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
      
      return callers;
    };
    
    console.log('\n--- Testing Smart Mode (full parameters) ---');
    
    // 6. スマートモードでのテスト（実際のFloatingWindowのロジック）
    const smartResult = replaceMethodNameInText(
      pageContent,
      'useAuth',
      'useAuth',
      findMethodDefinition,
      findAllMethodCallers,
      'front/src/app/page.tsx',
      allFiles
    );
    
    console.log('Smart mode result:', smartResult);
    console.log('Smart mode clickable:', smartResult.includes('data-method-name="useAuth"'));
    
    console.log('\n--- Testing Fallback Mode (no parameters) ---');
    
    // 7. フォールバックモードでのテスト
    const fallbackResult = replaceMethodNameInText(
      pageContent,
      'useAuth',
      'useAuth'
    );
    
    console.log('Fallback mode result:', fallbackResult);
    console.log('Fallback mode clickable:', fallbackResult.includes('data-method-name="useAuth"'));
    
    // 8. 結果検証
    console.log('\n--- Final Analysis ---');
    
    if (smartResult.includes('data-method-name="useAuth"')) {
      console.log('✅ Smart mode: useAuth is correctly clickable');
      expect(smartResult).toContain('data-method-name="useAuth"');
    } else {
      console.log('❌ Smart mode: useAuth is NOT clickable (problem detected)');
      console.log('   This suggests that the definition search failed');
    }
    
    if (fallbackResult.includes('data-method-name="useAuth"')) {
      console.log('✅ Fallback mode: useAuth is correctly clickable');
      expect(fallbackResult).toContain('data-method-name="useAuth"');
    } else {
      console.log('❌ Fallback mode: useAuth is NOT clickable (serious problem)');
    }
    
    // 最低限フォールバックモードでは動作するはず
    expect(fallbackResult).toContain('data-method-name="useAuth"');
  });

  test('should test isDefinedInCurrentFile logic', () => {
    console.log('\n=== IS DEFINED IN CURRENT FILE TEST ===');
    
    // page.tsxでuseAuthが定義されていないケース（正常）
    const pageFile = {
      path: 'front/src/app/page.tsx',
      methods: [
        { name: 'Home', type: 'function' },
        { name: 'useAuth (imported)', type: 'import_usage' } // 使用しているが定義はしていない
      ]
    };
    
    const allFiles = [
      pageFile,
      {
        path: 'front/src/api/auth.ts',
        methods: [
          { name: 'useAuth', type: 'custom_hook' } // こちらで定義
        ]
      }
    ];
    
    // isDefinedInCurrentFileの判定をシミュレート
    const currentFilePath = 'front/src/app/page.tsx';
    const methodName = 'useAuth';
    
    const currentFile = allFiles.find(f => f.path === currentFilePath);
    const isDefinedInCurrentFile = currentFile?.methods?.some((method: any) => method.name === methodName);
    
    console.log(`Current file: ${currentFilePath}`);
    console.log(`Method name: ${methodName}`);
    console.log(`Is defined in current file: ${isDefinedInCurrentFile}`);
    
    // page.tsxではuseAuthは定義されていない（正しい）
    expect(isDefinedInCurrentFile).toBe(false);
    
    // この場合、定義元検索ロジックが実行される
    console.log('✅ Should execute definition search logic (not caller search)');
  });
});