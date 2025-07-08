/**
 * import文内のメソッド名クリック機能のテスト
 */

import { makeImportMethodsClickable, replaceMethodNameInText } from '@/utils/method-highlighting';

describe('Import Method Click Feature', () => {
  describe('makeImportMethodsClickable', () => {
    test('should make import method names clickable when definition exists', () => {
      const html = `
        <span class="token keyword">import</span> <span class="token punctuation">{</span> 
        <span class="token">CreateRecord</span><span class="token punctuation">,</span> 
        <span class="token">RecordList</span> 
        <span class="token punctuation">}</span> <span class="token keyword">from</span> 
        <span class="token string">'@/components/records'</span><span class="token punctuation">;</span>
      `;
      
      const importMethods = ['CreateRecord', 'RecordList'];
      
      // 定義検索関数をモック（両方とも定義が見つかる）
      const findMethodDefinition = jest.fn((methodName: string) => ({
        methodName,
        filePath: '/components/records.ts'
      }));
      
      const result = makeImportMethodsClickable(html, importMethods, findMethodDefinition);
      
      // CreateRecordがクリック可能になることを確認
      expect(result).toContain('data-method-name="CreateRecord"');
      expect(result).toContain('data-import-method="true"');
      expect(result).toContain('cursor-pointer');
      
      // RecordListもクリック可能になることを確認
      expect(result).toContain('data-method-name="RecordList"');
      
      expect(findMethodDefinition).toHaveBeenCalledWith('CreateRecord');
      expect(findMethodDefinition).toHaveBeenCalledWith('RecordList');
    });

    test('should not make import method names clickable when definition does not exist', () => {
      const html = `
        <span class="token keyword">import</span> <span class="token punctuation">{</span> 
        <span class="token">UnknownMethod</span>
        <span class="token punctuation">}</span> <span class="token keyword">from</span> 
        <span class="token string">'@/unknown'</span><span class="token punctuation">;</span>
      `;
      
      const importMethods = ['UnknownMethod'];
      
      // 定義検索関数をモック（定義が見つからない）
      const findMethodDefinition = jest.fn().mockReturnValue(null);
      
      const result = makeImportMethodsClickable(html, importMethods, findMethodDefinition);
      
      // クリック可能にならないことを確認
      expect(result).not.toContain('data-method-name="UnknownMethod"');
      expect(result).not.toContain('cursor-pointer');
      
      expect(findMethodDefinition).toHaveBeenCalledWith('UnknownMethod');
    });

    test('should preserve existing data-method-name attributes', () => {
      const html = `
        <span class="cursor-pointer" data-method-name="existingMethod">existingMethod</span>
        <span class="token">CreateRecord</span>
      `;
      
      const importMethods = ['CreateRecord'];
      const result = makeImportMethodsClickable(html, importMethods);
      
      // 既存のdata-method-name属性は保護される
      expect(result).toContain('data-method-name="existingMethod"');
      // 新しいimport methodも追加される
      expect(result).toContain('data-method-name="CreateRecord"');
      expect(result).toContain('data-import-method="true"');
    });

    test('should handle prism highlighted import methods', () => {
      const html = `
        <span class="token keyword">import</span> <span class="token punctuation">{</span>
        <span class="token identifier">CreateRecord</span>
        <span class="token punctuation">}</span>
      `;
      
      const importMethods = ['CreateRecord'];
      const result = makeImportMethodsClickable(html, importMethods);
      
      expect(result).toContain('data-method-name="CreateRecord"');
      expect(result).toContain('data-import-method="true"');
    });

    test('should handle methods with "as" alias', () => {
      const html = `
        <span class="token keyword">import</span> <span class="token punctuation">{</span>
        <span class="token">CreateRecord</span> <span class="token keyword">as</span> <span class="token">CR</span>
        <span class="token punctuation">}</span>
      `;
      
      const importMethods = ['CreateRecord'];
      const result = makeImportMethodsClickable(html, importMethods);
      
      // エイリアスがある場合でも、元のメソッド名をクリック可能にする（定義元にジャンプするため）
      expect(result).toContain('data-method-name="CreateRecord"');
      expect(result).toContain('data-import-method="true"');
    });

    test('should handle empty import methods list', () => {
      const html = `<span class="token">CreateRecord</span>`;
      const importMethods: string[] = [];
      
      const result = makeImportMethodsClickable(html, importMethods);
      
      // 変更されないことを確認
      expect(result).toBe(html);
    });

    test('should handle complex import patterns', () => {
      const html = `
        <span class="token keyword">import</span> <span class="token punctuation">{</span>
        <span class="token">useState</span><span class="token punctuation">,</span>
        <span class="token">useEffect</span><span class="token punctuation">,</span>
        <span class="token">useMemo</span>
        <span class="token punctuation">}</span> <span class="token keyword">from</span>
        <span class="token string">'react'</span><span class="token punctuation">;</span>
      `;
      
      const importMethods = ['useState', 'useEffect', 'useMemo'];
      const result = makeImportMethodsClickable(html, importMethods);
      
      // 全てのメソッドがクリック可能になることを確認
      expect(result).toContain('data-method-name="useState"');
      expect(result).toContain('data-method-name="useEffect"');
      expect(result).toContain('data-method-name="useMemo"');
      
      // 全てにimport-method属性が付くことを確認
      const importMethodMatches = result.match(/data-import-method="true"/g);
      expect(importMethodMatches).toHaveLength(3);
    });
  });

  describe('replaceMethodNameInText with clickability check', () => {
    test('should make method clickable when definition exists', () => {
      const html = '<pre>function callMethod() { someMethod(); }</pre>';
      const methodName = 'someMethod';
      const escapedMethodName = 'someMethod';
      
      const findMethodDefinition = jest.fn().mockReturnValue({
        methodName: 'someMethod',
        filePath: '/path/to/definition.ts'
      });
      
      const findAllMethodCallers = jest.fn().mockReturnValue([]);
      const currentFilePath = '/path/to/current.ts';
      const files = [
        { path: '/path/to/current.ts', methods: [] },
        { path: '/path/to/definition.ts', methods: [{ name: 'someMethod' }] }
      ];
      
      const result = replaceMethodNameInText(
        html, methodName, escapedMethodName,
        findMethodDefinition, findAllMethodCallers, currentFilePath, files
      );
      
      expect(result).toContain('data-method-name="someMethod"');
      expect(result).toContain('cursor-pointer');
      expect(findMethodDefinition).toHaveBeenCalledWith('someMethod');
    });

    test('should not make method clickable when definition does not exist', () => {
      const html = '<pre>function callMethod() { unknownMethod(); }</pre>';
      const methodName = 'unknownMethod';
      const escapedMethodName = 'unknownMethod';
      
      const findMethodDefinition = jest.fn().mockReturnValue(null);
      const findAllMethodCallers = jest.fn().mockReturnValue([]);
      const currentFilePath = '/path/to/current.ts';
      const files = [
        { path: '/path/to/current.ts', methods: [] }
      ];
      
      const result = replaceMethodNameInText(
        html, methodName, escapedMethodName,
        findMethodDefinition, findAllMethodCallers, currentFilePath, files
      );
      
      expect(result).not.toContain('data-method-name="unknownMethod"');
      expect(result).not.toContain('cursor-pointer');
      expect(result).toBe(html); // 変更されない
    });

    test('should make defined method clickable only when it has callers', () => {
      const html = '<pre>function definedMethod() { return true; }</pre>';
      const methodName = 'definedMethod';
      const escapedMethodName = 'definedMethod';
      
      const findMethodDefinition = jest.fn().mockReturnValue({
        methodName: 'definedMethod',
        filePath: '/path/to/current.ts'
      });
      
      // 呼び出し元があるケース
      const findAllMethodCallersWithCallers = jest.fn().mockReturnValue([
        { methodName: 'caller1', filePath: '/path/to/caller.ts', lineNumber: 10 }
      ]);
      
      const currentFilePath = '/path/to/current.ts';
      const files = [
        { 
          path: '/path/to/current.ts', 
          methods: [{ name: 'definedMethod' }]
        }
      ];
      
      const resultWithCallers = replaceMethodNameInText(
        html, methodName, escapedMethodName,
        findMethodDefinition, findAllMethodCallersWithCallers, currentFilePath, files
      );
      
      expect(resultWithCallers).toContain('data-method-name="definedMethod"');
      expect(resultWithCallers).toContain('cursor-pointer');
      
      // 呼び出し元がないケース
      const findAllMethodCallersWithoutCallers = jest.fn().mockReturnValue([]);
      
      const resultWithoutCallers = replaceMethodNameInText(
        html, methodName, escapedMethodName,
        findMethodDefinition, findAllMethodCallersWithoutCallers, currentFilePath, files
      );
      
      expect(resultWithoutCallers).not.toContain('data-method-name="definedMethod"');
      expect(resultWithoutCallers).toBe(html); // 変更されない
    });
  });

  describe('Integration with component hierarchy', () => {
    test('should be integrated in CodeContent component', () => {
      // CodeContent.tsxでmakeImportMethodsClickableが呼び出されることを確認
      const codeContentPath = 'src/components/CodeContent.tsx';
      const fs = require('fs');
      const content = fs.readFileSync(codeContentPath, 'utf-8');
      
      expect(content).toContain('makeImportMethodsClickable');
      expect(content).toContain('import { replaceMethodNameInText, makeImportMethodsClickable, highlightMethodDefinition }');
    });

    test('should be integrated in FloatingWindow component', () => {
      // FloatingWindow.tsxでdata-import-method属性を検出する処理があることを確認
      const floatingWindowPath = 'src/components/FloatingWindow.tsx';
      const fs = require('fs');
      const content = fs.readFileSync(floatingWindowPath, 'utf-8');
      
      expect(content).toContain('data-import-method');
      expect(content).toContain('onImportMethodClick');
    });

    test('should propagate through component hierarchy', () => {
      // CodeVisualizer → LayoutManager → DraggableWindow → FloatingWindowの連携を確認
      const components = [
        'src/components/CodeVisualizer.tsx',
        'src/components/LayoutManager.tsx', 
        'src/components/DraggableWindow.tsx'
      ];
      
      const fs = require('fs');
      
      components.forEach(componentPath => {
        const content = fs.readFileSync(componentPath, 'utf-8');
        expect(content).toContain('onImportMethodClick');
      });
    });
  });

  describe('Click handler behavior', () => {
    test('should distinguish import methods from regular methods', () => {
      // import methodのクリック時は onImportMethodClick が呼ばれる
      // 通常のmethodのクリック時は onMethodClick が呼ばれる
      
      // FloatingWindowコンポーネントのロジックを確認
      const floatingWindowPath = 'src/components/FloatingWindow.tsx';
      const fs = require('fs');
      const content = fs.readFileSync(floatingWindowPath, 'utf-8');
      
      // import method用の条件分岐があることを確認
      expect(content).toContain('isImportMethod = currentElement.getAttribute(\'data-import-method\') === \'true\'');
      expect(content).toContain('if (isImportMethod && onImportMethodClickRef?.current)');
      expect(content).toContain('onImportMethodClickRef.current(methodName!)');
    });

    test('should call handleImportMethodClick in CodeVisualizer', () => {
      // CodeVisualizerでhandleImportMethodClickが定義されていることを確認
      const codeVisualizerPath = 'src/components/CodeVisualizer.tsx';
      const fs = require('fs');
      const content = fs.readFileSync(codeVisualizerPath, 'utf-8');
      
      expect(content).toContain('handleImportMethodClick');
      expect(content).toContain('findMethodDefinition(methodName)');
      expect(content).toContain('handleMethodJump(definition)');
    });
  });
});