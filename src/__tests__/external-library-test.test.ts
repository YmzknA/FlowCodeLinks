import { replaceMethodNameInText } from '../utils/method-highlighting';

describe('External Library Method Blocking', () => {
  test('should not make external library methods clickable', () => {
    console.log('\n=== EXTERNAL LIBRARY BLOCKING TEST ===');
    
    const testCases = [
      {
        method: 'useRecoilValue',
        code: 'const user = useRecoilValue(userState);',
        expected: false, // 外部ライブラリなのでクリック不可
        description: 'Recoil library method'
      },
      {
        method: 'useState',
        code: 'const [count, setCount] = useState(0);',
        expected: false, // React Hookなのでクリック不可
        description: 'React Hook'
      },
      {
        method: 'Rampart_One',
        code: 'fontFamily: Rampart_One.style.fontFamily',
        expected: false, // Google Fontなのでクリック不可
        description: 'Google Font'
      },
      {
        method: 'userState',
        code: 'const user = useRecoilValue(userState);',
        expected: false, // 定義が存在しないのでクリック不可
        description: 'Undefined method (no definition)'
      },
      {
        method: 'useAuth',
        code: 'const { login } = useAuth();',
        expected: true, // プロジェクト定義なのでクリック可能
        description: 'Project method'
      }
    ];
    
    testCases.forEach(({ method, code, expected, description }) => {
      console.log(`\nTesting ${method} (${description}):`);
      console.log(`Code: ${code}`);
      
      // フォールバックモード（findMethodDefinitionなし）でテスト
      const result = replaceMethodNameInText(code, method, method);
      const isClickable = result.includes('data-method-name');
      
      console.log(`Result: ${result}`);
      console.log(`Is clickable: ${isClickable} (expected: ${expected})`);
      
      if (expected) {
        expect(result).toContain('data-method-name');
        console.log(`✅ ${method} is correctly clickable`);
      } else {
        expect(result).not.toContain('data-method-name');
        console.log(`✅ ${method} is correctly non-clickable`);
      }
    });
  });
});