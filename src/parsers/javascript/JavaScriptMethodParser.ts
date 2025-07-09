/**
 * JavaScript Method Parser
 * 
 * JavaScript言語専用のメソッド解析パーサー
 * 関数宣言、アロー関数、オブジェクトメソッドなどを検出
 */

import { BaseLanguageParser } from '../base/LanguageParser';
import { ParsedFile, Method, MethodCall } from '@/types/codebase';
import { isJavaScriptKeyword, isJavaScriptBuiltin, isJavaScriptFrameworkMethod, isJavaScriptControlPattern, isValidJavaScriptMethod } from '@/config/javascript-keywords';

export class JavaScriptMethodParser extends BaseLanguageParser {
  readonly language = 'javascript';

  analyzeFile(file: ParsedFile, allDefinedMethods?: Set<string>): Method[] {
    if (!this.validateFile(file)) {
      return [];
    }

    return this.safeExecute(() => {
      // 既存のJavaScript解析ロジックを移植
      // 将来的にはより詳細な抽出器パターンに分割予定
      return this.analyzeJavaScriptMethodsWithFiltering(file, allDefinedMethods);
    }, []);
  }

  extractDefinitions(file: ParsedFile): Method[] {
    if (!this.validateFile(file)) {
      return [];
    }

    return this.safeExecute(() => {
      // 定義のみの抽出版
      return this.extractJavaScriptMethodDefinitionsOnly(file);
    }, []);
  }

  /**
   * JavaScript解析（既存ロジックの移植版）
   * TODO: 将来的にはextractorsパターンに分割
   */
  private analyzeJavaScriptMethodsWithFiltering(file: ParsedFile, allDefinedMethods?: Set<string>): Method[] {
    const methods: Method[] = [];
    const lines = file.content.split('\n');

    // このファイル内で定義されているメソッド名を収集
    const localDefinedMethods = new Set<string>();
    const definitionsOnly = this.extractJavaScriptMethodDefinitionsOnly(file);
    definitionsOnly.forEach(method => localDefinedMethods.add(method.name));

    // 全体の定義済みメソッド一覧とローカル定義を結合
    const combinedDefinedMethods = new Set(localDefinedMethods);
    if (allDefinedMethods) {
      allDefinedMethods.forEach(method => combinedDefinedMethods.add(method));
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const cleanLine = this.cleanJavaScriptLine(line);
      const trimmedLine = cleanLine.trim();

      if (!trimmedLine || this.isCommentLine(trimmedLine)) {
        continue;
      }

      // 1. 通常の関数宣言
      const functionMatch = trimmedLine.match(/^(?:export\s+)?(?:async\s+)?function\s+(\w+)(?:<[^>]*>)?\s*\(([^)]*)\)/);
      if (functionMatch) {
        const [, functionName, params] = functionMatch;
        if (!isJavaScriptControlPattern(functionName)) {
          const methodEndLine = this.findJavaScriptFunctionEnd(lines, i);
          const methodCode = lines.slice(i, methodEndLine + 1).join('\n');
          const methodCalls = this.extractJavaScriptMethodCallsWithFiltering(methodCode, i + 1, combinedDefinedMethods);

          methods.push({
            name: functionName,
            type: 'function',
            startLine: i + 1,
            endLine: methodEndLine + 1,
            filePath: file.path,
            code: methodCode,
            calls: methodCalls,
            isPrivate: false,
            parameters: this.parseJavaScriptParameters(params).map(p => ({ name: p }))
          });
        }
        continue;
      }

      // 2. アロー関数
      const arrowMatch = trimmedLine.match(/^(?:export\s+)?(?:const|let|var)\s+(\w+)(?:\s*:\s*[^=]+)?\s*=\s*(?:useCallback\s*\()?\s*\(([^)]*)\)(?:\s*:\s*[^=>]+)?\s*=>/);
      if (arrowMatch) {
        const [, functionName, params] = arrowMatch;
        if (!isJavaScriptControlPattern(functionName)) {
          const methodEndLine = this.findJavaScriptArrowFunctionEnd(lines, i);
          const methodCode = lines.slice(i, methodEndLine + 1).join('\n');
          const methodCalls = this.extractJavaScriptMethodCallsWithFiltering(methodCode, i + 1, combinedDefinedMethods);

          methods.push({
            name: functionName,
            type: 'function',
            startLine: i + 1,
            endLine: methodEndLine + 1,
            filePath: file.path,
            code: methodCode,
            calls: methodCalls,
            isPrivate: false,
            parameters: this.parseJavaScriptParameters(params || '').map(p => ({ name: p }))
          });
        }
        continue;
      }

      // 3. クラスメソッド
      const classMethodMatch = trimmedLine.match(/^(?:public|private|protected)?\s*(?:static\s+)?(?:async\s+)?(\w+)(?:<[^>]*>)?\s*\(([^)]*)\)/);
      if (classMethodMatch && !trimmedLine.includes('=') && !trimmedLine.includes('=>')) {
        const [, methodName, params] = classMethodMatch;
        if (!isJavaScriptControlPattern(methodName) && methodName !== 'constructor') {
          const methodEndLine = this.findJavaScriptFunctionEnd(lines, i);
          const methodCode = lines.slice(i, methodEndLine + 1).join('\n');
          const methodCalls = this.extractJavaScriptMethodCallsWithFiltering(methodCode, i + 1, combinedDefinedMethods);

          methods.push({
            name: methodName,
            type: 'method',
            startLine: i + 1,
            endLine: methodEndLine + 1,
            filePath: file.path,
            code: methodCode,
            calls: methodCalls,
            isPrivate: trimmedLine.includes('private'),
            parameters: this.parseJavaScriptParameters(params).map(p => ({ name: p }))
          });
        }
        continue;
      }

      // 4. オブジェクトメソッド
      const objectMethodMatch = trimmedLine.match(/^(\w+)\s*[:]\s*function\s*\(([^)]*)\)/);
      if (objectMethodMatch && !this.isControlStructureLine(trimmedLine)) {
        const [, methodName, params] = objectMethodMatch;
        if (!isJavaScriptControlPattern(methodName) && !isJavaScriptKeyword(methodName)) {
          const methodEndLine = this.findJavaScriptFunctionEnd(lines, i);
          const methodCode = lines.slice(i, methodEndLine + 1).join('\n');
          const methodCalls = this.extractJavaScriptMethodCallsWithFiltering(methodCode, i + 1, combinedDefinedMethods);

          methods.push({
            name: methodName,
            type: 'method',
            startLine: i + 1,
            endLine: methodEndLine + 1,
            filePath: file.path,
            code: methodCode,
            calls: methodCalls,
            isPrivate: false,
            parameters: this.parseJavaScriptParameters(params || '').map(p => ({ name: p }))
          });
        }
      }
    }

    return methods;
  }

  /**
   * JavaScript/TypeScriptメソッド定義のみを抽出
   */
  private extractJavaScriptMethodDefinitionsOnly(file: ParsedFile): Method[] {
    const methods: Method[] = [];
    const lines = file.content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const cleanLine = this.cleanJavaScriptLine(line);
      const trimmedLine = cleanLine.trim();

      if (!trimmedLine || this.isCommentLine(trimmedLine)) {
        continue;
      }

      // 1. 通常の関数宣言
      const functionMatch = trimmedLine.match(/^(?:export\s+)?(?:async\s+)?function\s+(\w+)(?:<[^>]*>)?\s*\(/);
      if (functionMatch) {
        const [, functionName] = functionMatch;
        if (!isJavaScriptControlPattern(functionName)) {
          methods.push({
            name: functionName,
            type: 'function',
            startLine: i + 1,
            endLine: i + 1,
            filePath: file.path,
            code: trimmedLine,
            calls: [],
            isPrivate: false,
            parameters: []
          });
        }
        continue;
      }

      // 2. アロー関数・変数関数
      const arrowMatch = trimmedLine.match(/^(?:export\s+)?(?:const|let|var)\s+(\w+)(?:\s*:\s*[^=]+)?\s*=\s*(?:useCallback\s*\()?\s*(?:\([^)]*\)\s*=>|function)/);
      if (arrowMatch) {
        const [, functionName] = arrowMatch;
        if (!isJavaScriptControlPattern(functionName)) {
          methods.push({
            name: functionName,
            type: 'function',
            startLine: i + 1,
            endLine: i + 1,
            filePath: file.path,
            code: trimmedLine,
            calls: [],
            isPrivate: false,
            parameters: []
          });
        }
        continue;
      }

      // 3. クラスメソッド（アクセス修飾子が必須）
      const classMethodMatch = trimmedLine.match(/^(public|private|protected|static)\s+(?:static\s+)?(?:async\s+)?(\w+)(?:<[^>]*>)?\s*\(/);
      if (classMethodMatch) {
        const [, , methodName] = classMethodMatch;
        if (!isJavaScriptControlPattern(methodName) && methodName !== 'constructor') {
          methods.push({
            name: methodName,
            type: 'method',
            startLine: i + 1,
            endLine: i + 1,
            filePath: file.path,
            code: trimmedLine,
            calls: [],
            isPrivate: trimmedLine.includes('private'),
            parameters: []
          });
        }
        continue;
      }
    }

    return methods;
  }

  // ヘルパーメソッド群（既存ロジックから移植）
  private cleanJavaScriptLine(line: string): string {
    return line
      .replace(/"[^"]*"/g, '""')
      .replace(/'[^']*'/g, "''")
      .replace(/`[^`]*`/g, '``');
  }

  private isCommentLine(line: string): boolean {
    const trimmed = line.trim();
    return trimmed.startsWith('//') || 
           trimmed.startsWith('/*') || 
           trimmed.startsWith('*') ||
           trimmed.endsWith('*/');
  }

  private isControlStructureLine(line: string): boolean {
    const trimmed = line.trim();
    return /^(if|else|while|for|switch|case|try|catch|finally|with)\s*\(/.test(trimmed);
  }

  private findJavaScriptFunctionEnd(lines: string[], startIndex: number): number {
    let depth = 0;
    let foundStart = false;
    
    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i];
      for (const char of line) {
        if (char === '{') {
          depth++;
          foundStart = true;
        } else if (char === '}') {
          depth--;
          if (foundStart && depth === 0) {
            return i;
          }
        }
      }
    }
    return lines.length - 1;
  }

  private findJavaScriptArrowFunctionEnd(lines: string[], startIndex: number): number {
    const line = lines[startIndex];
    if (line.includes(';')) {
      return startIndex;
    }
    return this.findJavaScriptFunctionEnd(lines, startIndex);
  }

  private parseJavaScriptParameters(paramString: string): string[] {
    const params = paramString.trim();
    return params ? params.split(',').map(p => p.trim()) : [];
  }

  private extractJavaScriptMethodCallsWithFiltering(code: string, startLineNumber: number, definedMethods: Set<string>): MethodCall[] {
    const calls: MethodCall[] = [];
    const lines = code.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const cleanLine = this.cleanJavaScriptLine(line);
      const absoluteLineNumber = startLineNumber + i;
      
      if (!cleanLine.trim() || this.isCommentLine(cleanLine.trim())) {
        continue;
      }
      
      if (cleanLine.trim().startsWith('function ') || 
          cleanLine.includes('function(') ||
          /^\s*\w+\s*[:=]\s*function/.test(cleanLine)) {
        continue;
      }
      
      // ドット記法のメソッド呼び出し
      const dotMethodMatches = Array.from(cleanLine.matchAll(/(?:\w+|\)|])\s*\.\s*(\w+)\s*\(/g));
      for (const match of dotMethodMatches) {
        const methodName = match[1];
        if (methodName && isValidJavaScriptMethod(methodName, definedMethods)) {
          calls.push({
            methodName,
            line: absoluteLineNumber,
            context: line.trim()
          });
        }
      }
      
      // オプショナルチェイニング
      const optionalMatches = Array.from(cleanLine.matchAll(/(?:\w+|\)|])\s*\?\.\s*(\w+)\s*\(/g));
      for (const match of optionalMatches) {
        const methodName = match[1];
        if (methodName && isValidJavaScriptMethod(methodName, definedMethods)) {
          calls.push({
            methodName,
            line: absoluteLineNumber,
            context: line.trim()
          });
        }
      }
      
      // 標準的なメソッド呼び出し
      const methodCallMatches = Array.from(cleanLine.matchAll(/(\w+)\s*\(/g));
      for (const match of methodCallMatches) {
        const methodName = match[1];
        if (methodName && isValidJavaScriptMethod(methodName, definedMethods)) {
          calls.push({
            methodName,
            line: absoluteLineNumber,
            context: line.trim()
          });
        }
      }
    }
    
    // 重複を除去
    return calls.filter((call, index, self) =>
      index === self.findIndex((c) => 
        c.methodName === call.methodName && c.line === call.line
      )
    );
  }
}