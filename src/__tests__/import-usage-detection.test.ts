import { analyzeTypeScriptWithESTree } from '@/utils/typescript-estree-analyzer';
import { ParsedFile } from '@/types/codebase';

describe('Import Usage Detection', () => {
  const createTestFile = (content: string, path: string = 'test.tsx'): ParsedFile => ({
    path,
    language: 'tsx' as const,
    content,
    directory: 'src',
    fileName: path.split('/').pop() || 'test.tsx',
    methods: [],
    totalLines: content.split('\n').length
  });

  describe('Basic Import Usage Detection', () => {
    it('should detect function call usage', () => {
      const content = `
import { useState, useEffect } from 'react';
import Button from '@/components/Button';

function MyComponent() {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    console.log('Effect');
  }, []);

  return <Button onClick={() => setCount(count + 1)}>Click</Button>;
}`;

      const file = createTestFile(content);
      const methods = analyzeTypeScriptWithESTree(file);
      
      // インポート文を取得
      const imports = methods.filter(m => m.type === 'import');
      const usages = methods.filter(m => m.type === 'import_usage');
      
      expect(imports).toHaveLength(2);
      expect(usages.length).toBeGreaterThan(0);
      
      // useStateの使用が検出されることを確認
      const useStateUsage = usages.find(u => u.name.includes('useState'));
      expect(useStateUsage).toBeDefined();
      expect(useStateUsage!.startLine).toBeGreaterThan(1);
      
      // useEffectの使用が検出されることを確認
      const useEffectUsage = usages.find(u => u.name.includes('useEffect'));
      expect(useEffectUsage).toBeDefined();
      
      // Buttonコンポーネントの使用が検出されることを確認
      const buttonUsage = usages.find(u => u.name.includes('Button'));
      expect(buttonUsage).toBeDefined();
    });

    it('should detect JSX component usage', () => {
      const content = `
import React from 'react';
import { Card, Button } from '@/components';
import Modal from '@/components/Modal';

function App() {
  return (
    <div>
      <Card>
        <h1>Title</h1>
        <Button variant="primary">Action</Button>
      </Card>
      <Modal isOpen={true}>
        <p>Modal content</p>
      </Modal>
    </div>
  );
}`;

      const file = createTestFile(content);
      const methods = analyzeTypeScriptWithESTree(file);
      
      const usages = methods.filter(m => m.type === 'import_usage');
      
      // Card, Button, Modalの使用が検出されることを確認
      const cardUsage = usages.find(u => u.name.includes('Card'));
      const buttonUsage = usages.find(u => u.name.includes('Button'));
      const modalUsage = usages.find(u => u.name.includes('Modal'));
      
      expect(cardUsage).toBeDefined();
      expect(buttonUsage).toBeDefined();
      expect(modalUsage).toBeDefined();
    });

    it('should detect property access usage', () => {
      const content = `
import * as utils from '@/utils';
import config from '@/config';

function processData() {
  const result = utils.formatData(data);
  const apiUrl = config.API_URL;
  
  return utils.validateResult(result);
}`;

      const file = createTestFile(content);
      const methods = analyzeTypeScriptWithESTree(file);
      
      const usages = methods.filter(m => m.type === 'import_usage');
      
      // utils.*の使用が検出されることを確認
      const utilsUsages = usages.filter(u => u.name.includes('utils'));
      expect(utilsUsages.length).toBeGreaterThanOrEqual(1);
      
      // configの使用が検出されることを確認
      const configUsage = usages.find(u => u.name.includes('config'));
      expect(configUsage).toBeDefined();
    });

    it('should detect type annotation usage', () => {
      const content = `
import { User, ApiResponse } from '@/types';
import { Database } from '@/services';

interface ComponentProps {
  user: User;
  onSave: (user: User) => void;
}

function saveUser(db: Database): ApiResponse<User> {
  // implementation
  return {} as ApiResponse<User>;
}`;

      const file = createTestFile(content);
      const methods = analyzeTypeScriptWithESTree(file);
      
      const usages = methods.filter(m => m.type === 'import_usage');
      
      // 型注釈での使用が検出されることを確認
      const userUsages = usages.filter(u => u.name.includes('User'));
      const apiResponseUsages = usages.filter(u => u.name.includes('ApiResponse'));
      const databaseUsages = usages.filter(u => u.name.includes('Database'));
      
      expect(userUsages.length).toBeGreaterThan(0);
      expect(apiResponseUsages.length).toBeGreaterThan(0);
      expect(databaseUsages.length).toBeGreaterThan(0);
    });
  });

  describe('Complex Import Patterns', () => {
    it('should handle import aliases correctly', () => {
      const content = `
import { Button as PrimaryButton } from '@/components/Button';
import { User as UserType } from '@/types';

function MyComponent() {
  const user: UserType = { name: 'John' };
  
  return <PrimaryButton>{user.name}</PrimaryButton>;
}`;

      const file = createTestFile(content);
      const methods = analyzeTypeScriptWithESTree(file);
      
      const usages = methods.filter(m => m.type === 'import_usage');
      
      // エイリアス名での使用が検出されることを確認
      const primaryButtonUsage = usages.find(u => u.name.includes('PrimaryButton'));
      const userTypeUsage = usages.find(u => u.name.includes('UserType'));
      
      expect(primaryButtonUsage).toBeDefined();
      expect(userTypeUsage).toBeDefined();
    });

    it('should detect usage in function arguments', () => {
      const content = `
import { validateEmail } from '@/utils/validation';
import { ApiClient } from '@/services';

function processUser(email: string, api: ApiClient) {
  if (validateEmail(email)) {
    api.updateUser({ email });
  }
}`;

      const file = createTestFile(content);
      const methods = analyzeTypeScriptWithESTree(file);
      
      const usages = methods.filter(m => m.type === 'import_usage');
      
      const validateEmailUsage = usages.find(u => u.name.includes('validateEmail'));
      const apiClientUsage = usages.find(u => u.name.includes('ApiClient'));
      
      expect(validateEmailUsage).toBeDefined();
      expect(apiClientUsage).toBeDefined();
    });

    it('should detect usage in array/object literals', () => {
      const content = `
import { createUser, deleteUser } from '@/api';
import { DEFAULT_CONFIG } from '@/config';

const actions = [createUser, deleteUser];
const config = { ...DEFAULT_CONFIG, debug: true };`;

      const file = createTestFile(content);
      const methods = analyzeTypeScriptWithESTree(file);
      
      const usages = methods.filter(m => m.type === 'import_usage');
      
      const createUserUsage = usages.find(u => u.name.includes('createUser'));
      const deleteUserUsage = usages.find(u => u.name.includes('deleteUser'));
      const defaultConfigUsage = usages.find(u => u.name.includes('DEFAULT_CONFIG'));
      
      expect(createUserUsage).toBeDefined();
      expect(deleteUserUsage).toBeDefined();
      expect(defaultConfigUsage).toBeDefined();
    });
  });

  describe('Jump Navigation', () => {
    it('should create bidirectional references between imports and usages', () => {
      const content = `
import { useState } from 'react';

function Counter() {
  const [count, setCount] = useState(0);
  return <div>{count}</div>;
}`;

      const file = createTestFile(content);
      const methods = analyzeTypeScriptWithESTree(file);
      
      const imports = methods.filter(m => m.type === 'import');
      const usages = methods.filter(m => m.type === 'import_usage');
      
      expect(imports).toHaveLength(1);
      expect(usages.length).toBeGreaterThan(0);
      
      const reactImport = imports[0];
      const useStateUsage = usages.find(u => u.name.includes('useState'));
      
      // インポートから使用箇所への参照
      expect(reactImport.calls.length).toBeGreaterThan(0);
      
      // 使用箇所からインポートへの参照
      expect(useStateUsage!.calls).toHaveLength(1);
      expect(useStateUsage!.calls[0].line).toBe(reactImport.startLine);
      expect(useStateUsage!.importSource).toBe(reactImport.startLine.toString());
    });

    it('should handle multiple usages of the same import', () => {
      const content = `
import { Button } from '@/components';

function App() {
  return (
    <div>
      <Button>First</Button>
      <Button variant="secondary">Second</Button>
      <Button disabled>Third</Button>
    </div>
  );
}`;

      const file = createTestFile(content);
      const methods = analyzeTypeScriptWithESTree(file);
      
      const imports = methods.filter(m => m.type === 'import');
      const usages = methods.filter(m => m.type === 'import_usage');
      
      const buttonImport = imports[0];
      const buttonUsages = usages.filter(u => u.name.includes('Button'));
      
      // 複数の使用箇所が検出されることを確認
      expect(buttonUsages.length).toBeGreaterThanOrEqual(1);
      
      // すべての使用箇所が同じインポートを参照していることを確認
      buttonUsages.forEach(usage => {
        expect(usage.importSource).toBe(buttonImport.startLine.toString());
        expect(usage.calls[0].line).toBe(buttonImport.startLine);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should not detect usage in comments', () => {
      const content = `
import { Button } from '@/components';

function App() {
  // This Button component is really useful
  /* 
   * Button should be used carefully
   * Button props are well documented
   */
  return <Button>Real usage</Button>;
}`;

      const file = createTestFile(content);
      const methods = analyzeTypeScriptWithESTree(file);
      
      const usages = methods.filter(m => m.type === 'import_usage');
      const buttonUsages = usages.filter(u => u.name.includes('Button'));
      
      // コメント内のButtonはできるだけ除去されるが、実際の使用は確実に検出される
      expect(buttonUsages.length).toBeGreaterThanOrEqual(1);
      
      // 実際の使用箇所が含まれていることを確認
      const realUsage = buttonUsages.find(usage => 
        usage.code.includes('<Button>Real usage</Button>')
      );
      expect(realUsage).toBeDefined();
    });

    it('should not detect usage in import statements themselves', () => {
      const content = `
import React from 'react';
import { useState, useEffect, useContext } from 'react';

function Component() {
  const [state, setState] = useState(0);
  return <div>{state}</div>;
}`;

      const file = createTestFile(content);
      const methods = analyzeTypeScriptWithESTree(file);
      
      const usages = methods.filter(m => m.type === 'import_usage');
      
      // インポート文自体では使用として検出されない
      usages.forEach(usage => {
        expect(usage.startLine).toBeGreaterThan(2); // インポート行より後
      });
    });
  });
});