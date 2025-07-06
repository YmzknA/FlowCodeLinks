/**
 * import文メソッドのクリック可能性デバッグ
 */

import { makeImportMethodsClickable } from '@/utils/method-highlighting';

describe('Import Methods Clickability Debug', () => {
  test('should debug useAuth import method clickability', () => {
    // 実際のpage.tsxのimport文をシミュレート
    const htmlContent = `
      <span class="token keyword">import</span> 
      <span class="token punctuation">{</span> 
      <span class="token">useAuth</span> 
      <span class="token punctuation">}</span> 
      <span class="token keyword">from</span> 
      <span class="token string">"@/api"</span>
      <span class="token punctuation">;</span>
    `;
    
    const importMethods = ['useAuth']; // import文で使用されているメソッド
    
    console.log('\n=== IMPORT METHOD CLICKABILITY DEBUG ===');
    console.log('Input HTML:', htmlContent);
    console.log('Import Methods:', importMethods);
    
    // 定義が存在する場合のテスト
    const findMethodDefinitionWithUseAuth = (methodName: string) => {
      console.log(`Looking for definition of: ${methodName}`);
      if (methodName === 'useAuth') {
        console.log('Found useAuth definition in auth.ts');
        return {
          methodName: 'useAuth',
          filePath: 'front/src/api/auth.ts'
        };
      }
      console.log(`No definition found for: ${methodName}`);
      return null;
    };
    
    const result1 = makeImportMethodsClickable(
      htmlContent,
      importMethods,
      findMethodDefinitionWithUseAuth
    );
    
    console.log('\nResult with useAuth definition:', result1);
    console.log('Contains clickable useAuth:', result1.includes('data-method-name="useAuth"'));
    console.log('Contains data-import-method:', result1.includes('data-import-method="true"'));
    
    // 定義が存在しない場合のテスト
    const findMethodDefinitionWithoutUseAuth = (methodName: string) => {
      console.log(`Looking for missing ${methodName}`);
      return null; // useAuthの定義が見つからない
    };
    
    const result2 = makeImportMethodsClickable(
      htmlContent,
      importMethods,
      findMethodDefinitionWithoutUseAuth
    );
    
    console.log('\nResult without useAuth definition:', result2);
    console.log('Contains clickable useAuth:', result2.includes('data-method-name="useAuth"'));
    
    // 定義が存在する場合はクリック可能、存在しない場合は不可
    expect(result1).toContain('data-method-name="useAuth"');
    expect(result1).toContain('data-import-method="true"');
    expect(result2).toBe(htmlContent); // 変更されないはず
  });

  test('should debug complex import statement', () => {
    // より複雑なimport文
    const htmlContent = `
      <div class="line">
        <span class="line-number">2</span>
        <span class="code">
          <span class="token keyword">import</span> 
          <span class="token punctuation">{</span> 
          <span class="token">useAuth</span>
          <span class="token punctuation">,</span>
          <span class="token">authClient</span> 
          <span class="token punctuation">}</span> 
          <span class="token keyword">from</span> 
          <span class="token string">"@/api"</span>
          <span class="token punctuation">;</span>
        </span>
      </div>
    `;
    
    const importMethods = ['useAuth', 'authClient'];
    
    console.log('\n=== COMPLEX IMPORT STATEMENT DEBUG ===');
    
    const findMethodDefinition = (methodName: string) => {
      console.log(`Searching for: ${methodName}`);
      if (methodName === 'useAuth') {
        return { methodName: 'useAuth', filePath: 'front/src/api/auth.ts' };
      }
      if (methodName === 'authClient') {
        return { methodName: 'authClient', filePath: 'front/src/api/auth.ts' };
      }
      return null;
    };
    
    const result = makeImportMethodsClickable(
      htmlContent,
      importMethods,
      findMethodDefinition
    );
    
    console.log('Result with complex import:', result);
    console.log('useAuth clickable:', result.includes('data-method-name="useAuth"'));
    console.log('authClient clickable:', result.includes('data-method-name="authClient"'));
    
    expect(result).toContain('data-method-name="useAuth"');
    expect(result).toContain('data-method-name="authClient"');
  });

  test('should debug HTML tag interference', () => {
    // HTMLタグが既に存在する場合の動作
    const htmlContent = `
      <span class="token keyword">import</span> 
      <span class="token punctuation">{</span> 
      <span class="token function">useAuth</span> 
      <span class="token punctuation">}</span> 
      <span class="token keyword">from</span> 
      <span class="token string">"@/api"</span>
    `;
    
    const importMethods = ['useAuth'];
    
    console.log('\n=== HTML TAG INTERFERENCE DEBUG ===');
    console.log('Input with existing tags:', htmlContent);
    
    const findMethodDefinition = (methodName: string) => {
      if (methodName === 'useAuth') {
        return { methodName: 'useAuth', filePath: 'front/src/api/auth.ts' };
      }
      return null;
    };
    
    const result = makeImportMethodsClickable(
      htmlContent,
      importMethods,
      findMethodDefinition
    );
    
    console.log('Result with tag interference:', result);
    console.log('Contains nested spans:', result.includes('</span><span'));
    
    expect(result).toContain('data-method-name="useAuth"');
  });
});