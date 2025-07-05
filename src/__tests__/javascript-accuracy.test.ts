import { analyzeMethodsInFile } from '@/utils/method-analyzer';
import { ParsedFile, Language } from '@/types/codebase';

describe('JavaScript解析精度テスト（Ruby同等レベル）', () => {
  const createJsFile = (content: string): ParsedFile => ({
    path: 'test.js',
    language: 'javascript' as Language,
    content,
    directory: '',
    fileName: 'test.js',
    totalLines: content.split('\n').length,
    methods: []
  });

  describe('制御構造の誤検出防止', () => {
    test('制御構造をメソッド定義として誤検出しない', () => {
      const content = `function processData() {
  if (condition) {
    console.log('processing');
  }
  
  for (let i = 0; i < 10; i++) {
    items.push(i);
  }
  
  while (running) {
    update();
  }
  
  switch (type) {
    case 'A':
      handleA();
      break;
  }
}`;
      
      const file = createJsFile(content);
      const methods = analyzeMethodsInFile(file);
      
      // processDataのみが検出される（制御構造は除外）
      expect(methods).toHaveLength(1);
      expect(methods[0].name).toBe('processData');
      expect(methods[0].type).toBe('function');
    });

    test('制御構造をメソッド呼び出しとして誤検出しない', () => {
      const content = `function complexLogic() {
  if (validateInput()) {
    processValidData();
  }
  
  for (const item of items) {
    transformItem(item);
  }
}

function validateInput() {
  return true;
}

function processValidData() {
  console.log('processing');
}

function transformItem(item) {
  return item;
}`;
      
      const file = createJsFile(content);
      const methods = analyzeMethodsInFile(file);
      
      const complexLogicMethod = methods.find(m => m.name === 'complexLogic');
      expect(complexLogicMethod).toBeDefined();
      
      const callNames = complexLogicMethod?.calls.map(c => c.methodName) || [];
      
      // 定義済みメソッドのみ検出される
      expect(callNames).toContain('validateInput');
      expect(callNames).toContain('processValidData');
      expect(callNames).toContain('transformItem');
      
      // 制御構造は検出されない
      expect(callNames).not.toContain('if');
      expect(callNames).not.toContain('for');
      expect(callNames).not.toContain('const');
    });
  });

  describe('コメント・文字列フィルタリング', () => {
    test('コメント内のメソッド名を誤検出しない', () => {
      const content = `function example() {
  // TODO: Call setupDatabase() method later
  /* 
   * Use connectToServer() to establish connection
   * Remember to call cleanup() when done
   */
  
  const result = actualMethod(); // This should be detected
  return result;
}

function actualMethod() {
  return 'result';
}`;
      
      const file = createJsFile(content);
      const methods = analyzeMethodsInFile(file);
      
      const exampleMethod = methods.find(m => m.name === 'example');
      const callNames = exampleMethod?.calls.map(c => c.methodName) || [];
      
      // 実際のメソッド呼び出しのみ検出
      expect(callNames).toContain('actualMethod');
      
      // コメント内のメソッド名は検出されない
      expect(callNames).not.toContain('setupDatabase');
      expect(callNames).not.toContain('connectToServer');
      expect(callNames).not.toContain('cleanup');
    });

    test('文字列リテラル内のメソッド名を誤検出しない', () => {
      const content = `function messageHandler() {
  const helpMessage = "Use getData() to fetch information";
  const template = 'Call processData() when ready';
  const dynamicMessage = \`Execute runAnalysis() to start\`;
  
  // 実際のメソッド呼び出し
  const data = realMethod();
  logMessage(helpMessage);
  
  return data;
}

function realMethod() {
  return {};
}

function logMessage(msg) {
  console.log(msg);
}`;
      
      const file = createJsFile(content);
      const methods = analyzeMethodsInFile(file);
      
      const messageMethod = methods.find(m => m.name === 'messageHandler');
      const callNames = messageMethod?.calls.map(c => c.methodName) || [];
      
      // 実際のメソッド呼び出しのみ検出
      expect(callNames).toContain('realMethod');
      expect(callNames).toContain('logMessage');
      
      // 文字列内のメソッド名は検出されない
      expect(callNames).not.toContain('getData');
      expect(callNames).not.toContain('processData');
      expect(callNames).not.toContain('runAnalysis');
    });
  });

  describe('定義済みメソッドフィルタリング', () => {
    test('定義済みメソッドのみを呼び出しとして検出', () => {
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
      const callNames = processMethod?.calls.map(c => c.methodName) || [];
      
      // 定義済みメソッドは検出される
      expect(callNames).toContain('validateUser');
      expect(callNames).toContain('saveToDatabase');
      
      // 未定義メソッドは検出されない（Ruby同様の厳密なフィルタリング）
      expect(callNames).not.toContain('unknownMethod');
      expect(callNames).not.toContain('randomFunction');
      
      // ビルトインメソッドは除外される
      expect(callNames).not.toContain('log');
    });

    test('フレームワークメソッドは検出される', () => {
      const content = `function reactComponent() {
  const [state, setState] = useState(0);
  
  useEffect(() => {
    fetchData();
  }, []);
  
  const handleClick = useCallback(() => {
    updateCounter();
  }, []);
  
  return <div onClick={handleClick}>{state}</div>;
}

function fetchData() {
  // fetch logic
}

function updateCounter() {
  // update logic
}`;
      
      const file = createJsFile(content);
      const methods = analyzeMethodsInFile(file);
      
      const componentMethod = methods.find(m => m.name === 'reactComponent');
      const callNames = componentMethod?.calls.map(c => c.methodName) || [];
      
      // フレームワークメソッドは検出される
      expect(callNames).toContain('useState');
      expect(callNames).toContain('useEffect');
      expect(callNames).toContain('useCallback');
      
      // 定義済みメソッドも検出される
      expect(callNames).toContain('fetchData');
      expect(callNames).toContain('updateCounter');
    });
  });

  describe('ドット記法・オプショナルチェイニング', () => {
    test('ドット記法のメソッド呼び出しを正しく検出', () => {
      const content = `function objectMethods() {
  user.validateEmail();
  data.processItems();
  service.connectToDatabase();
  
  // チェーンメソッド
  items.map(transformItem).filter(isValid).forEach(processItem);
  
  return result;
}

function transformItem(item) {
  return item;
}

function isValid(item) {
  return true;
}

function processItem(item) {
  // process
}`;
      
      const file = createJsFile(content);
      const methods = analyzeMethodsInFile(file);
      
      const objectMethod = methods.find(m => m.name === 'objectMethods');
      const callNames = objectMethod?.calls.map(c => c.methodName) || [];
      
      // 定義済みメソッドのドット記法呼び出しが検出される
      expect(callNames).toContain('transformItem');
      expect(callNames).toContain('isValid');
      expect(callNames).toContain('processItem');
      
      // 未定義メソッドは検出されない
      expect(callNames).not.toContain('validateEmail');
      expect(callNames).not.toContain('processItems');
      expect(callNames).not.toContain('connectToDatabase');
    });

    test('オプショナルチェイニングを正しく検出', () => {
      const content = `function optionalMethods() {
  user?.notify?.();
  data?.transform?.(processData);
  service?.connect?.();
  
  return result;
}

function processData(data) {
  return data;
}`;
      
      const file = createJsFile(content);
      const methods = analyzeMethodsInFile(file);
      
      const optionalMethod = methods.find(m => m.name === 'optionalMethods');
      const callNames = optionalMethod?.calls.map(c => c.methodName) || [];
      
      // 定義済みメソッドのオプショナルチェイニングが検出される
      expect(callNames).toContain('processData');
      
      // 未定義メソッドは検出されない
      expect(callNames).not.toContain('notify');
      expect(callNames).not.toContain('transform');
      expect(callNames).not.toContain('connect');
    });
  });
});