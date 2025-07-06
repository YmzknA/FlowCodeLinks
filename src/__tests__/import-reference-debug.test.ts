/**
 * import参照問題のデバッグテスト
 * 実際のコード解析でimport文が同一行を参照している問題を調査
 */

import { analyzeMethodsInFile } from '@/utils/method-analyzer';
import { ParsedFile } from '@/types/codebase';

describe('Import Reference Debug', () => {
  test('should debug actual import analysis', () => {
    // 実際のTypeScriptファイルをシミュレート
    const testFile: ParsedFile = {
      path: 'src/test-component.tsx',
      fileName: 'test-component.tsx',
      language: 'typescript',
      totalLines: 10,
      content: `import React from 'react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/Button';

export function TestComponent() {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    console.log('Effect');
  }, []);
  
  return <Button onClick={() => setCount(count + 1)}>Click me</Button>;
}`,
      methods: []
    };

    // 実際のメソッド解析を実行
    const allDefinedMethods = new Set(['useState', 'useEffect', 'Button', 'TestComponent']);
    const methods = analyzeMethodsInFile(testFile, allDefinedMethods);

    console.log('\n=== ANALYZED METHODS ===');
    methods.forEach((method, index) => {
      console.log(`\nMethod ${index + 1}:`);
      console.log(`  Name: ${method.name}`);
      console.log(`  Type: ${method.type}`);
      console.log(`  Line: ${method.startLine}`);
      console.log(`  ImportSource: ${method.importSource || 'N/A'}`);
      console.log(`  Calls: ${method.calls?.length || 0}`);
      
      if (method.calls && method.calls.length > 0) {
        method.calls.forEach((call, callIndex) => {
          console.log(`    Call ${callIndex + 1}: ${call.methodName} at line ${call.line}`);
        });
      }
    });

    // import文の分析
    const importMethods = methods.filter(m => m.type === 'import');
    const importUsageMethods = methods.filter(m => m.type === 'import_usage');

    console.log(`\n=== IMPORT ANALYSIS ===`);
    console.log(`Import statements: ${importMethods.length}`);
    console.log(`Import usages: ${importUsageMethods.length}`);

    // import使用箇所の詳細分析
    importUsageMethods.forEach((usage, index) => {
      console.log(`\nUsage ${index + 1}:`);
      console.log(`  Name: ${usage.name}`);
      console.log(`  Usage Line: ${usage.startLine}`);
      console.log(`  Import Source Line: ${usage.importSource}`);
      
      // importSourceが使用箇所と同じ行になっていないかチェック
      if (usage.importSource && parseInt(usage.importSource) === usage.startLine) {
        console.log(`  ⚠️  WARNING: Import source line equals usage line!`);
      }
    });

    // 基本的な構造チェック
    expect(importMethods.length).toBeGreaterThan(0);
    expect(importUsageMethods.length).toBeGreaterThan(0);

    // importSourceが正しく設定されているかチェック
    importUsageMethods.forEach(usage => {
      expect(usage.importSource).toBeDefined();
      expect(usage.importSource).not.toBe('');
      
      // importSourceが使用箇所の行番号と異なることを確認
      expect(parseInt(usage.importSource!)).not.toBe(usage.startLine);
    });
  });

  test('should analyze import statement creation', () => {
    // より単純なケースで問題を特定
    const simpleFile: ParsedFile = {
      path: 'src/simple.ts',
      fileName: 'simple.ts', 
      language: 'typescript',
      totalLines: 3,
      content: `import { helper } from './utils';
export function main() {
  return helper();
}`,
      methods: []
    };

    const allDefinedMethods = new Set(['helper', 'main']);
    const methods = analyzeMethodsInFile(simpleFile, allDefinedMethods);

    console.log('\n=== SIMPLE CASE ANALYSIS ===');
    methods.forEach(method => {
      console.log(`${method.type}: ${method.name} (line ${method.startLine})`);
      if (method.importSource) {
        console.log(`  ImportSource: ${method.importSource}`);
      }
      if (method.calls && method.calls.length > 0) {
        method.calls.forEach(call => {
          console.log(`  Calls: ${call.methodName} at line ${call.line}`);
        });
      }
    });

    const importStatement = methods.find(m => m.type === 'import');
    const importUsage = methods.find(m => m.type === 'import_usage');

    if (importStatement && importUsage) {
      // import文は1行目、使用箇所は3行目であることを確認
      expect(importStatement.startLine).toBe(1);
      expect(importUsage.startLine).toBe(3);
      expect(importUsage.importSource).toBe('1'); // import文の行番号を参照
    }
  });
});