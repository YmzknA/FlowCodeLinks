import { analyzeMethodsInFile } from '@/utils/method-analyzer';
import { ParsedFile, Language } from '@/types/codebase';

describe('Debug Real Test', () => {
  const createJsFile = (content: string): ParsedFile => ({
    path: 'test.js',
    language: 'javascript' as Language,
    content,
    directory: '',
    fileName: 'test.js',
    totalLines: content.split('\n').length,
    methods: []
  });

  test('Check actual method detection', () => {
    const content = `function processUser(user) {
  // 定義済みメソッド
  validateUser(user);
  saveToDatabase(user);
  
  // 未定義メソッド（変数として除外される）
  unknownMethod(user);
  randomFunction(user);
  
  // フレームワークメソッド
  console.log('User processed');
  
  return user;
}

function validateUser(user) {
  return user.email && user.name;
}

function saveToDatabase(user) {
  // save logic
}`;
    
    const file = createJsFile(content);
    const methods = analyzeMethodsInFile(file);
    
    const processMethod = methods.find(m => m.name === 'processUser');
    console.log('ProcessUser calls:', processMethod?.calls.map(c => c.methodName));
    
    expect(methods.length).toBeGreaterThan(0);
  });
});