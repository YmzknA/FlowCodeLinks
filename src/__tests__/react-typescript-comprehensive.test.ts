import { analyzeTypeScriptWithESTree } from '@/utils/typescript-estree-analyzer';
import { ParsedFile } from '@/types/codebase';

describe('React/TypeScript Comprehensive Analysis', () => {
  const createTestFile = (content: string, path: string = 'test.tsx'): ParsedFile => ({
    path,
    language: 'tsx' as const,
    content,
    directory: 'src',
    fileName: path.split('/').pop() || 'test.tsx',
    methods: [],
    totalLines: content.split('\n').length
  });

  describe('React Component Detection', () => {
    it('should detect function components', () => {
      const content = `
function MyComponent() {
  return <div>Hello World</div>;
}

export default function ExportedComponent() {
  return (
    <main>
      <h1>Title</h1>
    </main>
  );
}`;

      const file = createTestFile(content);
      const methods = analyzeTypeScriptWithESTree(file);
      
      const components = methods.filter(m => m.type === 'component');
      expect(components).toHaveLength(2);
      expect(components[0].name).toBe('MyComponent');
      expect(components[1].name).toBe('ExportedComponent');
    });

    it('should detect arrow function components', () => {
      const content = `
const Button: React.FC<{ label: string }> = ({ label }) => {
  return <button>{label}</button>;
};

const Header = () => (
  <header>
    <h1>App Title</h1>
  </header>
);`;

      const file = createTestFile(content);
      const methods = analyzeTypeScriptWithESTree(file);
      
      const components = methods.filter(m => m.type === 'component');
      expect(components).toHaveLength(2);
      expect(components[0].name).toBe('Button');
      expect(components[1].name).toBe('Header');
    });

    it('should distinguish components from regular functions', () => {
      const content = `
function regularFunction() {
  return "not a component";
}

function ComponentFunction() {
  return <div>I am a component</div>;
}

const helperFunction = () => {
  console.log("helper");
};

const ComponentArrow = () => {
  return <span>Component</span>;
};`;

      const file = createTestFile(content);
      const methods = analyzeTypeScriptWithESTree(file);
      
      const components = methods.filter(m => m.type === 'component');
      const functions = methods.filter(m => m.type === 'function');
      
      expect(components).toHaveLength(2);
      expect(functions).toHaveLength(2);
      expect(components.map(c => c.name)).toEqual(['ComponentFunction', 'ComponentArrow']);
      expect(functions.map(f => f.name)).toEqual(['regularFunction', 'helperFunction']);
    });
  });

  describe('Custom Hooks Detection', () => {
    it('should detect custom hooks with function declaration', () => {
      const content = `
function useCounter(initialValue: number = 0) {
  const [count, setCount] = useState(initialValue);
  
  const increment = () => setCount(count + 1);
  const decrement = () => setCount(count - 1);
  
  return { count, increment, decrement };
}

function useLocalStorage(key: string) {
  const [value, setValue] = useState(() => {
    return localStorage.getItem(key);
  });
  
  return [value, setValue];
}`;

      const file = createTestFile(content);
      const methods = analyzeTypeScriptWithESTree(file);
      
      const hooks = methods.filter(m => m.type === 'custom_hook');
      expect(hooks).toHaveLength(2);
      expect(hooks[0].name).toBe('useCounter');
      expect(hooks[1].name).toBe('useLocalStorage');
    });

    it('should detect custom hooks with arrow functions', () => {
      const content = `
const useApi = (url: string) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    setLoading(true);
    fetch(url)
      .then(response => response.json())
      .then(data => {
        setData(data);
        setLoading(false);
      });
  }, [url]);
  
  return { data, loading };
};

const useToggle = (initialValue = false) => {
  const [value, setValue] = useState(initialValue);
  const toggle = useCallback(() => setValue(v => !v), []);
  return [value, toggle];
};`;

      const file = createTestFile(content);
      const methods = analyzeTypeScriptWithESTree(file);
      
      const hooks = methods.filter(m => m.type === 'custom_hook');
      expect(hooks).toHaveLength(2);
      expect(hooks[0].name).toBe('useApi');
      expect(hooks[1].name).toBe('useToggle');
    });

    it('should not detect functions that do not follow hook naming convention', () => {
      const content = `
function getUserData() {
  return fetch('/api/user').then(r => r.json());
}

const utilityFunction = () => {
  return "utility";
};

function UseStartingWithCapital() {
  return "not a hook";
}`;

      const file = createTestFile(content);
      const methods = analyzeTypeScriptWithESTree(file);
      
      const hooks = methods.filter(m => m.type === 'custom_hook');
      expect(hooks).toHaveLength(0);
    });
  });

  describe('TypeScript Type Definitions Detection', () => {
    it('should detect type aliases', () => {
      const content = `
type UserRole = 'admin' | 'user' | 'guest';

type ApiResponse<T> = {
  data: T;
  status: number;
  message: string;
};

export type ButtonVariant = 'primary' | 'secondary' | 'danger';`;

      const file = createTestFile(content, 'types.ts');
      const methods = analyzeTypeScriptWithESTree(file);
      
      const typeAliases = methods.filter(m => m.type === 'type_alias');
      expect(typeAliases).toHaveLength(3);
      expect(typeAliases.map(t => t.name)).toEqual(['UserRole', 'ApiResponse', 'ButtonVariant']);
    });

    it('should detect interfaces', () => {
      const content = `
interface User {
  id: number;
  name: string;
  email: string;
  isActive: boolean;
}

export interface ApiClient {
  get<T>(url: string): Promise<T>;
  post<T>(url: string, data: any): Promise<T>;
  delete(url: string): Promise<void>;
}

interface ComponentProps {
  title: string;
  onClose: () => void;
}`;

      const file = createTestFile(content, 'interfaces.ts');
      const methods = analyzeTypeScriptWithESTree(file);
      
      const interfaces = methods.filter(m => m.type === 'interface');
      expect(interfaces).toHaveLength(3);
      expect(interfaces.map(i => i.name)).toEqual(['User', 'ApiClient', 'ComponentProps']);
    });

    it('should detect interface methods', () => {
      const content = `
interface DatabaseService {
  connect(): Promise<void>;
  query<T>(sql: string, params?: any[]): Promise<T[]>;
  close(): Promise<void>;
}`;

      const file = createTestFile(content, 'service.ts');
      const methods = analyzeTypeScriptWithESTree(file);
      
      const interfaceMethods = methods.filter(m => m.type === 'interface_method');
      expect(interfaceMethods).toHaveLength(3);
      expect(interfaceMethods.map(m => m.name)).toEqual(['connect', 'query', 'close']);
    });

    it('should detect enums', () => {
      const content = `
enum Color {
  Red = '#ff0000',
  Green = '#00ff00',
  Blue = '#0000ff'
}

export enum HttpStatus {
  OK = 200,
  NotFound = 404,
  InternalServerError = 500
}`;

      const file = createTestFile(content, 'enums.ts');
      const methods = analyzeTypeScriptWithESTree(file);
      
      const enums = methods.filter(m => m.type === 'enum');
      expect(enums).toHaveLength(2);
      expect(enums.map(e => e.name)).toEqual(['Color', 'HttpStatus']);
    });
  });

  describe('Import/Export Detection', () => {
    it('should detect detailed import statements', () => {
      const content = `
import React from 'react';
import { useState, useEffect } from 'react';
import { Button as CustomButton } from '@/components/Button';
import * as utils from '@/utils';
import type { User } from '@/types';`;

      const file = createTestFile(content);
      const methods = analyzeTypeScriptWithESTree(file);
      
      const imports = methods.filter(m => m.type === 'import');
      expect(imports).toHaveLength(5);
      
      expect(imports[0].name).toBe("[Import: {default as React} from 'react']");
      expect(imports[1].name).toBe("[Import: {useState, useEffect} from 'react']");
      expect(imports[2].name).toBe("[Import: {Button as CustomButton} from '@/components/Button']");
      expect(imports[3].name).toBe("[Import: {* as utils} from '@/utils']");
    });

    it('should detect export statements', () => {
      const content = `
export const API_URL = 'https://api.example.com';

export function helper() {
  return 'helper';
}

export { Button } from './Button';
export { Modal as ModalComponent } from './Modal';

export default class Database {
  connect() {}
}`;

      const file = createTestFile(content);
      const methods = analyzeTypeScriptWithESTree(file);
      
      const exports = methods.filter(m => m.type === 'export');
      expect(exports.length).toBeGreaterThan(0);
      
      // デフォルトエクスポートをチェック
      const defaultExports = exports.filter(e => e.name.includes('Default Export'));
      expect(defaultExports).toHaveLength(1);
    });
  });

  describe('Complex React Patterns', () => {
    it('should handle React.FC with generic props', () => {
      const content = `
interface ButtonProps {
  variant: 'primary' | 'secondary';
  onClick: () => void;
}

const Button: React.FC<ButtonProps> = ({ variant, onClick }) => {
  return (
    <button 
      className={\`btn btn-\${variant}\`}
      onClick={onClick}
    >
      Click me
    </button>
  );
};`;

      const file = createTestFile(content);
      const methods = analyzeTypeScriptWithESTree(file);
      
      const components = methods.filter(m => m.type === 'component');
      const interfaces = methods.filter(m => m.type === 'interface');
      
      expect(components).toHaveLength(1);
      expect(interfaces).toHaveLength(1);
      expect(components[0].name).toBe('Button');
      expect(interfaces[0].name).toBe('ButtonProps');
    });

    it('should detect hook usage in components', () => {
      const content = `
const TodoApp = () => {
  const [todos, setTodos] = useState([]);
  const { user } = useAuth();
  const api = useApi();
  
  useEffect(() => {
    api.fetchTodos().then(setTodos);
  }, []);
  
  return (
    <div>
      <h1>Welcome {user.name}</h1>
      <TodoList todos={todos} />
    </div>
  );
};`;

      const file = createTestFile(content);
      const methods = analyzeTypeScriptWithESTree(file);
      
      const components = methods.filter(m => m.type === 'component');
      expect(components).toHaveLength(1);
      
      // Hook呼び出しの検出をテスト
      const component = components[0];
      expect(component.calls.length).toBeGreaterThan(0);
    });
  });
});