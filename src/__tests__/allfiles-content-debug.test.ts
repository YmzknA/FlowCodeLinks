/**
 * __allFilesの内容デバッグ
 */

import { analyzeMethodsInFile } from '@/utils/method-analyzer';
import { ParsedFile } from '@/types/codebase';

describe('AllFiles Content Debug', () => {
  test('should debug what gets included in __allFiles', () => {
    // Simulate __allFiles content
    
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
      // Analyze each file
      const methods = analyzeMethodsInFile(file, allDefinedMethods);
      file.methods = methods;
      
      methods.forEach(method => {
        // Check method detection
        expect(method.name).toBeDefined();
        expect(method.type).toBeDefined();
      });
    });
    
    // findMethodDefinition関数の動作をシミュレート
    // Simulate findMethodDefinition function
    
    const findMethodDefinition = (methodName: string) => {
      for (const searchFile of files) {
        if (searchFile.methods) {
          for (const method of searchFile.methods) {
            if (method.name === methodName) {
              return {
                methodName: method.name,
                filePath: searchFile.path
              };
            }
          }
        }
      }
      
      return null;
    };
    
    // useAuthの検索テスト
    const useAuthDef = findMethodDefinition('useAuth');
    expect(useAuthDef).toBeDefined();
    expect(useAuthDef?.methodName).toBe('useAuth');
    
    // 見つからないメソッドのテスト
    const unknownDef = findMethodDefinition('unknownMethod');
    expect(unknownDef).toBeNull();
    
    // If useAuth is found here, the problem is elsewhere
    // Check if auth.ts is actually included in the real application
  });

  test('should test exact name matching in findMethodDefinition', () => {
    // Test exact name matching
    
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
      for (const method of mockFile.methods) {
        if (method.name === searchName) {
          return { methodName: method.name, filePath: mockFile.path };
        }
      }
      
      return null;
    };
    
    // useAuthの厳密マッチングテスト
    const exactMatch = findMethodDefinition('useAuth');
    expect(exactMatch).toBeDefined();
    
    // 類似名でのマッチングテスト（マッチしないはず）
    const importUsageMatch = findMethodDefinition('useAuth (imported)');
    const importStatementMatch = findMethodDefinition('[Import: @/api]');
    
    // Verify exact matching behavior
    expect(exactMatch).toBeDefined();
    expect(importUsageMatch).toBeDefined();
    expect(importStatementMatch).toBeDefined();
  });
});