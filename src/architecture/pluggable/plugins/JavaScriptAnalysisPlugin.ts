/**
 * JavaScript言語解析プラグイン
 * 
 * 既存のJavaScript解析ロジックをプラガブルアーキテクチャに移植
 */

import { ParsedFile, Method, MethodCall } from '@/types/codebase';
import { MethodAnalysisPlugin, AnalysisResult, AnalysisError } from '../interfaces';
import { isJavaScriptKeyword, isJavaScriptBuiltin, isJavaScriptFrameworkMethod, isJavaScriptControlPattern, isValidJavaScriptMethod } from '@/config/javascript-keywords';
import { CommonParsingUtils } from '../utils/CommonParsingUtils';

export class JavaScriptAnalysisPlugin implements MethodAnalysisPlugin {
  readonly name = 'javascript';
  readonly version = '1.0.0';
  readonly description = 'JavaScript言語のメソッド解析プラグイン';

  supports(language: string): boolean {
    return language === 'javascript';
  }

  analyze(file: ParsedFile): AnalysisResult {
    const startTime = performance.now();
    
    const { result, error } = CommonParsingUtils.safeAnalyze(
      () => this.analyzeJavaScriptMethods(file),
      'JavaScript analysis'
    );

    const endTime = performance.now();
    const metadata = CommonParsingUtils.createAnalysisMetadata(file, endTime - startTime, 'javascript-regex');

    if (error) {
      return {
        methods: [],
        errors: [error],
        metadata
      };
    }

    return {
      methods: result || [],
      errors: [],
      metadata
    };
  }

  /**
   * JavaScriptファイルのメソッド解析メイン処理
   */
  private analyzeJavaScriptMethods(file: ParsedFile): Method[] {
    const methods: Method[] = [];
    const lines = file.content.split('\n');

    // このファイル内で定義されているメソッド名を収集
    const localDefinedMethods = this.extractLocalMethodDefinitions(lines);

    // メソッド定義を解析
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const cleanedLine = CommonParsingUtils.cleanSourceLine(line, 'javascript');

      // コメント行をスキップ
      if (CommonParsingUtils.isCommentLine(cleanedLine, 'javascript')) {
        continue;
      }

      // 制御構造行をスキップ
      if (this.isControlStructureLine(cleanedLine)) {
        continue;
      }

      // 各種メソッド定義パターンを検出
      const method = this.extractMethodDefinition(lines, i, file.path, localDefinedMethods);
      if (method) {
        methods.push(method);
      }
    }

    return methods;
  }

  /**
   * ローカルメソッド定義の抽出
   */
  private extractLocalMethodDefinitions(lines: string[]): Set<string> {
    const localMethods = new Set<string>();

    for (const line of lines) {
      const cleanedLine = CommonParsingUtils.cleanSourceLine(line, 'javascript');
      
      // 各種関数定義パターンを検索
      const patterns = [
        /^(?:export\s+)?(?:async\s+)?function\s+(\w+)(?:<[^>]*>)?\s*\(/,  // function declarations
        /^(?:export\s+)?(?:const|let|var)\s+(\w+)(?:\s*:\s*[^=]+)?\s*=\s*(?:useCallback\s*\()?\s*(?:\([^)]*\)\s*=>|function)/,  // arrow functions
        /^(public|private|protected|static)\s+(?:static\s+)?(?:async\s+)?(\w+)(?:<[^>]*>)?\s*\(/,  // class methods
        /(\w+)\s*:\s*(?:async\s+)?function/  // object methods
      ];

      for (const pattern of patterns) {
        const match = cleanedLine.match(pattern);
        if (match) {
          const methodName = match[1] === 'public' || match[1] === 'private' || match[1] === 'protected' || match[1] === 'static' 
            ? match[2] 
            : match[1];
          if (methodName && CommonParsingUtils.isValidMethodName(methodName, 'javascript')) {
            localMethods.add(methodName);
          }
        }
      }
    }

    return localMethods;
  }

  /**
   * メソッド定義の抽出
   */
  private extractMethodDefinition(
    lines: string[],
    startIndex: number,
    filePath: string,
    localDefinedMethods: Set<string>
  ): Method | null {
    const line = lines[startIndex];
    const cleanedLine = this.cleanJavaScriptLine(line);

    try {
      // Function declaration
      const funcMatch = cleanedLine.match(/^(?:export\s+)?(?:async\s+)?function\s+(\w+)(?:<[^>]*>)?\s*\(([^)]*)\)/);
      if (funcMatch) {
        return this.createMethodFromMatch(
          lines, startIndex, funcMatch[1], funcMatch[2], 'function', filePath, localDefinedMethods
        );
      }

      // Arrow function
      const arrowMatch = cleanedLine.match(/^(?:export\s+)?(?:const|let|var)\s+(\w+)(?:\s*:\s*[^=]+)?\s*=\s*(?:useCallback\s*\()?\s*\(([^)]*)\)\s*=>/);
      if (arrowMatch) {
        return this.createMethodFromMatch(
          lines, startIndex, arrowMatch[1], arrowMatch[2], 'function', filePath, localDefinedMethods
        );
      }

      // Class method
      const classMethodMatch = cleanedLine.match(/^(public|private|protected|static)\s+(?:static\s+)?(?:async\s+)?(\w+)(?:<[^>]*>)?\s*\(([^)]*)\)/);
      if (classMethodMatch) {
        const access = classMethodMatch[1];
        const methodName = classMethodMatch[2];
        const params = classMethodMatch[3];
        
        return this.createMethodFromMatch(
          lines, startIndex, methodName, params, 
          access === 'static' ? 'class_method' : 'method', 
          filePath, localDefinedMethods, access === 'private'
        );
      }

      // Object method
      const objMethodMatch = cleanedLine.match(/(\w+)\s*:\s*(?:async\s+)?function\s*\(([^)]*)\)/);
      if (objMethodMatch) {
        return this.createMethodFromMatch(
          lines, startIndex, objMethodMatch[1], objMethodMatch[2], 'method', filePath, localDefinedMethods
        );
      }

      // Simple method in class
      const simpleMethodMatch = cleanedLine.match(/(\w+)\s*\(([^)]*)\)\s*\{/);
      if (simpleMethodMatch && isValidJavaScriptMethod(simpleMethodMatch[1])) {
        return this.createMethodFromMatch(
          lines, startIndex, simpleMethodMatch[1], simpleMethodMatch[2], 'method', filePath, localDefinedMethods
        );
      }

      return null;
    } catch (error) {
      console.warn(`Failed to extract JavaScript method at line ${startIndex + 1}:`, error);
      return null;
    }
  }

  /**
   * マッチ結果からMethodオブジェクトを作成
   */
  private createMethodFromMatch(
    lines: string[],
    startIndex: number,
    methodName: string,
    params: string,
    type: string,
    filePath: string,
    localDefinedMethods: Set<string>,
    isPrivate = false
  ): Method | null {
    if (!isValidJavaScriptMethod(methodName)) {
      return null;
    }

    const methodEndLine = this.findJavaScriptFunctionEnd(lines, startIndex);
    const methodCode = lines.slice(startIndex, methodEndLine + 1).join('\n');
    const methodCalls = this.extractJavaScriptMethodCalls(methodCode, startIndex + 1, localDefinedMethods);

    return {
      name: methodName,
      type: type as Method['type'],
      startLine: startIndex + 1,
      endLine: methodEndLine + 1,
      filePath,
      code: methodCode,
      calls: methodCalls,
      isPrivate,
      parameters: this.parseJavaScriptParameters(params)
    };
  }

  /**
   * JavaScript関数の終端を検索
   */
  private findJavaScriptFunctionEnd(lines: string[], startIndex: number): number {
    const startLine = lines[startIndex];
    
    // Arrow function with single expression
    if (startLine.includes('=>') && !startLine.includes('{')) {
      return startIndex;
    }

    let braceCount = 0;
    let foundFirstBrace = false;

    for (let i = startIndex; i < lines.length; i++) {
      const line = this.cleanJavaScriptLine(lines[i]);
      
      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '{') {
          braceCount++;
          foundFirstBrace = true;
        } else if (char === '}') {
          braceCount--;
          if (foundFirstBrace && braceCount === 0) {
            return i;
          }
        }
      }
    }

    return Math.min(startIndex + 50, lines.length - 1); // Fallback
  }

  /**
   * JavaScriptメソッド呼び出しの抽出
   */
  private extractJavaScriptMethodCalls(methodCode: string, startLineNumber: number, definedMethods: Set<string>): MethodCall[] {
    const calls: MethodCall[] = [];
    const lines = methodCode.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const cleanedLine = this.cleanJavaScriptLine(line);
      const lineNumber = startLineNumber + i;

      // コメント行をスキップ
      if (this.isCommentLine(cleanedLine)) {
        continue;
      }

      // メソッド呼び出しパターンを検索
      const callMatches = this.findJavaScriptMethodCalls(cleanedLine);

      for (const callMatch of callMatches) {
        const methodName = callMatch.name;

        // フィルタリング条件
        if (this.shouldIncludeMethodCall(methodName, definedMethods)) {
          calls.push({
            methodName,
            line: lineNumber,
            column: callMatch.column,
            filePath: '' // 呼び出し先のファイルパスは後で解決
          });
        }
      }
    }

    return calls;
  }

  /**
   * 行からJavaScriptメソッド呼び出しを検索
   */
  private findJavaScriptMethodCalls(line: string): Array<{ name: string; column: number }> {
    const calls: Array<{ name: string; column: number }> = [];
    
    // JavaScript用のメソッド呼び出しパターン
    const patterns = [
      /(?:\w+|\)|])\s*\.\s*(\w+)\s*\(/g,     // .method()
      /(?:\w+|\)|])\s*\?\.\s*(\w+)\s*\(/g,   // ?.method()
      /(\w+)\s*\(/g                          // method()
    ];

    for (const pattern of patterns) {
      let match;
      pattern.lastIndex = 0; // Reset regex
      
      while ((match = pattern.exec(line)) !== null) {
        const methodName = match[1];
        const column = match.index;
        
        if (methodName && /^[a-zA-Z_$]\w*$/.test(methodName)) {
          calls.push({ name: methodName, column });
        }
      }
    }

    return calls;
  }

  /**
   * メソッド呼び出しを含めるかどうかの判定
   */
  private shouldIncludeMethodCall(methodName: string, definedMethods: Set<string>): boolean {
    return definedMethods.has(methodName) &&
           isValidJavaScriptMethod(methodName, definedMethods);
  }

  /**
   * JavaScript行のクリーニング
   */
  private cleanJavaScriptLine(line: string): string {
    // 文字列リテラルを除去
    let cleaned = line.replace(/"([^"\\]|\\.)*"/g, '""');
    cleaned = cleaned.replace(/'([^'\\]|\\.)*'/g, "''");
    cleaned = cleaned.replace(/`([^`\\]|\\.)*`/g, '``');
    
    // 行コメントを除去
    const commentIndex = cleaned.indexOf('//');
    if (commentIndex !== -1) {
      cleaned = cleaned.substring(0, commentIndex);
    }
    
    return cleaned.trim();
  }

  /**
   * コメント行の判定
   */
  private isCommentLine(line: string): boolean {
    const trimmed = line.trim();
    return trimmed.startsWith('//') || 
           trimmed.startsWith('/*') || 
           trimmed.startsWith('*/') ||
           trimmed.startsWith('*');
  }

  /**
   * 制御構造行の判定
   */
  private isControlStructureLine(line: string): boolean {
    return /^\s*(if|else|for|while|switch|try|catch|finally)\s*[\(\{]/.test(line);
  }

  /**
   * JavaScriptメソッドパラメータの解析
   */
  private parseJavaScriptParameters(paramString: string): Array<{ name: string; type?: string; defaultValue?: string }> {
    const params: Array<{ name: string; type?: string; defaultValue?: string }> = [];
    
    if (!paramString.trim()) {
      return params;
    }

    // パラメータを分割（簡易版）
    const paramList = paramString.split(',').map(p => p.trim());

    for (const param of paramList) {
      if (!param) continue;

      // デフォルト値付きパラメータ
      if (param.includes('=')) {
        const [nameWithType, defaultValue] = param.split('=').map(p => p.trim());
        const [name] = nameWithType.split(':').map(p => p.trim());
        params.push({ name, defaultValue });
      }
      // 型注釈付きパラメータ
      else if (param.includes(':')) {
        const [name, type] = param.split(':').map(p => p.trim());
        params.push({ name, type });
      }
      // 通常のパラメータ
      else {
        params.push({ name: param });
      }
    }

    return params;
  }
}