import { ParsedFile } from '@/types/codebase';
import { 
  resolveImportPath, 
  resolveImportPathWithTsConfig, 
  isExternalLibrary, 
  parseImportStatement, 
  findExportStatement, 
  handleImportJump 
} from '@/utils/typescript-import-jump';

describe('TypeScript Import Jump Feature', () => {
  const createTestFile = (content: string, path: string = 'test.tsx'): ParsedFile => ({
    path,
    language: 'tsx' as const,
    content,
    directory: 'src',
    fileName: path.split('/').pop() || 'test.tsx',
    methods: [],
    totalLines: content.split('\n').length
  });

  describe('Path Resolution', () => {
    it('should resolve relative imports correctly', () => {
      const content = `
import { helperFunction } from './utils/helper';
import { Component } from '../components/Component';
import { config } from '../../config/app';
`;
      
      const file = createTestFile(content, 'src/pages/user.tsx');
      
      // Test implementation
      const result = resolveImportPath(file, './utils/helper');
      expect(result).toBe('src/utils/helper');
    });

    it('should resolve absolute imports with tsconfig paths', () => {
      const content = `
import { api } from '@/api/user';
import { utils } from '~/utils/helper';
`;
      
      const file = createTestFile(content, 'src/pages/user.tsx');
      const tsConfig = {
        compilerOptions: {
          paths: {
            '@/*': ['src/*'],
            '~/*': ['app/*']
          }
        }
      };
      
      // Test implementation
      const result = resolveImportPathWithTsConfig(file, '@/api/user', tsConfig);
      expect(result).toBe('src/api/user');
    });

    it('should handle external library imports', () => {
      const content = `
import { useState } from 'react';
import { format } from 'date-fns';
import { Button } from '@mui/material';
`;
      
      const file = createTestFile(content);
      
      // Test implementation
      expect(isExternalLibrary('react')).toBe(true);
      expect(isExternalLibrary('./local')).toBe(false);
      expect(isExternalLibrary('../local')).toBe(false);
    });
  });

  describe('Import Statement Parsing', () => {
    it('should parse named imports correctly', () => {
      const content = `
import { func1, func2 } from './module';
import { func3 as alias } from './module';
import { type Interface } from './types';
`;
      
      const file = createTestFile(content);
      
      // Test implementation
      const imports = parseImportStatement(file);
      expect(imports).toHaveLength(3);
      expect(imports[0].importName).toBe('func1');
      expect(imports[1].importName).toBe('func2');
      expect(imports[2].importName).toBe('alias');
    });

    it('should parse default imports correctly', () => {
      const content = `
import defaultFunc from './module';
import React from 'react';
`;
      
      const file = createTestFile(content);
      
      // Test implementation
      const imports = parseImportStatement(file);
      expect(imports).toHaveLength(2);
      expect(imports[0].importName).toBe('defaultFunc');
      expect(imports[0].isDefault).toBe(true);
      expect(imports[1].importName).toBe('React');
      expect(imports[1].isDefault).toBe(true);
    });

    it('should parse namespace imports correctly', () => {
      const content = `
import * as utils from './utils';
import * as React from 'react';
`;
      
      const file = createTestFile(content);
      
      // Test implementation
      const imports = parseImportStatement(file);
      expect(imports).toHaveLength(2);
      expect(imports[0].importName).toBe('utils');
      expect(imports[0].isNamespace).toBe(true);
      expect(imports[1].importName).toBe('React');
      expect(imports[1].isNamespace).toBe(true);
    });
  });

  describe('Export Statement Finding', () => {
    it('should find named export in target file', () => {
      const targetContent = `
export const func1 = () => {};
export const func2 = () => {};
export default mainFunc;
`;
      
      const targetFile = createTestFile(targetContent, 'src/utils/helper.ts');
      
      // Test implementation
      const exportInfo = findExportStatement(targetFile, 'func1');
      expect(exportInfo).not.toBeNull();
      expect(exportInfo?.exportName).toBe('func1');
      expect(exportInfo?.line).toBe(2);
      expect(exportInfo?.isDefault).toBe(false);
    });

    it('should find default export in target file', () => {
      const targetContent = `
const mainFunc = () => {};
export default mainFunc;
`;
      
      const targetFile = createTestFile(targetContent, 'src/utils/helper.ts');
      
      // Test implementation
      const exportInfo = findExportStatement(targetFile, 'default');
      expect(exportInfo).not.toBeNull();
      expect(exportInfo?.exportName).toBe('default');
      expect(exportInfo?.line).toBe(3);
      expect(exportInfo?.isDefault).toBe(true);
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete import jump flow', () => {
      const sourceContent = `
import { helperFunction } from './utils/helper';

function Component() {
  return helperFunction();
}
`;
      
      const targetContent = `
export const helperFunction = () => {
  return 'helper result';
};
`;
      
      const sourceFile = createTestFile(sourceContent, 'src/components/Component.tsx');
      const targetFile = createTestFile(targetContent, 'src/utils/helper.ts');
      const files = [sourceFile, targetFile];
      
      // Test implementation
      const result = handleImportJump(sourceFile, 'helperFunction', files);
      expect(result).not.toBeNull();
      expect(result?.targetFile.path).toBe('src/utils/helper.ts');
      expect(result?.exportInfo.exportName).toBe('helperFunction');
      expect(result?.exportInfo.line).toBe(2);
    });
  });
});