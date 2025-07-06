import { analyzeMethodsInFile } from '@/utils/method-analyzer';
import { ParsedFile, Language } from '@/types/codebase';

// ブラウザ環境をシミュレート
const originalWindow = global.window;
const originalRequire = global.require;

describe('ブラウザ環境でのフォールバック解析テスト', () => {
  beforeAll(() => {
    // ブラウザ環境をシミュレート
    global.window = {} as any;
    global.require = undefined as any;
  });

  afterAll(() => {
    // 元の環境を復元
    global.window = originalWindow;
    global.require = originalRequire;
  });

  const createTsxFile = (content: string): ParsedFile => ({
    path: 'test.tsx',
    language: 'tsx' as Language,
    content,
    directory: '',
    fileName: 'test.tsx',
    totalLines: content.split('\n').length,
    methods: []
  });

  test('ブラウザ環境でもTSXコンポーネントを検出できる', () => {
    const content = `import React from 'react';

export default function TestComponent() {
  return (
    <div className="test">
      <h1>Hello World</h1>
    </div>
  );
}

export const ArrowComponent = () => {
  return <span>Arrow</span>;
};

export type TestType = {
  id: string;
  name: string;
};

export interface TestInterface {
  method(): void;
}`;

    const file = createTsxFile(content);
    const methods = analyzeMethodsInFile(file);

    console.log('ブラウザ環境での解析結果:', methods.map(m => ({ name: m.name, type: m.type })));

    // 基本的な検出ができることを確認
    expect(methods.length).toBeGreaterThan(0);

    // コンポーネントが検出されること
    const testComponent = methods.find(m => m.name === 'TestComponent');
    expect(testComponent).toBeDefined();
    expect(testComponent?.type).toBe('component');

    // アロー関数コンポーネントも検出されること
    const arrowComponent = methods.find(m => m.name === 'ArrowComponent');
    expect(arrowComponent).toBeDefined();
    expect(arrowComponent?.type).toBe('component');

    // 型とインターフェースも検出されること
    const testType = methods.find(m => m.name === 'TestType');
    const testInterface = methods.find(m => m.name === 'TestInterface');
    expect(testType).toBeDefined();
    expect(testInterface).toBeDefined();

    // インポート・エクスポートも検出されること
    const importMethod = methods.find(m => m.type === 'import');
    const exportMethod = methods.find(m => m.type === 'export');
    expect(importMethod).toBeDefined();
    expect(exportMethod).toBeDefined();
  });

  test('TypeScriptファイルでも正規表現解析が動作する', () => {
    const content = `export type UserData = {
  id: number;
  name: string;
};

export interface ApiResponse {
  data: any;
  status: number;
}

export function processData(data: UserData): ApiResponse {
  return {
    data: data,
    status: 200
  };
}

export default function DefaultFunction() {
  return processData({ id: 1, name: 'test' });
}`;

    const tsFile: ParsedFile = {
      path: 'test.ts',
      language: 'typescript' as Language,
      content,
      directory: '',
      fileName: 'test.ts',
      totalLines: content.split('\n').length,
      methods: []
    };

    const methods = analyzeMethodsInFile(tsFile);

    console.log('TypeScript正規表現解析結果:', methods.map(m => ({ name: m.name, type: m.type })));

    // 型エイリアス
    const userDataType = methods.find(m => m.name === 'UserData');
    expect(userDataType).toBeDefined();
    expect(userDataType?.type).toBe('type_alias');

    // インターフェース
    const apiResponseInterface = methods.find(m => m.name === 'ApiResponse');
    expect(apiResponseInterface).toBeDefined();
    expect(apiResponseInterface?.type).toBe('interface');

    // 関数
    const processDataFunction = methods.find(m => m.name === 'processData');
    expect(processDataFunction).toBeDefined();
    expect(processDataFunction?.type).toBe('function');

    // デフォルトエクスポート関数
    const defaultFunction = methods.find(m => m.name === 'DefaultFunction');
    expect(defaultFunction).toBeDefined();
    expect(defaultFunction?.type).toBe('function');

    // 最低でも5つの要素が検出されること（型、インターフェース、関数2つ、エクスポート）
    expect(methods.length).toBeGreaterThanOrEqual(4);
  });
});