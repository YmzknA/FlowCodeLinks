/**
 * インポートメソッド名抽出のテスト
 */

import { analyzeMethodsInFile } from '@/utils/method-analyzer';
import { ParsedFile } from '@/types/codebase';

describe('Import Method Extraction', () => {
  test('should extract useAuth from import statement', () => {
    const testFile: ParsedFile = {
      path: 'test.tsx',
      fileName: 'test.tsx',
      language: 'typescript',
      totalLines: 3,
      content: `import { useAuth } from "@/api";
export default function Test() {
  const { login } = useAuth();
}`,
      methods: []
    };

    const allDefinedMethods = new Set(['useAuth', 'Test']);
    const methods = analyzeMethodsInFile(testFile, allDefinedMethods);

    console.log('\n=== IMPORT METHOD EXTRACTION TEST ===');
    methods.forEach((method, index) => {
      console.log(`\nMethod ${index + 1}:`);
      console.log(`  Name: ${method.name}`);
      console.log(`  Type: ${method.type}`);
      console.log(`  Line: ${method.startLine}`);
      console.log(`  Parameters: ${JSON.stringify(method.parameters)}`);
      if (method.calls && method.calls.length > 0) {
        console.log(`  Calls:`);
        method.calls.forEach(call => {
          console.log(`    - ${call.methodName} at line ${call.line}`);
        });
      }
    });

    // import文が正しく解析されていることを確認
    const importMethod = methods.find(m => m.type === 'import' && m.name.includes('@/api'));
    expect(importMethod).toBeDefined();
    expect(importMethod?.parameters).toContain('useAuth');
    
    console.log(`\nFound import method parameters: ${JSON.stringify(importMethod?.parameters)}`);
  });

  test('should extract multiple methods from import statement', () => {
    const testFile: ParsedFile = {
      path: 'test.tsx',
      fileName: 'test.tsx',
      language: 'typescript',
      totalLines: 4,
      content: `import { useAuth, authClient } from "@/api";
import { userState } from "@/recoil";
export default function Test() {
  const { login } = useAuth();
}`,
      methods: []
    };

    const allDefinedMethods = new Set(['useAuth', 'authClient', 'userState', 'Test']);
    const methods = analyzeMethodsInFile(testFile, allDefinedMethods);

    console.log('\n=== MULTIPLE IMPORT METHODS TEST ===');
    
    const apiImport = methods.find(m => m.type === 'import' && m.name.includes('@/api'));
    const recoilImport = methods.find(m => m.type === 'import' && m.name.includes('@/recoil'));
    
    console.log(`API import parameters: ${JSON.stringify(apiImport?.parameters)}`);
    console.log(`Recoil import parameters: ${JSON.stringify(recoilImport?.parameters)}`);
    
    expect(apiImport?.parameters).toContain('useAuth');
    expect(apiImport?.parameters).toContain('authClient');
    expect(recoilImport?.parameters).toContain('userState');
  });

  test('should handle import with alias', () => {
    const testFile: ParsedFile = {
      path: 'test.tsx',
      fileName: 'test.tsx',
      language: 'typescript',
      totalLines: 3,
      content: `import { useAuth as useAuthentication } from "@/api";
export default function Test() {
  const { login } = useAuthentication();
}`,
      methods: []
    };

    const allDefinedMethods = new Set(['useAuthentication', 'Test']);
    const methods = analyzeMethodsInFile(testFile, allDefinedMethods);

    console.log('\n=== IMPORT ALIAS TEST ===');
    
    const importMethod = methods.find(m => m.type === 'import' && m.name.includes('@/api'));
    console.log(`Import with alias parameters: ${JSON.stringify(importMethod?.parameters)}`);
    
    // aliasが正しく抽出されることを確認
    expect(importMethod?.parameters).toContain('useAuthentication');
    expect(importMethod?.parameters).not.toContain('useAuth');
  });

  test('should handle default import', () => {
    const testFile: ParsedFile = {
      path: 'test.tsx',
      fileName: 'test.tsx',
      language: 'typescript',
      totalLines: 3,
      content: `import React from "react";
export default function Test() {
  return <div>Hello</div>;
}`,
      methods: []
    };

    const allDefinedMethods = new Set(['React', 'Test']);
    const methods = analyzeMethodsInFile(testFile, allDefinedMethods);

    console.log('\n=== DEFAULT IMPORT TEST ===');
    
    const importMethod = methods.find(m => m.type === 'import' && m.name.includes('react'));
    console.log(`Default import parameters: ${JSON.stringify(importMethod?.parameters)}`);
    
    expect(importMethod?.parameters).toContain('React');
  });
});