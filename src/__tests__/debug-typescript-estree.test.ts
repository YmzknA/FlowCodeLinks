import { analyzeTypeScriptWithESTree } from '@/utils/typescript-estree-analyzer';
import { ParsedFile, Language } from '@/types/codebase';

describe('TypeScript ESTree デバッグテスト', () => {
  const createTsFile = (content: string): ParsedFile => ({
    path: 'test.ts',
    language: 'typescript' as Language,
    content,
    directory: '',
    fileName: 'test.ts',
    totalLines: content.split('\n').length,
    methods: []
  });

  test('TypeScript ESTreeの基本動作確認', () => {
    console.log('Node.js環境:', typeof window === 'undefined');
    console.log('テスト環境:', process.env.NODE_ENV === 'test');
    
    const content = `
type UserData = {
  id: number;
  name: string;
};

function testFunction(): string {
  return 'test';
}
`;

    const file = createTsFile(content);
    console.log('ファイル内容の長さ:', file.content.length);
    
    const methods = analyzeTypeScriptWithESTree(file);
    console.log('解析結果:', methods);
    console.log('メソッド数:', methods.length);
    
    methods.forEach((method, index) => {
      console.log(`Method ${index}:`, {
        name: method.name,
        type: method.type,
        startLine: method.startLine,
        endLine: method.endLine
      });
    });

    // 基本的な確認
    expect(methods).toBeDefined();
    expect(methods.length).toBeGreaterThanOrEqual(1); // 最低でも関数1つは検出されるはず
  });

  test('TypeScript ESTreeライブラリの直接テスト', () => {
    try {
      // TypeScript ESTreeを直接テスト
      const tsEstree = require('@typescript-eslint/typescript-estree');
      console.log('TypeScript ESTree loaded:', !!tsEstree);
      console.log('Parse function:', !!tsEstree.parse);

      const simpleCode = 'function test() { return "hello"; }';
      const ast = tsEstree.parse(simpleCode, {
        loc: true,
        range: true
      });
      
      console.log('AST parsed successfully:', !!ast);
      console.log('AST type:', ast.type);
      console.log('AST body length:', ast.body?.length);

      expect(ast).toBeDefined();
      expect(ast.type).toBe('Program');
    } catch (error) {
      console.error('TypeScript ESTree error:', error);
      throw error;
    }
  });
});