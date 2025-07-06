import { replaceMethodNameInText } from '../utils/method-highlighting';

describe('userState Debug Test', () => {
  test('should debug why userState is clickable', () => {
    console.log('\n=== USERSTATE DEBUG TEST ===');
    
    // モック: 定義が見つからない関数
    const mockFindMethodDefinition = (methodName: string) => {
      console.log(`[DEBUG] findMethodDefinition called for: ${methodName}`);
      console.log(`[DEBUG] Returning: null (no definition found)`);
      return null;
    };
    
    const testCode = 'const user = useRecoilValue(userState);';
    console.log(`\nTesting: ${testCode}`);
    
    // 1. スマートモード（定義検索あり）
    console.log('\n--- Smart Mode (with findMethodDefinition) ---');
    const smartResult = replaceMethodNameInText(
      testCode, 
      'userState', 
      'userState',
      mockFindMethodDefinition
    );
    console.log(`Result: ${smartResult}`);
    console.log(`Is clickable: ${smartResult.includes('data-method-name')}`);
    
    // 2. フォールバックモード（定義検索なし）
    console.log('\n--- Fallback Mode (no findMethodDefinition) ---');
    const fallbackResult = replaceMethodNameInText(
      testCode, 
      'userState', 
      'userState'
    );
    console.log(`Result: ${fallbackResult}`);
    console.log(`Is clickable: ${fallbackResult.includes('data-method-name')}`);
    
    // 3. 外部ライブラリチェック
    console.log('\n--- External Library Check ---');
    const externalLibraryMethods = new Set([
      'useRecoilValue', 'useRecoilState', 'useSetRecoilState',
      'useState', 'useEffect', 'useCallback', 'useMemo', 'useRef', 'useContext',
      'axios', 'fetch',
      'console', 'setTimeout', 'setInterval', 'JSON', 'Object', 'Array',
      'Rampart_One', 'Inter', 'Roboto', 'Open_Sans', 'Poppins', 'Nunito', 'Lato', 'Montserrat',
      'Source_Sans_Pro', 'Oswald', 'Raleway', 'PT_Sans', 'Merriweather', 'Ubuntu', 'Playfair_Display'
    ]);
    
    console.log(`userState in EXTERNAL_LIBRARY_METHODS: ${externalLibraryMethods.has('userState')}`);
    
    // 4. パターンマッチング
    const externalPatterns = [
      /^use[A-Z]/, // React Hooks (useXxx)
      /^[A-Z][a-z]*_[A-Z]/, // Google Fonts
      /^[A-Z]+$/, // 全大文字
    ];
    
    console.log('\n--- Pattern Matching ---');
    externalPatterns.forEach((pattern, index) => {
      const matches = pattern.test('userState');
      console.log(`Pattern ${index + 1} (${pattern}): ${matches}`);
    });
    
    const knownProjectMethods = new Set(['useAuth', 'useUser', 'useProfile']);
    console.log(`userState in knownProjectMethods: ${knownProjectMethods.has('userState')}`);
    
    // 期待結果
    console.log('\n--- Expected Behavior ---');
    console.log('✅ Smart mode: Should be NON-clickable (definition not found)');
    console.log('✅ Fallback mode: Should be NON-clickable (not in knownProjectMethods)');
    
    // テスト検証
    expect(smartResult).not.toContain('data-method-name');
    expect(fallbackResult).not.toContain('data-method-name');
  });
});