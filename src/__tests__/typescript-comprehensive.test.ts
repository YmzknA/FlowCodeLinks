import { analyzeMethodsInFile } from '@/utils/method-analyzer';
import { ParsedFile, Language } from '@/types/codebase';

describe('TypeScript解析 - 網羅的テスト', () => {
  const createTsFile = (content: string): ParsedFile => ({
    path: 'test.ts',
    language: 'typescript' as Language,
    content,
    directory: '',
    fileName: 'test.ts',
    totalLines: content.split('\n').length,
    methods: []
  });

  describe('型定義とインターフェース', () => {
    test('基本的な型エイリアスを検出できる', () => {
      const content = `
type UserRole = 'admin' | 'user' | 'guest';

type ApiResponse<T> = {
  data: T;
  status: number;
  message: string;
  timestamp: Date;
};

type EventHandler<T = Event> = (event: T) => void;

type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

type DatabaseConfig = {
  host: string;
  port: number;
  database: string;
  credentials: {
    username: string;
    password: string;
  };
};
`;

      const file = createTsFile(content);
      const methods = analyzeMethodsInFile(file);

      expect(methods.length).toBeGreaterThanOrEqual(5);

      const userRoleType = methods.find(m => m.name === 'UserRole');
      const apiResponseType = methods.find(m => m.name === 'ApiResponse');
      const eventHandlerType = methods.find(m => m.name === 'EventHandler');
      const deepPartialType = methods.find(m => m.name === 'DeepPartial');
      const databaseConfigType = methods.find(m => m.name === 'DatabaseConfig');

      expect(userRoleType?.type).toBe('type_alias');
      expect(apiResponseType?.type).toBe('type_alias');
      expect(eventHandlerType?.type).toBe('type_alias');
      expect(deepPartialType?.type).toBe('type_alias');
      expect(databaseConfigType?.type).toBe('type_alias');
    });

    test('複雑なインターフェースを検出できる', () => {
      const content = `
interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

interface User extends BaseEntity {
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
}

interface Repository<T extends BaseEntity> {
  findById<K extends keyof T>(id: K): Promise<T | null>;
  create<U extends Omit<T, 'id' | 'createdAt' | 'updatedAt'>>(data: U): Promise<T>;
  update<K extends keyof T>(id: string, data: Partial<Pick<T, K>>): Promise<T>;
  delete(id: string): Promise<boolean>;
  findMany<K extends keyof T>(
    criteria: Partial<Pick<T, K>>,
    options?: {
      limit?: number;
      offset?: number;
      sortBy?: K;
      sortOrder?: 'asc' | 'desc';
    }
  ): Promise<T[]>;
}

interface EventEmitter<T extends Record<string, any[]>> {
  on<K extends keyof T>(event: K, listener: (...args: T[K]) => void): this;
  emit<K extends keyof T>(event: K, ...args: T[K]): boolean;
  off<K extends keyof T>(event: K, listener: (...args: T[K]) => void): this;
}
`;

      const file = createTsFile(content);
      const methods = analyzeMethodsInFile(file);

      const findByIdMethod = methods.find(m => m.name === 'findById');
      const createMethod = methods.find(m => m.name === 'create');
      const updateMethod = methods.find(m => m.name === 'update');
      const deleteMethod = methods.find(m => m.name === 'delete');
      const findManyMethod = methods.find(m => m.name === 'findMany');
      const onMethod = methods.find(m => m.name === 'on');
      const emitMethod = methods.find(m => m.name === 'emit');
      const offMethod = methods.find(m => m.name === 'off');

      expect(findByIdMethod?.type).toBe('interface_method');
      expect(createMethod?.type).toBe('interface_method');
      expect(updateMethod?.type).toBe('interface_method');
      expect(deleteMethod?.type).toBe('interface_method');
      expect(findManyMethod?.type).toBe('interface_method');
      expect(onMethod?.type).toBe('interface_method');
      expect(emitMethod?.type).toBe('interface_method');
      expect(offMethod?.type).toBe('interface_method');
    });
  });

  describe('クラスとメソッド', () => {
    test('TypeScriptクラスの全機能を検出できる', () => {
      const content = `
abstract class BaseService<T extends BaseEntity> {
  protected readonly repository: Repository<T>;
  private readonly logger: Logger;
  
  constructor(repository: Repository<T>, logger: Logger) {
    this.repository = repository;
    this.logger = logger;
  }

  abstract validate(entity: Partial<T>): Promise<ValidationResult>;

  public async create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T> {
    const validationResult = await this.validate(data as Partial<T>);
    if (!validationResult.isValid) {
      throw new ValidationError(validationResult.errors);
    }

    const entity = await this.repository.create(data);
    this.logOperation('CREATE', entity.id);
    return entity;
  }

  protected logOperation(operation: string, entityId: string): void {
    this.logger.info(\`\${operation} operation on entity \${entityId}\`);
  }

  private static createLogger(service: string): Logger {
    return new Logger({ service, level: 'info' });
  }

  readonly getRepository = (): Repository<T> => {
    return this.repository;
  };
}

class UserService extends BaseService<User> {
  constructor(userRepository: Repository<User>) {
    super(userRepository, UserService.createLogger('UserService'));
  }

  async validate(user: Partial<User>): Promise<ValidationResult> {
    const errors: string[] = [];
    
    if (!user.email || !this.isValidEmail(user.email)) {
      errors.push('Invalid email address');
    }
    
    if (!user.name || user.name.trim().length < 2) {
      errors.push('Name must be at least 2 characters');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
    return emailRegex.test(email);
  }

  async updateProfile(userId: string, profileData: Partial<Pick<User, 'name' | 'email'>>): Promise<User> {
    const validationResult = await this.validate(profileData);
    if (!validationResult.isValid) {
      throw new ValidationError(validationResult.errors);
    }

    return this.repository.update(userId, profileData);
  }
}
`;

      const file = createTsFile(content);
      const methods = analyzeMethodsInFile(file);

      // BaseServiceのメソッド
      const createMethod = methods.find(m => m.name === 'create');
      const logOperationMethod = methods.find(m => m.name === 'logOperation');
      const createLoggerMethod = methods.find(m => m.name === 'createLogger');
      const getRepositoryMethod = methods.find(m => m.name === 'getRepository');

      // UserServiceのメソッド
      const validateMethod = methods.find(m => m.name === 'validate');
      const isValidEmailMethod = methods.find(m => m.name === 'isValidEmail');
      const updateProfileMethod = methods.find(m => m.name === 'updateProfile');

      expect(createMethod?.type).toBe('method');
      expect(logOperationMethod?.type).toBe('method');
      expect(logOperationMethod?.isPrivate).toBe(false); // protected
      expect(createLoggerMethod?.type).toBe('class_method'); // static
      expect(getRepositoryMethod?.type).toBe('method');

      expect(validateMethod?.type).toBe('method');
      expect(isValidEmailMethod?.type).toBe('method');
      expect(isValidEmailMethod?.isPrivate).toBe(true);
      expect(updateProfileMethod?.type).toBe('method');
    });
  });

  describe('関数とアロー関数', () => {
    test('TypeScript関数の全パターンを検出できる', () => {
      const content = `
// 基本的な関数宣言
function processUser(user: User): ProcessedUser {
  return {
    id: user.id,
    displayName: formatName(user.name),
    avatar: generateAvatar(user.email)
  };
}

// ジェネリック関数
function mapArray<T, U>(array: T[], mapper: (item: T) => U): U[] {
  return array.map(mapper);
}

// オーバーロード
function formatDate(date: Date): string;
function formatDate(date: string): string;
function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().split('T')[0];
}

// アロー関数（型注釈付き）
const calculateScore = (answers: Answer[]): number => {
  return answers.reduce((total, answer) => {
    return total + (answer.isCorrect ? answer.points : 0);
  }, 0);
};

// 高階関数
const createValidator = <T>(schema: Schema<T>) => {
  return (data: unknown): data is T => {
    return validateSchema(schema, data);
  };
};

// 条件付き型を使用した関数
const processConfig = <T extends 'development' | 'production'>(
  env: T
): T extends 'development' ? DevConfig : ProdConfig => {
  if (env === 'development') {
    return createDevConfig() as any;
  }
  return createProdConfig() as any;
};

// 関数型の変数宣言
const apiHandler: RequestHandler<{ id: string }, ApiResponse<User>, CreateUserRequest> = 
  async (req, res) => {
    const { id } = req.params;
    const userData = req.body;
    
    const user = await userService.create(userData);
    res.json({ data: user, status: 201, message: 'User created' });
  };

// ユーティリティ型を使用
const partialUpdate: <T>(id: string, data: Partial<T>) => Promise<T> = 
  async (id, data) => {
    return repository.update(id, data);
  };
`;

      const file = createTsFile(content);
      const methods = analyzeMethodsInFile(file);

      const processUserMethod = methods.find(m => m.name === 'processUser');
      const mapArrayMethod = methods.find(m => m.name === 'mapArray');
      const formatDateMethod = methods.find(m => m.name === 'formatDate');
      const calculateScoreMethod = methods.find(m => m.name === 'calculateScore');
      const createValidatorMethod = methods.find(m => m.name === 'createValidator');
      const processConfigMethod = methods.find(m => m.name === 'processConfig');
      const apiHandlerMethod = methods.find(m => m.name === 'apiHandler');
      const partialUpdateMethod = methods.find(m => m.name === 'partialUpdate');

      expect(processUserMethod?.type).toBe('function');
      expect(mapArrayMethod?.type).toBe('function');
      expect(formatDateMethod?.type).toBe('function');
      expect(calculateScoreMethod?.type).toBe('function');
      expect(createValidatorMethod?.type).toBe('function');
      expect(processConfigMethod?.type).toBe('function');
      expect(apiHandlerMethod?.type).toBe('function');
      expect(partialUpdateMethod?.type).toBe('function');
    });
  });

  describe('高度なTypeScript機能', () => {
    test('デコレーター付きクラスを検出できる', () => {
      const content = `
function Entity(tableName: string) {
  return function <T extends { new (...args: any[]): {} }>(constructor: T) {
    return class extends constructor {
      tableName = tableName;
    };
  };
}

function Column(options?: { type?: string; nullable?: boolean }) {
  return function (target: any, propertyKey: string) {
    // デコレーター処理
  };
}

@Entity('users')
class User {
  @Column({ type: 'varchar', nullable: false })
  id!: string;

  @Column({ type: 'varchar', nullable: false })
  email!: string;

  @Column({ type: 'varchar', nullable: true })
  name?: string;

  constructor(id: string, email: string, name?: string) {
    this.id = id;
    this.email = email;
    this.name = name;
  }

  @Method()
  updateEmail(newEmail: string): void {
    this.validateEmail(newEmail);
    this.email = newEmail;
  }

  private validateEmail(email: string): void {
    if (!email.includes('@')) {
      throw new Error('Invalid email');
    }
  }
}
`;

      const file = createTsFile(content);
      const methods = analyzeMethodsInFile(file);

      const entityDecorator = methods.find(m => m.name === 'Entity');
      const columnDecorator = methods.find(m => m.name === 'Column');
      const updateEmailMethod = methods.find(m => m.name === 'updateEmail');
      const validateEmailMethod = methods.find(m => m.name === 'validateEmail');

      expect(entityDecorator?.type).toBe('function');
      expect(columnDecorator?.type).toBe('function');
      expect(updateEmailMethod?.type).toBe('method');
      expect(validateEmailMethod?.type).toBe('method');
      expect(validateEmailMethod?.isPrivate).toBe(true);
    });

    test('名前空間とモジュールを検出できる', () => {
      const content = `
namespace Utils {
  export function formatCurrency(amount: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency
    }).format(amount);
  }

  export namespace Validation {
    export function isEmail(value: string): boolean {
      return /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(value);
    }

    export function isPhoneNumber(value: string): boolean {
      return /^\\+?[1-9]\\d{1,14}$/.test(value);
    }

    export class Validator {
      private rules: ValidationRule[] = [];

      addRule(rule: ValidationRule): this {
        this.rules.push(rule);
        return this;
      }

      validate(value: any): ValidationResult {
        const errors = this.rules
          .filter(rule => !rule.validate(value))
          .map(rule => rule.message);

        return {
          isValid: errors.length === 0,
          errors
        };
      }
    }
  }
}

declare module 'express' {
  interface Request {
    user?: User;
    session?: Session;
  }
}

module DatabaseConnection {
  export async function connect(config: DatabaseConfig): Promise<Connection> {
    const connection = await createConnection(config);
    return connection;
  }

  export function disconnect(): Promise<void> {
    return closeConnection();
  }
}
`;

      const file = createTsFile(content);
      const methods = analyzeMethodsInFile(file);

      const formatCurrencyMethod = methods.find(m => m.name === 'formatCurrency');
      const isEmailMethod = methods.find(m => m.name === 'isEmail');
      const isPhoneNumberMethod = methods.find(m => m.name === 'isPhoneNumber');
      const addRuleMethod = methods.find(m => m.name === 'addRule');
      const validateMethod = methods.find(m => m.name === 'validate');
      const connectMethod = methods.find(m => m.name === 'connect');
      const disconnectMethod = methods.find(m => m.name === 'disconnect');

      expect(formatCurrencyMethod?.type).toBe('function');
      expect(isEmailMethod?.type).toBe('function');
      expect(isPhoneNumberMethod?.type).toBe('function');
      expect(addRuleMethod?.type).toBe('method');
      expect(validateMethod?.type).toBe('method');
      expect(connectMethod?.type).toBe('function');
      expect(disconnectMethod?.type).toBe('function');
    });
  });

  describe('メソッド呼び出し検出', () => {
    test('TypeScript特有のメソッド呼び出しを検出できる', () => {
      const content = `
class DataProcessor<T extends Record<string, any>> {
  async processData(data: T[]): Promise<ProcessedData<T>[]> {
    // 型ガード
    const validData = data.filter(this.isValidData);
    
    // 非同期処理
    const processed = await Promise.all(
      validData.map(async (item) => {
        const validated = await this.validateItem(item);
        const transformed = this.transformItem(validated);
        const enriched = await this.enrichData(transformed);
        return enriched;
      })
    );

    // ソート
    const sorted = processed.sort((a, b) => this.compareItems(a, b));
    
    // 後処理
    this.logProcessingResult(sorted.length);
    this.updateMetrics('processed', sorted.length);
    
    return sorted;
  }

  private isValidData(data: any): data is T {
    return typeof data === 'object' && data !== null;
  }

  private async validateItem(item: T): Promise<T> {
    const validator = this.createValidator();
    const result = await validator.validate(item);
    
    if (!result.isValid) {
      throw new ValidationError(result.errors);
    }
    
    return item;
  }

  private transformItem(item: T): T {
    return {
      ...item,
      processedAt: new Date(),
      id: this.generateId()
    } as T;
  }

  private async enrichData(item: T): Promise<ProcessedData<T>> {
    const metadata = await this.fetchMetadata(item.id);
    const computed = this.computeValues(item);
    
    return {
      ...item,
      metadata,
      computed
    };
  }
}
`;

      const file = createTsFile(content);
      const allMethods = new Set([
        'isValidData', 'validateItem', 'transformItem', 'enrichData', 'compareItems',
        'logProcessingResult', 'updateMetrics', 'createValidator', 'generateId',
        'fetchMetadata', 'computeValues', 'filter', 'map', 'sort'
      ]);
      const methods = analyzeMethodsInFile(file, allMethods);

      const processDataMethod = methods.find(m => m.name === 'processData');
      expect(processDataMethod).toBeDefined();

      const calls = processDataMethod?.calls || [];
      const callNames = calls.map(c => c.methodName);

      expect(callNames).toContain('isValidData');
      expect(callNames).toContain('validateItem');
      expect(callNames).toContain('transformItem');
      expect(callNames).toContain('enrichData');
      expect(callNames).toContain('compareItems');
      expect(callNames).toContain('logProcessingResult');
      expect(callNames).toContain('updateMetrics');
    });
  });

  describe('エラーハンドリングとエッジケース', () => {
    test('構文エラーがあるファイルでも部分的に解析できる', () => {
      const content = `
function validFunction(): string {
  return 'valid';
}

// 構文エラーがある部分
function invalidFunction( {
  const incomplete = 
  // 閉じ括弧なし

// しかし、この後の関数は正常
function anotherValidFunction(): number {
  return 42;
}
`;

      const file = createTsFile(content);
      const methods = analyzeMethodsInFile(file);

      // エラーがあっても解析が完全に停止しないことを確認
      expect(methods.length).toBeGreaterThan(0);
      
      const validFunction = methods.find(m => m.name === 'validFunction');
      expect(validFunction).toBeDefined();
    });

    test('大きなファイルでも効率的に解析できる', () => {
      // 大きなファイルを生成
      let content = '';
      for (let i = 0; i < 50; i++) {
        content += `
interface TestInterface${i} {
  method${i}(param: string): Promise<TestResult${i}>;
  process${i}<T extends BaseType${i}>(data: T): T;
}

class TestClass${i} implements TestInterface${i} {
  async method${i}(param: string): Promise<TestResult${i}> {
    const validated = this.validate${i}(param);
    const processed = await this.process${i}(validated);
    return this.format${i}(processed);
  }

  process${i}<T extends BaseType${i}>(data: T): T {
    return this.transform${i}(data);
  }

  private validate${i}(param: string): string {
    return param.trim();
  }

  private transform${i}<T>(data: T): T {
    return data;
  }

  private format${i}(data: any): TestResult${i} {
    return data as TestResult${i};
  }
}

type TestResult${i} = {
  id: number;
  data: string;
};

type BaseType${i} = {
  value: string;
};
`;
      }

      const file = createTsFile(content);
      
      const startTime = Date.now();
      const methods = analyzeMethodsInFile(file);
      const endTime = Date.now();
      
      const executionTime = endTime - startTime;
      
      // 大きなファイルでも効率的に処理できることを確認
      expect(executionTime).toBeLessThan(3000); // 3秒以内
      expect(methods.length).toBeGreaterThan(200); // 十分な数のメソッドが検出される
    });
  });
});