import { analyzeMethodsInFile } from '@/utils/method-analyzer';
import { ParsedFile, Language } from '@/types/codebase';

describe('JavaScript解析 - 網羅的テスト', () => {
  const createJsFile = (content: string): ParsedFile => ({
    path: 'test.js',
    language: 'javascript' as Language,
    content,
    directory: '',
    fileName: 'test.js',
    totalLines: content.split('\n').length,
    methods: []
  });

  describe('基本的な関数定義', () => {
    test('function宣言を検出できる', () => {
      const content = `
function calculateTotal(items) {
  return items.reduce((sum, item) => sum + item.price, 0);
}

function processOrder(order) {
  const total = calculateTotal(order.items);
  return { ...order, total };
}

async function fetchUserData(userId) {
  const response = await fetch(\`/api/users/\${userId}\`);
  return response.json();
}
`;

      const file = createJsFile(content);
      const methods = analyzeMethodsInFile(file);

      expect(methods.length).toBeGreaterThanOrEqual(3);
      
      const calculateTotalMethod = methods.find(m => m.name === 'calculateTotal');
      const processOrderMethod = methods.find(m => m.name === 'processOrder');
      const fetchUserDataMethod = methods.find(m => m.name === 'fetchUserData');

      expect(calculateTotalMethod).toBeDefined();
      expect(calculateTotalMethod?.type).toBe('function');
      expect(processOrderMethod).toBeDefined();
      expect(fetchUserDataMethod).toBeDefined();
    });

    test('アロー関数を検出できる', () => {
      const content = `
const add = (a, b) => a + b;

const multiply = (x, y) => {
  const result = x * y;
  return result;
};

const processData = async (data) => {
  const cleaned = data.filter(item => item.valid);
  return cleaned.map(item => item.value);
};

const createHandler = (type) => (event) => {
  console.log(\`Handling \${type} event\`, event);
};
`;

      const file = createJsFile(content);
      const methods = analyzeMethodsInFile(file);

      expect(methods.length).toBeGreaterThanOrEqual(4);

      const addMethod = methods.find(m => m.name === 'add');
      const multiplyMethod = methods.find(m => m.name === 'multiply');
      const processDataMethod = methods.find(m => m.name === 'processData');
      const createHandlerMethod = methods.find(m => m.name === 'createHandler');

      expect(addMethod).toBeDefined();
      expect(addMethod?.type).toBe('function');
      expect(multiplyMethod).toBeDefined();
      expect(processDataMethod).toBeDefined();
      expect(createHandlerMethod).toBeDefined();
    });
  });

  describe('クラスとメソッド', () => {
    test('ES6クラスのメソッドを検出できる', () => {
      const content = `
class UserService {
  constructor(apiClient) {
    this.apiClient = apiClient;
  }

  async getUser(id) {
    const user = await this.apiClient.get(\`/users/\${id}\`);
    return this.transformUser(user);
  }

  transformUser(rawUser) {
    return {
      id: rawUser.id,
      name: rawUser.full_name,
      email: rawUser.email_address
    };
  }

  static create(config) {
    return new UserService(config.apiClient);
  }

  #validateUser(user) {
    return user && user.id && user.email;
  }
}
`;

      const file = createJsFile(content);
      const methods = analyzeMethodsInFile(file);

      expect(methods.length).toBeGreaterThanOrEqual(4);

      const getUserMethod = methods.find(m => m.name === 'getUser');
      const transformUserMethod = methods.find(m => m.name === 'transformUser');
      const createMethod = methods.find(m => m.name === 'create');
      const validateUserMethod = methods.find(m => m.name === 'validateUser');

      expect(getUserMethod).toBeDefined();
      expect(getUserMethod?.type).toBe('method');
      expect(transformUserMethod).toBeDefined();
      expect(createMethod).toBeDefined();
      expect(createMethod?.type).toBe('class_method');
      
      // プライベートメソッドの検出
      if (validateUserMethod) {
        expect(validateUserMethod.isPrivate).toBe(true);
      }
    });

    test('プロトタイプメソッドを検出できる', () => {
      const content = `
function Calculator() {
  this.result = 0;
}

Calculator.prototype.add = function(value) {
  this.result += value;
  return this;
};

Calculator.prototype.multiply = function(value) {
  this.result *= value;
  return this;
};

Calculator.prototype.getResult = function() {
  return this.result;
};
`;

      const file = createJsFile(content);
      const methods = analyzeMethodsInFile(file);

      expect(methods.length).toBeGreaterThanOrEqual(4);

      const constructorMethod = methods.find(m => m.name === 'Calculator');
      const addMethod = methods.find(m => m.name === 'add');
      const multiplyMethod = methods.find(m => m.name === 'multiply');
      const getResultMethod = methods.find(m => m.name === 'getResult');

      expect(constructorMethod).toBeDefined();
      expect(addMethod).toBeDefined();
      expect(multiplyMethod).toBeDefined();
      expect(getResultMethod).toBeDefined();
    });
  });

  describe('オブジェクトメソッドとモジュール', () => {
    test('オブジェクトリテラル内のメソッドを検出できる', () => {
      const content = `
const utils = {
  formatCurrency(amount, currency = 'USD') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  },

  debounce: function(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  throttle: (func, limit) => {
    let inThrottle;
    return function() {
      const args = arguments;
      const context = this;
      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }
};
`;

      const file = createJsFile(content);
      const methods = analyzeMethodsInFile(file);

      const formatCurrencyMethod = methods.find(m => m.name === 'formatCurrency');
      const debounceMethod = methods.find(m => m.name === 'debounce');
      const throttleMethod = methods.find(m => m.name === 'throttle');

      expect(formatCurrencyMethod).toBeDefined();
      expect(debounceMethod).toBeDefined();
      expect(throttleMethod).toBeDefined();
    });

    test('モジュールエクスポートを検出できる', () => {
      const content = `
// 名前付きエクスポート
export function validateEmail(email) {
  const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
  return emailRegex.test(email);
}

export const hashPassword = async (password) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
};

// デフォルトエクスポート
export default class AuthService {
  constructor(config) {
    this.config = config;
  }

  async login(credentials) {
    const isValid = this.validateCredentials(credentials);
    if (!isValid) throw new Error('Invalid credentials');
    
    return this.createSession(credentials);
  }

  validateCredentials(credentials) {
    return credentials.email && credentials.password;
  }

  async createSession(credentials) {
    const user = await this.findUser(credentials.email);
    return { user, token: this.generateToken(user) };
  }
}
`;

      const file = createJsFile(content);
      const methods = analyzeMethodsInFile(file);

      const validateEmailMethod = methods.find(m => m.name === 'validateEmail');
      const hashPasswordMethod = methods.find(m => m.name === 'hashPassword');
      const loginMethod = methods.find(m => m.name === 'login');
      const validateCredentialsMethod = methods.find(m => m.name === 'validateCredentials');

      expect(validateEmailMethod).toBeDefined();
      expect(hashPasswordMethod).toBeDefined();
      expect(loginMethod).toBeDefined();
      expect(validateCredentialsMethod).toBeDefined();
    });
  });

  describe('高度なJavaScript機能', () => {
    test('ジェネレーター関数を検出できる', () => {
      const content = `
function* fibonacci() {
  let a = 0, b = 1;
  while (true) {
    yield a;
    [a, b] = [b, a + b];
  }
}

function* processItems(items) {
  for (const item of items) {
    const processed = this.transform(item);
    yield processed;
  }
}

const asyncGenerator = async function* () {
  let i = 0;
  while (i < 10) {
    const data = await fetch(\`/api/data/\${i}\`);
    yield data.json();
    i++;
  }
};
`;

      const file = createJsFile(content);
      const methods = analyzeMethodsInFile(file);

      const fibonacciMethod = methods.find(m => m.name === 'fibonacci');
      const processItemsMethod = methods.find(m => m.name === 'processItems');
      const asyncGeneratorMethod = methods.find(m => m.name === 'asyncGenerator');

      expect(fibonacciMethod).toBeDefined();
      expect(processItemsMethod).toBeDefined();
      expect(asyncGeneratorMethod).toBeDefined();
    });

    test('高階関数とクロージャを検出できる', () => {
      const content = `
function createCounter(initialValue = 0) {
  let count = initialValue;
  
  return {
    increment() {
      count++;
      return count;
    },
    
    decrement() {
      count--;
      return count;
    },
    
    get value() {
      return count;
    }
  };
}

const withLogging = (fn) => {
  return function(...args) {
    console.log(\`Calling \${fn.name} with args:\`, args);
    const result = fn.apply(this, args);
    console.log(\`Result:\`, result);
    return result;
  };
};

const compose = (...fns) => (value) => 
  fns.reduceRight((acc, fn) => fn(acc), value);

const pipe = (...fns) => (value) => 
  fns.reduce((acc, fn) => fn(acc), value);
`;

      const file = createJsFile(content);
      const methods = analyzeMethodsInFile(file);

      const createCounterMethod = methods.find(m => m.name === 'createCounter');
      const withLoggingMethod = methods.find(m => m.name === 'withLogging');
      const composeMethod = methods.find(m => m.name === 'compose');
      const pipeMethod = methods.find(m => m.name === 'pipe');

      expect(createCounterMethod).toBeDefined();
      expect(withLoggingMethod).toBeDefined();
      expect(composeMethod).toBeDefined();
      expect(pipeMethod).toBeDefined();
    });
  });

  describe('メソッド呼び出し検出', () => {
    test('関数内のメソッド呼び出しを検出できる', () => {
      const content = `
function processOrder(order) {
  // バリデーション
  const isValid = validateOrder(order);
  if (!isValid) {
    logError('Invalid order', order);
    throw new Error('Invalid order');
  }

  // 処理
  const normalizedOrder = normalizeOrderData(order);
  const calculatedTotal = calculateTotal(normalizedOrder.items);
  
  // 保存
  const savedOrder = saveOrder({
    ...normalizedOrder,
    total: calculatedTotal,
    status: 'processed'
  });

  // 通知
  sendNotification(savedOrder.customerId, 'order_processed');
  
  return savedOrder;
}
`;

      const file = createJsFile(content);
      const allMethods = new Set(['validateOrder', 'logError', 'normalizeOrderData', 'calculateTotal', 'saveOrder', 'sendNotification']);
      const methods = analyzeMethodsInFile(file, allMethods);

      const processOrderMethod = methods.find(m => m.name === 'processOrder');
      expect(processOrderMethod).toBeDefined();

      const calls = processOrderMethod?.calls || [];
      const callNames = calls.map(c => c.methodName);

      expect(callNames).toContain('validateOrder');
      expect(callNames).toContain('logError');
      expect(callNames).toContain('normalizeOrderData');
      expect(callNames).toContain('calculateTotal');
      expect(callNames).toContain('saveOrder');
      expect(callNames).toContain('sendNotification');
    });

    test('メソッドチェーンを検出できる', () => {
      const content = `
function processData(data) {
  return data
    .filter(item => item.active)
    .map(item => transformItem(item))
    .sort((a, b) => compareItems(a, b))
    .slice(0, 10);
}

function queryBuilder() {
  return database
    .select('*')
    .from('users')
    .where('active', true)
    .orderBy('created_at', 'desc')
    .limit(100);
}
`;

      const file = createJsFile(content);
      const allMethods = new Set(['transformItem', 'compareItems', 'filter', 'map', 'sort', 'slice', 'select', 'from', 'where', 'orderBy', 'limit']);
      const methods = analyzeMethodsInFile(file, allMethods);

      const processDataMethod = methods.find(m => m.name === 'processData');
      const queryBuilderMethod = methods.find(m => m.name === 'queryBuilder');

      expect(processDataMethod).toBeDefined();
      expect(queryBuilderMethod).toBeDefined();

      const processDataCalls = processDataMethod?.calls.map(c => c.methodName) || [];
      const queryBuilderCalls = queryBuilderMethod?.calls.map(c => c.methodName) || [];

      expect(processDataCalls).toContain('transformItem');
      expect(processDataCalls).toContain('compareItems');
      expect(queryBuilderCalls).toContain('select');
      expect(queryBuilderCalls).toContain('where');
    });
  });

  describe('Node.js固有の機能', () => {
    test('CommonJSモジュールを検出できる', () => {
      const content = `
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

function readFileAsync(filePath) {
  return promisify(fs.readFile)(filePath, 'utf8');
}

function writeConfig(config, configPath) {
  const content = JSON.stringify(config, null, 2);
  return fs.writeFileSync(configPath, content);
}

module.exports = {
  readFileAsync,
  writeConfig,
  
  processFiles: async function(directory) {
    const files = await fs.promises.readdir(directory);
    return files.filter(file => path.extname(file) === '.json');
  }
};
`;

      const file = createJsFile(content);
      const methods = analyzeMethodsInFile(file);

      const readFileAsyncMethod = methods.find(m => m.name === 'readFileAsync');
      const writeConfigMethod = methods.find(m => m.name === 'writeConfig');
      const processFilesMethod = methods.find(m => m.name === 'processFiles');

      expect(readFileAsyncMethod).toBeDefined();
      expect(writeConfigMethod).toBeDefined();
      expect(processFilesMethod).toBeDefined();
    });
  });
});