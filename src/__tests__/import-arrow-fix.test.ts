import { Method, Dependency } from '@/types/codebase';
import { extractDependencies } from '@/utils/dependency-extractor';

describe('Import Arrow Fix', () => {
  it('should use import line number for import_usage fromLine', () => {
    // テストデータ: import文とその使用箇所
    const methods: Method[] = [
      {
        name: '[Import: React from react]',
        type: 'import',
        startLine: 1, // import文の行番号
        endLine: 1,
        filePath: 'src/component.tsx',
        code: "import React from 'react'",
        calls: [],
        isPrivate: false,
        parameters: []
      },
      {
        name: 'React (imported)',
        type: 'import_usage',
        startLine: 5, // 使用箇所の行番号
        endLine: 5,
        filePath: 'src/component.tsx',
        code: 'return <div>Hello</div>',
        calls: [{
          methodName: 'useState',
          line: 10, // この使用箇所からuseStateを呼び出している
          context: 'const [state, setState] = useState(0)'
        }],
        isPrivate: false,
        parameters: [],
        importSource: '1' // import文の行番号を参照
      },
      {
        name: 'useState',
        type: 'function',
        startLine: 100, // useState定義の行番号
        endLine: 100,
        filePath: 'react/index.ts',
        code: 'function useState<T>(initial: T): [T, (value: T) => void]',
        calls: [],
        isPrivate: false,
        parameters: ['initial']
      }
    ];

    // 依存関係を抽出
    const dependencies = extractDependencies(methods);

    // import_usage -> useState の依存関係を確認
    const importToUseState = dependencies.find(dep => 
      dep.from.methodName === 'React (imported)' && 
      dep.to.methodName === 'useState'
    );

    expect(importToUseState).toBeDefined();
    expect(importToUseState?.fromLine).toBe(1); // import文の行番号(1)であることを確認
    expect(importToUseState?.toLine).toBe(100); // useStateの定義行番号
  });

  it('should use call line for regular method dependencies', () => {
    // 通常のメソッド呼び出しでは呼び出し箇所の行番号を使用
    const methods: Method[] = [
      {
        name: 'processData',
        type: 'function',
        startLine: 10,
        endLine: 15,
        filePath: 'src/utils.ts',
        code: 'function processData() { helper(); }',
        calls: [{
          methodName: 'helper',
          line: 12, // 呼び出し箇所の行番号
          context: 'helper()'
        }],
        isPrivate: false,
        parameters: []
      },
      {
        name: 'helper',
        type: 'function',
        startLine: 20,
        endLine: 22,
        filePath: 'src/utils.ts',
        code: 'function helper() { }',
        calls: [],
        isPrivate: false,
        parameters: []
      }
    ];

    const dependencies = extractDependencies(methods);
    const methodDep = dependencies.find(dep => 
      dep.from.methodName === 'processData' && 
      dep.to.methodName === 'helper'
    );

    expect(methodDep).toBeDefined();
    expect(methodDep?.fromLine).toBe(12); // 呼び出し箇所の行番号
    expect(methodDep?.toLine).toBe(20); // helper定義の行番号
  });

  it('should handle multiple import usages correctly', () => {
    // 複数のimport使用箇所がある場合
    const methods: Method[] = [
      {
        name: '[Import: {useState, useEffect} from react]',
        type: 'import',
        startLine: 2,
        endLine: 2,
        filePath: 'src/hooks.tsx',
        code: "import { useState, useEffect } from 'react'",
        calls: [],
        isPrivate: false,
        parameters: []
      },
      {
        name: 'useState (imported)',
        type: 'import_usage',
        startLine: 8,
        endLine: 8,
        filePath: 'src/hooks.tsx',
        code: 'const [state, setState] = useState(0)',
        calls: [{
          methodName: 'someFunction',
          line: 8,
          context: 'someFunction()'
        }],
        isPrivate: false,
        parameters: [],
        importSource: '2' // import文の行番号
      },
      {
        name: 'useEffect (imported)',
        type: 'import_usage',
        startLine: 15,
        endLine: 15,
        filePath: 'src/hooks.tsx',
        code: 'useEffect(() => {}, [])',
        calls: [{
          methodName: 'someFunction',
          line: 15,
          context: 'someFunction()'
        }],
        isPrivate: false,
        parameters: [],
        importSource: '2' // 同じimport文の行番号
      },
      {
        name: 'someFunction',
        type: 'function',
        startLine: 50,
        endLine: 52,
        filePath: 'src/utils.ts',
        code: 'function someFunction() {}',
        calls: [],
        isPrivate: false,
        parameters: []
      }
    ];

    const dependencies = extractDependencies(methods);

    // useState使用箇所からの依存関係
    const useStateDep = dependencies.find(dep => 
      dep.from.methodName === 'useState (imported)' && 
      dep.to.methodName === 'someFunction'
    );

    // useEffect使用箇所からの依存関係
    const useEffectDep = dependencies.find(dep => 
      dep.from.methodName === 'useEffect (imported)' && 
      dep.to.methodName === 'someFunction'
    );

    // 両方ともimport文の行番号(2)を使用していることを確認
    expect(useStateDep?.fromLine).toBe(2);
    expect(useEffectDep?.fromLine).toBe(2);
  });
});