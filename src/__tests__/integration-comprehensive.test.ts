import { analyzeMethodsInFile, extractAllMethodDefinitions } from '@/utils/method-analyzer';
import { ParsedFile, Language } from '@/types/codebase';

describe('統合テスト - 実際のファイルサンプル', () => {
  const createFile = (path: string, language: Language, content: string): ParsedFile => ({
    path,
    language,
    content,
    directory: path.split('/').slice(0, -1).join('/'),
    fileName: path.split('/').pop() || '',
    totalLines: content.split('\n').length,
    methods: []
  });

  describe('実際のNext.jsプロジェクト構成', () => {
    test('複数ファイルの相互参照を正しく解析できる', () => {
      // ユーティリティファイル (TypeScript)
      const utilsFile = createFile('src/utils/api.ts', 'typescript', `
export interface ApiResponse<T> {
  data: T;
  status: number;
  message: string;
}

export class ApiClient {
  private baseUrl: string;
  
  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    const response = await this.fetchWithRetry(\`\${this.baseUrl}\${endpoint}\`);
    return this.parseResponse<T>(response);
  }

  async post<T, U>(endpoint: string, data: T): Promise<ApiResponse<U>> {
    const response = await this.fetchWithRetry(\`\${this.baseUrl}\${endpoint}\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return this.parseResponse<U>(response);
  }

  private async fetchWithRetry(url: string, options?: RequestInit, retries: number = 3): Promise<Response> {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url, options);
        if (response.ok) return response;
        throw new Error(\`HTTP \${response.status}: \${response.statusText}\`);
      } catch (error) {
        if (i === retries - 1) throw error;
        await this.delay(Math.pow(2, i) * 1000);
      }
    }
    throw new Error('Max retries exceeded');
  }

  private async parseResponse<T>(response: Response): Promise<ApiResponse<T>> {
    const data = await response.json();
    return {
      data,
      status: response.status,
      message: response.statusText
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const apiClient = new ApiClient(process.env.NEXT_PUBLIC_API_URL || '/api');
`);

      // サービスファイル (TypeScript)
      const serviceFile = createFile('src/services/userService.ts', 'typescript', `
import { ApiClient, ApiResponse } from '../utils/api';

export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}

export interface CreateUserRequest {
  name: string;
  email: string;
}

export class UserService {
  constructor(private apiClient: ApiClient) {}

  async getUser(id: string): Promise<User> {
    const response = await this.apiClient.get<User>(\`/users/\${id}\`);
    return this.transformUser(response.data);
  }

  async createUser(userData: CreateUserRequest): Promise<User> {
    const validatedData = this.validateUserData(userData);
    const response = await this.apiClient.post<CreateUserRequest, User>('/users', validatedData);
    return this.transformUser(response.data);
  }

  async updateUser(id: string, userData: Partial<CreateUserRequest>): Promise<User> {
    const response = await this.apiClient.post<Partial<CreateUserRequest>, User>(\`/users/\${id}\`, userData);
    return this.transformUser(response.data);
  }

  private validateUserData(userData: CreateUserRequest): CreateUserRequest {
    if (!userData.name || userData.name.trim().length < 2) {
      throw new Error('Name must be at least 2 characters');
    }
    if (!this.isValidEmail(userData.email)) {
      throw new Error('Invalid email format');
    }
    return userData;
  }

  private isValidEmail(email: string): boolean {
    return /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email);
  }

  private transformUser(userData: any): User {
    return {
      ...userData,
      createdAt: new Date(userData.createdAt)
    };
  }
}
`);

      // Reactコンポーネント (TSX)
      const componentFile = createFile('src/components/UserProfile.tsx', 'tsx', `
import React, { useState, useEffect, useCallback } from 'react';
import { User, UserService } from '../services/userService';
import { apiClient } from '../utils/api';

interface UserProfileProps {
  userId: string;
  onUserUpdate?: (user: User) => void;
}

const UserProfile: React.FC<UserProfileProps> = ({ userId, onUserUpdate }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userService = new UserService(apiClient);

  useEffect(() => {
    loadUser();
  }, [userId]);

  const loadUser = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const userData = await userService.getUser(userId);
      setUser(userData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load user');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const handleSave = useCallback(async (updatedData: { name: string; email: string }) => {
    if (!user) return;

    try {
      setError(null);
      const updatedUser = await userService.updateUser(user.id, updatedData);
      setUser(updatedUser);
      setEditing(false);
      onUserUpdate?.(updatedUser);
      showSuccessMessage('User updated successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user');
    }
  }, [user, onUserUpdate]);

  const handleCancel = useCallback(() => {
    setEditing(false);
    setError(null);
  }, []);

  const validateForm = (data: { name: string; email: string }): boolean => {
    return data.name.trim().length >= 2 && isValidEmail(data.email);
  };

  const isValidEmail = (email: string): boolean => {
    return /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email);
  };

  const showSuccessMessage = (message: string): void => {
    // 実装：成功メッセージの表示
    console.log(message);
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={loadUser} />;
  }

  if (!user) {
    return <div>User not found</div>;
  }

  return (
    <div className="user-profile">
      {editing ? (
        <UserEditForm
          user={user}
          onSave={handleSave}
          onCancel={handleCancel}
          onValidate={validateForm}
        />
      ) : (
        <UserDisplay
          user={user}
          onEdit={() => setEditing(true)}
        />
      )}
    </div>
  );
};

export default UserProfile;
`);

      // JavaScriptヘルパーファイル
      const helperFile = createFile('src/utils/helpers.js', 'javascript', `
export function formatDate(date) {
  if (!date) return '';
  
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(new Date(date));
}

export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

export const validateInput = (value, type) => {
  switch (type) {
    case 'email':
      return /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(value);
    case 'phone':
      return /^\\+?[1-9]\\d{1,14}$/.test(value);
    case 'url':
      return isValidUrl(value);
    default:
      return true;
  }
};

function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}

export class EventEmitter {
  constructor() {
    this.events = {};
  }

  on(event, listener) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(listener);
    return this;
  }

  emit(event, ...args) {
    if (!this.events[event]) return false;
    
    this.events[event].forEach(listener => {
      try {
        listener.apply(this, args);
      } catch (error) {
        console.error('Error in event listener:', error);
      }
    });
    
    return true;
  }

  off(event, listenerToRemove) {
    if (!this.events[event]) return this;
    
    this.events[event] = this.events[event].filter(
      listener => listener !== listenerToRemove
    );
    
    return this;
  }

  removeAllListeners(event) {
    if (event) {
      delete this.events[event];
    } else {
      this.events = {};
    }
    return this;
  }
}
`);

      const files = [utilsFile, serviceFile, componentFile, helperFile];

      // 1. 各ファイルを個別に解析
      const allMethods = files.map(file => analyzeMethodsInFile(file));

      // TypeScriptファイルの解析結果確認
      const utilsMethods = allMethods[0];
      expect(utilsMethods.length).toBeGreaterThan(5);
      
      const apiClientClass = utilsMethods.find(m => m.name === 'ApiClient');
      const getMethod = utilsMethods.find(m => m.name === 'get');
      const postMethod = utilsMethods.find(m => m.name === 'post');
      const fetchWithRetryMethod = utilsMethods.find(m => m.name === 'fetchWithRetry');

      expect(getMethod?.type).toBe('method');
      expect(postMethod?.type).toBe('method');
      expect(fetchWithRetryMethod?.type).toBe('method');
      expect(fetchWithRetryMethod?.isPrivate).toBe(true);

      // サービスファイルの解析結果確認
      const serviceMethods = allMethods[1];
      const userServiceClass = serviceMethods.find(m => m.name === 'UserService');
      const getUserMethod = serviceMethods.find(m => m.name === 'getUser');
      const createUserMethod = serviceMethods.find(m => m.name === 'createUser');
      const validateUserDataMethod = serviceMethods.find(m => m.name === 'validateUserData');

      expect(getUserMethod?.type).toBe('method');
      expect(createUserMethod?.type).toBe('method');
      expect(validateUserDataMethod?.type).toBe('method');
      expect(validateUserDataMethod?.isPrivate).toBe(true);

      // TSXファイルの解析結果確認
      const componentMethods = allMethods[2];
      const userProfileComponent = componentMethods.find(m => m.name === 'UserProfile');
      const loadUserMethod = componentMethods.find(m => m.name === 'loadUser');
      const handleSaveMethod = componentMethods.find(m => m.name === 'handleSave');

      expect(userProfileComponent?.type).toBe('component');
      expect(loadUserMethod?.type).toBe('function');
      expect(handleSaveMethod?.type).toBe('function');

      // JavaScriptファイルの解析結果確認
      const helperMethods = allMethods[3];
      const formatDateFunction = helperMethods.find(m => m.name === 'formatDate');
      const debounceFunction = helperMethods.find(m => m.name === 'debounce');
      const eventEmitterClass = helperMethods.find(m => m.name === 'EventEmitter');

      expect(formatDateFunction?.type).toBe('function');
      expect(debounceFunction?.type).toBe('function');

      // 2. 定義済みメソッドの抽出と相互参照解析
      const allDefinedMethods = extractAllMethodDefinitions(files);
      expect(allDefinedMethods.size).toBeGreaterThan(20);

      // 相互参照を考慮した解析
      const enhancedAnalysis = files.map(file => analyzeMethodsInFile(file, allDefinedMethods));

      // メソッド呼び出しの検出確認
      const enhancedServiceMethods = enhancedAnalysis[1];
      const enhancedGetUserMethod = enhancedServiceMethods.find(m => m.name === 'getUser');
      
      if (enhancedGetUserMethod) {
        const callNames = enhancedGetUserMethod.calls.map(c => c.methodName);
        expect(callNames).toContain('transformUser');
      }
    });

    test('異なる言語ファイルの混在プロジェクトを解析できる', () => {
      const mixedFiles = [
        // Next.js API Route (JavaScript)
        createFile('pages/api/users.js', 'javascript', `
import { UserService } from '../../src/services/userService';

export default async function handler(req, res) {
  const userService = new UserService();

  switch (req.method) {
    case 'GET':
      return handleGetRequest(req, res, userService);
    case 'POST':
      return handlePostRequest(req, res, userService);
    default:
      return methodNotAllowed(res);
  }
}

async function handleGetRequest(req, res, userService) {
  try {
    const { id } = req.query;
    if (id) {
      const user = await userService.getUser(id);
      return res.json(user);
    } else {
      const users = await userService.getAllUsers();
      return res.json(users);
    }
  } catch (error) {
    return handleError(res, error);
  }
}

async function handlePostRequest(req, res, userService) {
  try {
    const userData = validateRequestBody(req.body);
    const user = await userService.createUser(userData);
    return res.status(201).json(user);
  } catch (error) {
    return handleError(res, error);
  }
}

function validateRequestBody(body) {
  if (!body.name || !body.email) {
    throw new Error('Name and email are required');
  }
  return sanitizeInput(body);
}

function sanitizeInput(input) {
  // サニタイズ処理
  return {
    name: input.name.trim(),
    email: input.email.toLowerCase().trim()
  };
}

function handleError(res, error) {
  console.error('API Error:', error);
  return res.status(500).json({ 
    error: error.message || 'Internal server error' 
  });
}

function methodNotAllowed(res) {
  return res.status(405).json({ error: 'Method not allowed' });
}
`),

        // TypeScript Configuration
        createFile('src/config/database.ts', 'typescript', `
interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl?: boolean;
}

interface ConnectionOptions {
  maxConnections?: number;
  connectionTimeout?: number;
  acquireTimeout?: number;
  timeout?: number;
  keepAlive?: boolean;
}

export class DatabaseManager {
  private config: DatabaseConfig;
  private options: ConnectionOptions;
  private connection: any = null;

  constructor(config: DatabaseConfig, options: ConnectionOptions = {}) {
    this.config = this.validateConfig(config);
    this.options = this.setDefaultOptions(options);
  }

  async connect(): Promise<void> {
    if (this.connection) {
      this.logWarning('Already connected to database');
      return;
    }

    try {
      this.connection = await this.createConnection();
      this.logInfo('Successfully connected to database');
    } catch (error) {
      this.logError('Failed to connect to database', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (!this.connection) {
      this.logWarning('No active database connection');
      return;
    }

    try {
      await this.closeConnection();
      this.connection = null;
      this.logInfo('Successfully disconnected from database');
    } catch (error) {
      this.logError('Failed to disconnect from database', error);
      throw error;
    }
  }

  private validateConfig(config: DatabaseConfig): DatabaseConfig {
    const required = ['host', 'port', 'database', 'username', 'password'];
    for (const field of required) {
      if (!config[field as keyof DatabaseConfig]) {
        throw new Error(\`Missing required database config: \${field}\`);
      }
    }
    return config;
  }

  private setDefaultOptions(options: ConnectionOptions): ConnectionOptions {
    return {
      maxConnections: 10,
      connectionTimeout: 30000,
      acquireTimeout: 30000,
      timeout: 30000,
      keepAlive: true,
      ...options
    };
  }

  private async createConnection(): Promise<any> {
    // データベース接続の実装
    return { connected: true };
  }

  private async closeConnection(): Promise<void> {
    // 接続クローズの実装
  }

  private logInfo(message: string): void {
    console.log(\`[DB INFO] \${message}\`);
  }

  private logWarning(message: string): void {
    console.warn(\`[DB WARNING] \${message}\`);
  }

  private logError(message: string, error?: any): void {
    console.error(\`[DB ERROR] \${message}\`, error);
  }
}

export const createDatabaseManager = (config: DatabaseConfig, options?: ConnectionOptions): DatabaseManager => {
  return new DatabaseManager(config, options);
};
`),

        // React Hook (TSX)
        createFile('src/hooks/useDatabase.tsx', 'tsx', `
import { useState, useEffect, useCallback, useRef } from 'react';
import { DatabaseManager } from '../config/database';

interface UseDatabaseOptions {
  autoConnect?: boolean;
  retryOnFailure?: boolean;
  maxRetries?: number;
}

interface DatabaseHookReturn {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  retry: () => Promise<void>;
}

export const useDatabase = (
  manager: DatabaseManager,
  options: UseDatabaseOptions = {}
): DatabaseHookReturn => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const retryCountRef = useRef(0);

  const {
    autoConnect = true,
    retryOnFailure = true,
    maxRetries = 3
  } = options;

  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      if (isConnected) {
        disconnect();
      }
    };
  }, [autoConnect]);

  const connect = useCallback(async (): Promise<void> => {
    if (isConnecting || isConnected) {
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      await manager.connect();
      setIsConnected(true);
      retryCountRef.current = 0;
      logConnectionSuccess();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Connection failed';
      setError(errorMessage);
      logConnectionError(errorMessage);

      if (retryOnFailure && retryCountRef.current < maxRetries) {
        scheduleRetry();
      }
    } finally {
      setIsConnecting(false);
    }
  }, [manager, isConnecting, isConnected, retryOnFailure, maxRetries]);

  const disconnect = useCallback(async (): Promise<void> => {
    if (!isConnected) {
      return;
    }

    try {
      await manager.disconnect();
      setIsConnected(false);
      setError(null);
      logDisconnectionSuccess();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Disconnection failed';
      setError(errorMessage);
      logDisconnectionError(errorMessage);
    }
  }, [manager, isConnected]);

  const retry = useCallback(async (): Promise<void> => {
    retryCountRef.current = 0;
    await connect();
  }, [connect]);

  const scheduleRetry = useCallback(() => {
    retryCountRef.current++;
    const delay = Math.pow(2, retryCountRef.current) * 1000;
    
    setTimeout(() => {
      connect();
    }, delay);
  }, [connect]);

  const logConnectionSuccess = (): void => {
    console.log('Database connection established successfully');
  };

  const logConnectionError = (error: string): void => {
    console.error('Database connection failed:', error);
  };

  const logDisconnectionSuccess = (): void => {
    console.log('Database disconnected successfully');
  };

  const logDisconnectionError = (error: string): void => {
    console.error('Database disconnection failed:', error);
  };

  return {
    isConnected,
    isConnecting,
    error,
    connect,
    disconnect,
    retry
  };
};
`)
      ];

      // 全ファイルの解析
      const allMethodDefinitions = extractAllMethodDefinitions(mixedFiles);
      const results = mixedFiles.map(file => analyzeMethodsInFile(file, allMethodDefinitions));

      // JavaScript API Route
      const apiMethods = results[0];
      expect(apiMethods.length).toBeGreaterThan(6);
      
      const handlerFunction = apiMethods.find(m => m.name === 'handler');
      const handleGetRequestFunction = apiMethods.find(m => m.name === 'handleGetRequest');
      const validateRequestBodyFunction = apiMethods.find(m => m.name === 'validateRequestBody');

      expect(handlerFunction?.type).toBe('function');
      expect(handleGetRequestFunction?.type).toBe('function');
      expect(validateRequestBodyFunction?.type).toBe('function');

      // TypeScript Configuration
      const configMethods = results[1];
      const databaseManagerClass = configMethods.find(m => m.name === 'DatabaseManager');
      const connectMethod = configMethods.find(m => m.name === 'connect');
      const validateConfigMethod = configMethods.find(m => m.name === 'validateConfig');

      expect(connectMethod?.type).toBe('method');
      expect(validateConfigMethod?.type).toBe('method');
      expect(validateConfigMethod?.isPrivate).toBe(true);

      // TSX Hook
      const hookMethods = results[2];
      const useDatabaseHook = hookMethods.find(m => m.name === 'useDatabase');
      const connectHookMethod = hookMethods.find(m => m.name === 'connect');
      const scheduleRetryMethod = hookMethods.find(m => m.name === 'scheduleRetry');

      expect(useDatabaseHook?.type).toBe('function');
      expect(connectHookMethod?.type).toBe('function');
      expect(scheduleRetryMethod?.type).toBe('function');

      // 言語統計の確認
      const languages = mixedFiles.map(f => f.language);
      expect(languages).toContain('javascript');
      expect(languages).toContain('typescript');
      expect(languages).toContain('tsx');

      // 定義済みメソッドが適切に抽出されているか確認
      expect(allMethodDefinitions.size).toBeGreaterThan(30);
      expect(allMethodDefinitions.has('connect')).toBe(true);
      expect(allMethodDefinitions.has('disconnect')).toBe(true);
      expect(allMethodDefinitions.has('validateRequestBody')).toBe(true);
    });
  });

  describe('パフォーマンスと信頼性', () => {
    test('大規模プロジェクトでも効率的に解析できる', () => {
      // 大規模プロジェクトを模擬
      const largeProject: ParsedFile[] = [];

      // 100個のファイルを生成
      for (let i = 0; i < 100; i++) {
        const fileType = i % 3;
        let language: Language;
        let content: string;

        if (fileType === 0) {
          language = 'typescript';
          content = `
export class Service${i} {
  async method${i}(param: string): Promise<Result${i}> {
    const validated = this.validate${i}(param);
    const processed = this.process${i}(validated);
    return this.format${i}(processed);
  }

  private validate${i}(param: string): string {
    return param.trim();
  }

  private process${i}(param: string): any {
    return { data: param };
  }

  private format${i}(data: any): Result${i} {
    return data as Result${i};
  }
}

type Result${i} = { data: string };
`;
        } else if (fileType === 1) {
          language = 'tsx';
          content = `
import React, { useState, useCallback } from 'react';

interface Component${i}Props {
  data: string;
  onUpdate: (value: string) => void;
}

const Component${i}: React.FC<Component${i}Props> = ({ data, onUpdate }) => {
  const [value, setValue] = useState(data);

  const handleChange = useCallback((newValue: string) => {
    setValue(newValue);
    onUpdate(newValue);
  }, [onUpdate]);

  const handleSubmit = useCallback(() => {
    if (validateInput${i}(value)) {
      processValue${i}(value);
    }
  }, [value]);

  return (
    <div>
      <input value={value} onChange={(e) => handleChange(e.target.value)} />
      <button onClick={handleSubmit}>Submit</button>
    </div>
  );
};

function validateInput${i}(value: string): boolean {
  return value.length > 0;
}

function processValue${i}(value: string): void {
  console.log('Processing: ' + value);
}

export default Component${i};
`;
        } else {
          language = 'javascript';
          content = `
export function utility${i}(input) {
  return processInput${i}(input);
}

function processInput${i}(input) {
  const cleaned = cleanInput${i}(input);
  const validated = validateInput${i}(cleaned);
  return formatOutput${i}(validated);
}

function cleanInput${i}(input) {
  return input.trim();
}

function validateInput${i}(input) {
  return input.length > 0;
}

function formatOutput${i}(input) {
  return { result: input };
}

export class Processor${i} {
  process(data) {
    return this.transform${i}(data);
  }

  transform${i}(data) {
    return { transformed: data };
  }
}
`;
        }

        largeProject.push(createFile(`src/components/file${i}.${language}`, language, content));
      }

      const startTime = Date.now();
      
      // 全ファイルの定義を抽出
      const allDefinitions = extractAllMethodDefinitions(largeProject);
      
      // 全ファイルを解析
      const results = largeProject.map(file => analyzeMethodsInFile(file, allDefinitions));
      
      const endTime = Date.now();
      const executionTime = endTime - startTime;

      // パフォーマンス確認
      expect(executionTime).toBeLessThan(10000); // 10秒以内
      expect(results.length).toBe(100);
      
      // 結果の妥当性確認
      const totalMethods = results.reduce((sum, methods) => sum + methods.length, 0);
      expect(totalMethods).toBeGreaterThan(400); // 十分な数のメソッドが検出される

      // 定義済みメソッドの数も確認
      expect(allDefinitions.size).toBeGreaterThan(300);
    });
  });
});