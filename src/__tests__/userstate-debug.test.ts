import { replaceMethodNameInText } from '../utils/method-highlighting';

describe('userState Debug Test', () => {
  test('should debug why userState is clickable', () => {
    // Test userState clickability behavior
    
    // モック: 定義が見つからない関数
    const mockFindMethodDefinition = (methodName: string) => {
      // Mock function that finds no definition
      return null;
    };
    
    const testCode = 'const user = useRecoilValue(userState);';
    // Test code: userState usage
    
    // 1. スマートモード（定義検索あり）
    // Test smart mode (with findMethodDefinition)
    const smartResult = replaceMethodNameInText(
      testCode, 
      'userState', 
      'userState',
      mockFindMethodDefinition
    );
    
    // 2. フォールバックモード（定義検索なし）
    // Test fallback mode (no findMethodDefinition)
    const fallbackResult = replaceMethodNameInText(
      testCode, 
      'userState', 
      'userState'
    );
    
    // 3. 外部ライブラリチェック
    // Check external library patterns
    const externalLibraryMethods = new Set([
      'useRecoilValue', 'useRecoilState', 'useSetRecoilState',
      'useState', 'useEffect', 'useCallback', 'useMemo', 'useRef', 'useContext',
      'axios', 'fetch',
      'console', 'setTimeout', 'setInterval', 'JSON', 'Object', 'Array',
      'Rampart_One', 'Inter', 'Roboto', 'Open_Sans', 'Poppins', 'Nunito', 'Lato', 'Montserrat',
      'Source_Sans_Pro', 'Oswald', 'Raleway', 'PT_Sans', 'Merriweather', 'Ubuntu', 'Playfair_Display'
    ]);
    
    // Check if userState is in external library methods
    
    // 4. パターンマッチング
    const externalPatterns = [
      /^use[A-Z]/, // React Hooks (useXxx)
      /^[A-Z][a-z]*_[A-Z]/, // Google Fonts
      /^[A-Z]+$/, // 全大文字
    ];
    
    // Test pattern matching
    externalPatterns.forEach((pattern, index) => {
      const matches = pattern.test('userState');
      // Check if userState matches external patterns
    });
    
    const knownProjectMethods = new Set(['useAuth', 'useUser', 'useProfile']);
    // Check if userState is in known project methods
    
    // 期待結果
    // Expected behavior:
    // Smart mode: Should be NON-clickable (definition not found)
    // Fallback mode: Should be NON-clickable (not in knownProjectMethods)
    
    // テスト検証
    expect(smartResult).not.toContain('data-method-name');
    expect(fallbackResult).not.toContain('data-method-name');
  });
});