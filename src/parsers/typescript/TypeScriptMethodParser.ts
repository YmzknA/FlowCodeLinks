/**
 * TypeScript Method Parser
 * 
 * TypeScript/TSX言語専用のメソッド解析パーサー
 * JavaScriptパーサーを継承し、TypeScript固有の機能を追加
 */

import { JavaScriptMethodParser } from '../javascript/JavaScriptMethodParser';
import { ParsedFile, Method, MethodCall } from '@/types/codebase';
import { analyzeTypeScriptWithESTree } from '@/utils/typescript-estree-analyzer';

export class TypeScriptMethodParser extends JavaScriptMethodParser {
  readonly language = 'javascript'; // 基底クラスと一致させる

  // TypeScript/TSXの両方をサポート
  supports(language: string): boolean {
    return language === 'typescript' || language === 'tsx';
  }

  analyzeFile(file: ParsedFile, allDefinedMethods?: Set<string>): Method[] {
    if (!this.validateFile(file)) {
      return [];
    }

    return this.safeExecute(() => {
      // TypeScript専用のESTree解析を優先使用
      if (this.shouldUseESTreeAnalysis(file)) {
        return analyzeTypeScriptWithESTree(file, allDefinedMethods);
      }

      // フォールバック: JavaScript + TypeScript拡張解析
      const jsMethods = super.analyzeFile(file, allDefinedMethods);
      const tsMethods = this.analyzeTypeScriptSpecificFeatures(file, allDefinedMethods);
      
      return this.mergeMethodLists(jsMethods, tsMethods);
    }, []);
  }

  extractDefinitions(file: ParsedFile): Method[] {
    if (!this.validateFile(file)) {
      return [];
    }

    return this.safeExecute(() => {
      // TypeScript専用のESTree解析を優先使用
      if (this.shouldUseESTreeAnalysis(file)) {
        const { extractTypeScriptMethodDefinitionsWithESTree } = require('@/utils/typescript-estree-analyzer');
        return extractTypeScriptMethodDefinitionsWithESTree(file);
      }

      // フォールバック: JavaScript + TypeScript拡張解析
      const jsDefinitions = super.extractDefinitions(file);
      const tsDefinitions = this.extractTypeScriptDefinitionsOnly(file);
      
      return this.mergeMethodLists(jsDefinitions, tsDefinitions);
    }, []);
  }

  /**
   * ESTree解析を使用すべきかどうかの判定
   */
  private shouldUseESTreeAnalysis(file: ParsedFile): boolean {
    // 複雑なTypeScript構文が含まれている場合はESTreeを使用
    const complexPatterns = [
      /interface\s+\w+/,
      /type\s+\w+\s*=/,
      /enum\s+\w+/,
      /namespace\s+\w+/,
      /declare\s+/,
      /abstract\s+class/,
      /<[^>]*>/,  // ジェネリクス
      /React\.FC</,
      /React\.Component/
    ];

    return complexPatterns.some(pattern => pattern.test(file.content));
  }

  /**
   * TypeScript固有の機能を解析
   */
  private analyzeTypeScriptSpecificFeatures(file: ParsedFile, allDefinedMethods?: Set<string>): Method[] {
    const methods: Method[] = [];
    const lines = file.content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();

      if (!trimmedLine || this.isTypeScriptCommentLine(trimmedLine)) {
        continue;
      }

      // インターフェースメソッド
      const interfaceMethodMatch = trimmedLine.match(/^(\w+)(?:<[^>]*>)?\s*\(([^)]*)\)\s*:\s*[^;]+;/);
      if (interfaceMethodMatch) {
        const [, methodName, params] = interfaceMethodMatch;
        if (!this.isControlPattern(methodName)) {
          methods.push({
            name: methodName,
            type: 'interface_method',
            startLine: i + 1,
            endLine: i + 1,
            filePath: file.path,
            code: trimmedLine,
            calls: [],
            isPrivate: false,
            parameters: this.parseTypeScriptParameters(params).map(p => ({ name: p }))
          });
        }
      }

      // React.FCコンポーネント
      const reactComponentMatch = trimmedLine.match(/^(?:export\s+)?const\s+(\w+)\s*:\s*React\.FC<([^>]*)>\s*=\s*\(([^)]*)\)\s*=>/);
      if (reactComponentMatch) {
        const [, componentName, propsType, params] = reactComponentMatch;
        const methodEndLine = this.findTypeScriptArrowFunctionEnd(lines, i);
        const methodCode = lines.slice(i, methodEndLine + 1).join('\n');
        const methodCalls = this.extractTypeScriptMethodCallsWithFiltering(methodCode, i + 1, allDefinedMethods);

        methods.push({
          name: componentName,
          type: 'component',
          startLine: i + 1,
          endLine: methodEndLine + 1,
          filePath: file.path,
          code: methodCode,
          calls: methodCalls,
          isPrivate: false,
          parameters: this.parseTypeScriptParameters(params).map(p => ({ name: p }))
        });
        i = methodEndLine; // 重複を避ける
      }
    }

    return methods;
  }

  /**
   * TypeScript定義のみを抽出
   */
  private extractTypeScriptDefinitionsOnly(file: ParsedFile): Method[] {
    const methods: Method[] = [];
    const lines = file.content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();

      if (!trimmedLine || this.isTypeScriptCommentLine(trimmedLine)) {
        continue;
      }

      // インターフェースメソッド
      const interfaceMethodMatch = trimmedLine.match(/^(\w+)(?:<[^>]*>)?\s*\(([^)]*)\)\s*:\s*[^;]+;/);
      if (interfaceMethodMatch) {
        const [, methodName, params] = interfaceMethodMatch;
        if (!this.isControlPattern(methodName)) {
          methods.push({
            name: methodName,
            type: 'interface_method',
            startLine: i + 1,
            endLine: i + 1,
            filePath: file.path,
            code: trimmedLine,
            calls: [],
            isPrivate: false,
            parameters: this.parseTypeScriptParameters(params).map(p => ({ name: p }))
          });
        }
      }
    }

    return methods;
  }

  /**
   * TypeScript専用メソッド呼び出し検出
   */
  private extractTypeScriptMethodCallsWithFiltering(code: string, startLineNumber: number, definedMethods?: Set<string>): MethodCall[] {
    // 基本的にはJavaScriptの検出ロジックを使用
    return super['extractJavaScriptMethodCallsWithFiltering'](code, startLineNumber, definedMethods || new Set());
  }

  /**
   * TypeScript パラメータの解析
   */
  private parseTypeScriptParameters(paramString: string): string[] {
    const params = paramString.trim();
    if (!params) return [];
    
    // 型アノテーションを除去してパラメータ名のみを抽出
    return params
      .split(',')
      .map(param => {
        const trimmedParam = param.trim();
        // パラメータ名の部分のみを抽出（: の前まで）
        const colonIndex = trimmedParam.indexOf(':');
        return colonIndex > -1 ? trimmedParam.substring(0, colonIndex).trim() : trimmedParam;
      })
      .filter(param => param && param !== '');
  }

  /**
   * 制御パターンかどうかの判定
   */
  private isControlPattern(methodName: string): boolean {
    const { isJavaScriptControlPattern } = require('@/config/javascript-keywords');
    return isJavaScriptControlPattern(methodName);
  }

  /**
   * メソッドリストをマージ（重複除去）
   */
  private mergeMethodLists(list1: Method[], list2: Method[]): Method[] {
    const merged = [...list1];
    const existingKeys = new Set(list1.map(m => `${m.name}:${m.startLine}`));

    for (const method of list2) {
      const key = `${method.name}:${method.startLine}`;
      if (!existingKeys.has(key)) {
        merged.push(method);
      }
    }

    return merged;
  }

  private isTypeScriptCommentLine(line: string): boolean {
    const trimmed = line.trim();
    return trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*');
  }

  private findTypeScriptArrowFunctionEnd(lines: string[], startIndex: number): number {
    let braceCount = 0;
    let inString = false;
    let stringChar = '';
    
    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i];
      
      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        const prevChar = j > 0 ? line[j - 1] : '';
        
        if (!inString) {
          if (char === '"' || char === "'" || char === '`') {
            inString = true;
            stringChar = char;
          } else if (char === '{') {
            braceCount++;
          } else if (char === '}') {
            braceCount--;
            if (braceCount === 0 && i > startIndex) {
              return i;
            }
          }
        } else if (char === stringChar && prevChar !== '\\') {
          inString = false;
          stringChar = '';
        }
      }
    }
    
    return Math.min(startIndex + 20, lines.length - 1);
  }
}