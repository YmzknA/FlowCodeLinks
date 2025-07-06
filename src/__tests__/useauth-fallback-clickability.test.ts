/**
 * useAuthフォールバック時のクリック可能性デバッグ
 */

import { replaceMethodNameInText } from '@/utils/method-highlighting';

describe('useAuth Fallback Clickability', () => {
  test('should make useAuth clickable even when definition not found in fallback mode', () => {
    const htmlContent = 'const { login, autoLogin } = useAuth();';
    const methodName = 'useAuth';
    const escapedMethodName = 'useAuth';
    
    console.log('\n=== USEAUTH FALLBACK SCENARIO ===');
    
    // findMethodDefinitionがuseAuthを見つけられない場合
    const findMethodDefinition = (name: string) => {
      console.log(`Looking for ${name} in limited file scope`);
      // __allFilesが利用できない場合、useAuthの定義は見つからない
      return null;
    };
    
    // 問題のケース：findMethodDefinitionのみが提供される場合
    console.log('Testing with findMethodDefinition only:');
    const resultWithDefinitionCheck = replaceMethodNameInText(
      htmlContent,
      methodName,
      escapedMethodName,
      findMethodDefinition
      // 他のパラメータは未提供
    );
    
    console.log('Result with definition check:', resultWithDefinitionCheck);
    console.log('Is clickable:', resultWithDefinitionCheck.includes('data-method-name'));
    
    // 正しいケース：パラメータを一切渡さない場合
    console.log('\nTesting without any parameters:');
    const resultWithoutParams = replaceMethodNameInText(
      htmlContent,
      methodName,
      escapedMethodName
      // 判定関数を一切渡さない
    );
    
    console.log('Result without params:', resultWithoutParams);
    console.log('Is clickable:', resultWithoutParams.includes('data-method-name'));
    
    // フォールバック時は、findMethodDefinitionを渡すべきではない
    // 渡さない場合は全てクリック可能になる
    expect(resultWithoutParams).toContain('data-method-name="useAuth"');
    
    // findMethodDefinitionを渡すと、定義が見つからずクリック不可になる（問題）
    expect(resultWithDefinitionCheck).toBe(htmlContent);
  });

  test('should debug FloatingWindow scenario', () => {
    // FloatingWindowでの実際の動作をシミュレート
    const htmlContent = 'const { login, autoLogin } = useAuth();';
    const methodName = 'useAuth';
    const escapedMethodName = 'useAuth';
    
    console.log('\n=== FLOATING WINDOW SIMULATION ===');
    
    // FloatingWindowでfindMethodDefinitionが常に定義されている問題
    const findMethodDefinition = (name: string) => {
      console.log(`FloatingWindow scope findMethodDefinition called for: ${name}`);
      // __allFilesが空や利用不可の場合、外部ファイルの定義は見つからない
      const allFiles = []; // 空配列をシミュレート
      for (const file of allFiles) {
        // 空なので何も見つからない
      }
      return null;
    };
    
    // 問題のケース：常にfindMethodDefinitionが存在する
    const problematicResult = replaceMethodNameInText(
      htmlContent,
      methodName,
      escapedMethodName,
      findMethodDefinition
    );
    
    console.log('FloatingWindow problematic result:', problematicResult);
    
    // 解決策：条件付きでfindMethodDefinitionを渡す
    const enableSmartClickability = false; // __allFilesが利用できない場合
    
    const fixedResult = enableSmartClickability 
      ? replaceMethodNameInText(htmlContent, methodName, escapedMethodName, findMethodDefinition)
      : replaceMethodNameInText(htmlContent, methodName, escapedMethodName);
      
    console.log('Fixed result with conditional passing:', fixedResult);
    console.log('Fixed is clickable:', fixedResult.includes('data-method-name'));
    
    expect(fixedResult).toContain('data-method-name="useAuth"');
  });
});