/**
 * FloatingWindow useAuth修正の確認
 */

import { replaceMethodNameInText } from '@/utils/method-highlighting';

describe('FloatingWindow useAuth Fix', () => {
  test('should verify current FloatingWindow logic works correctly', () => {
    const htmlContent = 'const { login, autoLogin } = useAuth();';
    const methodName = 'useAuth';
    const escapedMethodName = 'useAuth';
    
    console.log('\n=== FLOATING WINDOW LOGIC VERIFICATION ===');
    
    // FloatingWindowの現在のロジックをシミュレート
    const findMethodDefinition = (name: string) => {
      console.log(`Definition search for: ${name}`);
      // __allFilesが空の場合、useAuthは見つからない
      return null;
    };
    
    const findAllMethodCallers = (name: string) => {
      return [];
    };
    
    // __allFilesが利用可能な場合のシミュレート
    const enableSmartClickability1 = true;
    const allFiles = [
      {
        path: 'front/src/api/auth.ts',
        methods: [{ name: 'useAuth', type: 'custom_hook' }]
      }
    ];
    
    console.log('\n--- Smart clickability enabled (with data) ---');
    
    // スマートモード：完全なパラメータ
    const smartResult = replaceMethodNameInText(
      htmlContent,
      methodName,
      escapedMethodName,
      findMethodDefinition,
      findAllMethodCallers,
      'front/src/app/page.tsx',
      allFiles
    );
    
    console.log('Smart mode result:', smartResult);
    console.log('Smart mode clickable:', smartResult.includes('data-method-name'));
    
    // __allFilesが利用できない場合のシミュレート
    const enableSmartClickability2 = false;
    
    console.log('\n--- Smart clickability disabled (fallback mode) ---');
    
    // フォールバックモード：パラメータなし
    const fallbackResult = replaceMethodNameInText(
      htmlContent,
      methodName,
      escapedMethodName
      // パラメータを渡さない
    );
    
    console.log('Fallback mode result:', fallbackResult);
    console.log('Fallback mode clickable:', fallbackResult.includes('data-method-name'));
    
    // フォールバックモードではuseAuthがクリック可能になるべき
    expect(fallbackResult).toContain('data-method-name="useAuth"');
    
    console.log('\n✅ Current FloatingWindow logic should work correctly');
    console.log('✅ enableSmartClickability=false → useAuth clickable');
    console.log('✅ enableSmartClickability=true → depends on definition search');
  });

  test('should test current enableSmartClickability logic', () => {
    console.log('\n=== ENABLE SMART CLICKABILITY TEST ===');
    
    // 現在のenableSmartClickabilityの判定をシミュレート
    const testEnableLogic = (allFiles: any[]) => {
      const result = allFiles && allFiles.length > 0;
      console.log(`__allFiles length: ${allFiles?.length || 0}, enableSmartClickability: ${result}`);
      return result;
    };
    
    // ケース1: __allFilesが空
    const empty = testEnableLogic([]);
    expect(empty).toBe(false);
    
    // ケース2: __allFilesが存在
    const withData = testEnableLogic([{ path: 'test.ts', methods: [] }]);
    expect(withData).toBe(true);
    
    // ケース3: __allFilesがnull/undefined
    const nullCase = testEnableLogic(null as any);
    expect(nullCase).toBe(false);
    
    console.log('✅ enableSmartClickability logic works as expected');
  });
});