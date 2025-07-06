/**
 * __allFilesの内容デバッグ
 */

import { analyzeMethodsInFile } from '@/utils/method-analyzer';
import { ParsedFile } from '@/types/codebase';

describe('AllFiles Content Debug', () => {
  test('should debug what gets included in __allFiles', () => {
    console.log('\n=== __allFiles CONTENT SIMULATION ===');
    
    // 実際のアプリで使用されるファイル構成をシミュレート
    const files: ParsedFile[] = [
      {
        path: 'front/src/app/page.tsx',
        fileName: 'page.tsx',
        language: 'typescript',
        totalLines: 25,
        content: `"use client";
import { useAuth } from "@/api";
import { userState } from "@/recoil";
// ... rest of page.tsx content
export default function Home() {
  const { login, autoLogin } = useAuth();
  const user = useRecoilValue(userState);
  // ...
}`,
        methods: []
      },
      {
        path: 'front/src/api/auth.ts',
        fileName: 'auth.ts',
        language: 'typescript',
        totalLines: 100,
        content: `import { userState } from "@/recoil";
import axios from "axios";
import { useSetRecoilState } from "recoil";

// ... auth client setup

export const useAuth = () => {
  const setUser = useSetRecoilState(userState);
  
  async function login(): Promise<void> {
    window.location.href = \`\${BASE_API_URL}/auth/github\`;
  }
  
  async function autoLogin(): Promise<boolean> {
    // ... implementation
  }
  
  return { login, autoLogin };
};`,
        methods: []
      },
      {
        path: 'front/src/api/index.ts',
        fileName: 'index.ts',
        language: 'typescript',
        totalLines: 3,
        content: `import { useAuth, authClient } from "./auth";

export { useAuth, authClient };`,
        methods: []
      }
    ];
    
    // 各ファイルを解析してメソッドを抽出
    const allDefinedMethods = new Set(['useAuth', 'authClient', 'userState', 'Home', 'login', 'autoLogin', 'setUser']);
    
    files.forEach(file => {
      console.log(`\n--- Analyzing ${file.path} ---`);
      const methods = analyzeMethodsInFile(file, allDefinedMethods);
      file.methods = methods;
      
      methods.forEach(method => {
        console.log(`  ${method.type}: ${method.name} (line ${method.startLine})`);
        if (method.parameters && method.parameters.length > 0) {
          console.log(`    Parameters: ${JSON.stringify(method.parameters)}`);
        }
      });
    });
    
    // findMethodDefinition関数の動作をシミュレート
    console.log('\n=== FIND METHOD DEFINITION SIMULATION ===');
    
    const findMethodDefinition = (methodName: string) => {
      console.log(`\nSearching for: ${methodName}`);
      
      for (const searchFile of files) {
        if (searchFile.methods) {
          for (const method of searchFile.methods) {
            if (method.name === methodName) {
              console.log(`  Found: ${methodName} in ${searchFile.path} (${method.type})`);
              return {
                methodName: method.name,
                filePath: searchFile.path
              };
            }
          }
        }
      }
      
      console.log(`  Not found: ${methodName}`);
      return null;
    };
    
    // useAuthの検索テスト
    const useAuthDef = findMethodDefinition('useAuth');
    expect(useAuthDef).toBeDefined();
    expect(useAuthDef?.methodName).toBe('useAuth');
    
    // 見つからないメソッドのテスト
    const unknownDef = findMethodDefinition('unknownMethod');
    expect(unknownDef).toBeNull();
    
    console.log('\n✅ If useAuth is found here, the problem is elsewhere');
    console.log('✅ Check if auth.ts is actually included in the real application');
  });

  test('should test exact name matching in findMethodDefinition', () => {
    console.log('\n=== EXACT NAME MATCHING TEST ===');
    
    // 名前の微妙な違いをテスト
    const testMethods = [
      'useAuth',
      'useAuth (imported)',
      '[Import: @/api]',
      'useAuth_exported',
      'custom_hook_useAuth'
    ];
    
    const mockFile = {
      path: 'test.ts',
      methods: testMethods.map(name => ({
        name,
        type: 'function',
        startLine: 1,
        endLine: 1,
        filePath: 'test.ts',
        code: '',
        calls: [],
        isPrivate: false,
        parameters: []
      }))
    };
    
    const findMethodDefinition = (searchName: string) => {
      console.log(`Searching for exact match: "${searchName}"`);
      
      for (const method of mockFile.methods) {
        console.log(`  Comparing with: "${method.name}"`);
        if (method.name === searchName) {
          console.log(`  ✅ Exact match found!`);
          return { methodName: method.name, filePath: mockFile.path };
        }
      }
      
      console.log(`  ❌ No exact match found`);
      return null;
    };
    
    // useAuthの厳密マッチングテスト
    const exactMatch = findMethodDefinition('useAuth');
    expect(exactMatch).toBeDefined();
    
    // 類似名でのマッチングテスト（マッチしないはず）
    const importUsageMatch = findMethodDefinition('useAuth (imported)');
    const importStatementMatch = findMethodDefinition('[Import: @/api]');
    
    console.log('\n--- Results ---');
    console.log(`useAuth: ${exactMatch ? 'Found' : 'Not found'}`);
    console.log(`useAuth (imported): ${importUsageMatch ? 'Found' : 'Not found'}`);
    console.log(`[Import: @/api]: ${importStatementMatch ? 'Found' : 'Not found'}`);
  });
});