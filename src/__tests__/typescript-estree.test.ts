import { analyzeTypeScriptWithESTree } from '@/utils/typescript-estree-analyzer';
import { ParsedFile, Language } from '@/types/codebase';

describe('TypeScript ESTree解析テスト', () => {
  const createTsFile = (content: string): ParsedFile => ({
    path: 'test.ts',
    language: 'typescript' as Language,
    content,
    directory: '',
    fileName: 'test.ts',
    totalLines: content.split('\n').length,
    methods: []
  });

  describe('型エイリアス検出', () => {
    test('基本的な型エイリアスを検出できる', () => {
      const content = `type UserData = {
  id: number;
  name: string;
  email: string;
};

type StatusType = 'active' | 'inactive' | 'pending';

type ApiResponse<T> = {
  data: T;
  status: number;
  message: string;
};`;

      const file = createTsFile(content);
      const methods = analyzeTypeScriptWithESTree(file);

      expect(methods.length).toBeGreaterThanOrEqual(3);
      
      const userDataType = methods.find(m => m.name === 'UserData');
      const statusType = methods.find(m => m.name === 'StatusType');
      const apiResponseType = methods.find(m => m.name === 'ApiResponse');

      expect(userDataType).toBeDefined();
      expect(userDataType?.type).toBe('type_alias');
      expect(statusType).toBeDefined();
      expect(statusType?.type).toBe('type_alias');
      expect(apiResponseType).toBeDefined();
      expect(apiResponseType?.type).toBe('type_alias');
    });
  });

  describe('インターフェース改良検出', () => {
    test('ジェネリクス付きインターフェースメソッドを検出できる', () => {
      const content = `interface Repository<T> {
  findById<K extends keyof T>(id: K): Promise<T>;
  save<U extends T>(entity: U): Promise<U>;
  delete(id: string): Promise<boolean>;
  findMany<K extends keyof T>(criteria: Partial<Pick<T, K>>): Promise<T[]>;
}

interface UserService extends Repository<User> {
  validateEmail(email: string): boolean;
  hashPassword(password: string): Promise<string>;
}`;

      const file = createTsFile(content);
      const methods = analyzeTypeScriptWithESTree(file);

      // Repository interface methods
      const repositoryMethods = methods.filter(m => m.type === 'interface_method');
      expect(repositoryMethods.length).toBeGreaterThanOrEqual(6);

      const findByIdMethod = methods.find(m => m.name === 'findById');
      const saveMethod = methods.find(m => m.name === 'save');
      const findManyMethod = methods.find(m => m.name === 'findMany');

      expect(findByIdMethod).toBeDefined();
      expect(findByIdMethod?.type).toBe('interface_method');
      expect(saveMethod).toBeDefined();
      expect(findManyMethod).toBeDefined();
    });
  });

  describe('クラス改良検出', () => {
    test('ジェネリクス付きクラスメソッドを検出できる', () => {
      const content = `class DataProcessor<T extends object> {
  private cache: Map<string, T> = new Map();

  public async process<U extends T>(
    data: U[], 
    transformer: (item: U) => Promise<T>
  ): Promise<T[]> {
    const results: T[] = [];
    for (const item of data) {
      const transformed = await transformer(item);
      results.push(transformed);
    }
    return results;
  }

  private getCacheKey<K extends keyof T>(item: T, key: K): string {
    return String(item[key]);
  }

  static create<T extends object>(): DataProcessor<T> {
    return new DataProcessor<T>();
  }
}`;

      const file = createTsFile(content);
      const methods = analyzeTypeScriptWithESTree(file);

      const processMethod = methods.find(m => m.name === 'process');
      const getCacheKeyMethod = methods.find(m => m.name === 'getCacheKey');
      const createMethod = methods.find(m => m.name === 'create');

      expect(processMethod).toBeDefined();
      expect(processMethod?.type).toBe('method');
      expect(processMethod?.isPrivate).toBe(false);

      expect(getCacheKeyMethod).toBeDefined();
      expect(getCacheKeyMethod?.isPrivate).toBe(true);

      expect(createMethod).toBeDefined();
      expect(createMethod?.type).toBe('class_method');
    });
  });

  describe('インポート・エクスポート解析', () => {
    test('インポート・エクスポート文を解析できる', () => {
      const content = `import { Component, useState, useEffect } from 'react';
import type { User, UserData } from '@/types/user';
import * as Utils from '@/utils/helpers';
import { default as ApiClient } from '@/api/client';

export interface ExportedInterface {
  method(): void;
}

export class ExportedClass {
  public method(): void {}
}

export const exportedFunction = (): void => {};

export default class DefaultExportClass {
  public defaultMethod(): void {}
}`;

      const file = createTsFile(content);
      const methods = analyzeTypeScriptWithESTree(file);

      // Import/Export statements should be captured
      const importExportMethods = methods.filter(m => 
        m.type === 'import' || m.type === 'export'
      );
      expect(importExportMethods.length).toBeGreaterThan(0);

      // Exported class and interface methods should be detected
      const exportedMethodsCount = methods.filter(m => 
        m.name === 'method' || m.name === 'exportedFunction' || m.name === 'defaultMethod'
      ).length;
      expect(exportedMethodsCount).toBeGreaterThanOrEqual(3);
    });
  });

  describe('高度なメソッド呼び出し検出', () => {
    test('AST解析による包括的なメソッド呼び出し検出', () => {
      const content = `class UserProcessor {
  async processUser(userData: UserData): Promise<ProcessedUser> {
    // Simple method calls
    const validation = this.validateUserData(userData);
    const normalized = await this.normalizeData(userData);
    
    // Chained method calls
    const processed = normalized
      .transformData()
      .applyBusinessRules()
      .finalizeProcessing();
    
    // Conditional method calls
    if (validation.isValid) {
      await this.saveToDatabase(processed);
      this.notifySuccess(processed.id);
    } else {
      this.logError(validation.errors);
      throw this.createValidationError(validation);
    }
    
    // Generic method calls
    const result = this.mapResult<ProcessedUser>(processed);
    return this.wrapInResponse<ProcessedUser>(result);
  }

  private validateUserData(data: UserData): ValidationResult {
    return { isValid: true, errors: [] };
  }

  private async normalizeData(data: UserData): Promise<NormalizedData> {
    return data as any;
  }
}`;

      const file = createTsFile(content);
      const methods = analyzeTypeScriptWithESTree(file);

      const processUserMethod = methods.find(m => m.name === 'processUser');
      expect(processUserMethod).toBeDefined();

      const callNames = processUserMethod?.calls.map(c => c.methodName) || [];
      
      // Defined methods should be detected
      expect(callNames).toContain('validateUserData');
      expect(callNames).toContain('normalizeData');
      
      // AST should detect more method calls than regex-based analysis
      expect(callNames.length).toBeGreaterThan(5);
    });
  });

  describe('パフォーマンステスト', () => {
    test('大きなファイルを効率的に解析できる', () => {
      // Generate a large TypeScript file
      const generateLargeFile = () => {
        let content = '';
        for (let i = 0; i < 100; i++) {
          content += `
interface Interface${i} {
  method${i}(param: string): Promise<Result${i}>;
  process${i}<T extends BaseType${i}>(data: T): T;
}

class Class${i} implements Interface${i} {
  async method${i}(param: string): Promise<Result${i}> {
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

  private format${i}(data: any): Result${i} {
    return data as Result${i};
  }
}

type Result${i} = {
  id: number;
  data: string;
};

type BaseType${i} = {
  value: string;
};
`;
        }
        return content;
      };

      const file = createTsFile(generateLargeFile());
      
      const startTime = Date.now();
      const methods = analyzeTypeScriptWithESTree(file);
      const endTime = Date.now();
      
      const executionTime = endTime - startTime;
      
      // Should complete within reasonable time (< 5 seconds for 100 classes)
      expect(executionTime).toBeLessThan(5000);
      
      // Should detect all methods (100 interfaces * 2 methods + 100 classes * 5 methods)
      expect(methods.length).toBeGreaterThan(600);
    });
  });
});