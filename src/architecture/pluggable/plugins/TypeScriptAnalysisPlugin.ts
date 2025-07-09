/**
 * TypeScript言語解析プラグイン
 * 
 * TypeScript/TSX固有の機能を持つ解析プラグイン
 * 既存のESTree解析ロジックを活用
 */

import { ParsedFile, Method, MethodCall } from '@/types/codebase';
import { MethodAnalysisPlugin, AnalysisResult, AnalysisError } from '../interfaces';
import { analyzeTypeScriptWithESTree } from '@/utils/typescript-estree-analyzer';
import { CommonParsingUtils } from '../utils/CommonParsingUtils';

export class TypeScriptAnalysisPlugin implements MethodAnalysisPlugin {
  readonly name = 'typescript';
  readonly version = '1.0.0';
  readonly description = 'TypeScript/TSX言語のメソッド解析プラグイン（ESTree使用）';

  supports(language: string): boolean {
    return language === 'typescript' || language === 'tsx';
  }

  analyze(file: ParsedFile): AnalysisResult {
    const startTime = performance.now();
    
    const { result, error } = CommonParsingUtils.safeAnalyze(
      () => {
        try {
          // 既存のESTree解析ロジックを使用
          return analyzeTypeScriptWithESTree(file);
        } catch (error) {
          // フォールバック: JavaScriptとして解析
          return this.analyzeAsJavaScript(file);
        }
      },
      'TypeScript analysis'
    );

    const endTime = performance.now();
    const metadata = CommonParsingUtils.createAnalysisMetadata(file, endTime - startTime, 'typescript-estree');

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
   * フォールバック: JavaScriptとして解析
   * TypeScript固有の構文でESTreeが失敗した場合の代替手段
   */
  private analyzeAsJavaScript(file: ParsedFile): Method[] {
    const methods: Method[] = [];
    const lines = file.content.split('\n');

    // このファイル内で定義されているメソッド名を収集
    const localDefinedMethods = this.extractLocalMethodDefinitions(lines);

    // メソッド定義を解析
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const cleanedLine = this.cleanTypeScriptLine(line);

      // コメント行をスキップ
      if (this.isCommentLine(cleanedLine)) {
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
   * TypeScript用ローカルメソッド定義の抽出
   */
  private extractLocalMethodDefinitions(lines: string[]): Set<string> {
    const localMethods = new Set<string>();

    for (const line of lines) {
      const cleanedLine = this.cleanTypeScriptLine(line);
      
      // TypeScript特有のパターンを含む関数定義パターン
      const patterns = [
        // Generic function declarations
        /^(?:export\s+)?(?:async\s+)?function\s+(\w+)(?:<[^>]*>)?\s*\(/,
        // Arrow functions with type annotations
        /^(?:export\s+)?(?:const|let|var)\s+(\w+)(?:\s*:\s*[^=]+)?\s*=\s*(?:useCallback\s*\()?\s*(?:<[^>]*>)?\s*\([^)]*\)\s*(?::\s*[^=>]+)?\s*=>/,
        // Class methods with access modifiers and generics
        /^(public|private|protected|static)\s+(?:static\s+)?(?:async\s+)?(\w+)(?:<[^>]*>)?\s*\(/,
        // Interface method signatures
        /(\w+)(?:<[^>]*>)?\s*\([^)]*\)\s*:\s*[^;{]+[;{]/,
        // Object methods with type annotations
        /(\w+)\s*:\s*(?:<[^>]*>)?\s*\([^)]*\)\s*(?::\s*[^=>]+)?\s*=>/
      ];

      for (const pattern of patterns) {
        const match = cleanedLine.match(pattern);
        if (match) {
          const methodName = match[1] === 'public' || match[1] === 'private' || match[1] === 'protected' || match[1] === 'static' 
            ? match[2] 
            : match[1];
          if (methodName && this.isValidTypeScriptMethodName(methodName)) {
            localMethods.add(methodName);
          }
        }
      }
    }

    return localMethods;
  }

  /**
   * TypeScript用メソッド定義の抽出
   */
  private extractMethodDefinition(
    lines: string[],
    startIndex: number,
    filePath: string,
    localDefinedMethods: Set<string>
  ): Method | null {
    const line = lines[startIndex];
    const cleanedLine = this.cleanTypeScriptLine(line);

    try {
      // Generic function declaration
      const funcMatch = cleanedLine.match(/^(?:export\s+)?(?:async\s+)?function\s+(\w+)(?:<[^>]*>)?\s*\(([^)]*)\)(?:\s*:\s*([^{]+))?/);
      if (funcMatch) {
        return this.createMethodFromMatch(
          lines, startIndex, funcMatch[1], funcMatch[2], 'function', filePath, localDefinedMethods, false, funcMatch[3]
        );
      }

      // Arrow function with types
      const arrowMatch = cleanedLine.match(/^(?:export\s+)?(?:const|let|var)\s+(\w+)(?:\s*:\s*[^=]+)?\s*=\s*(?:useCallback\s*\()?\s*(?:<[^>]*>)?\s*\(([^)]*)\)\s*(?::\s*([^=>]+))?\s*=>/);
      if (arrowMatch) {
        return this.createMethodFromMatch(
          lines, startIndex, arrowMatch[1], arrowMatch[2], 'function', filePath, localDefinedMethods, false, arrowMatch[3]
        );
      }

      // Class method with access modifiers
      const classMethodMatch = cleanedLine.match(/^(public|private|protected|static)\s+(?:static\s+)?(?:async\s+)?(\w+)(?:<[^>]*>)?\s*\(([^)]*)\)(?:\s*:\s*([^{]+))?/);
      if (classMethodMatch) {
        const access = classMethodMatch[1];
        const methodName = classMethodMatch[2];
        const params = classMethodMatch[3];
        const returnType = classMethodMatch[4];
        
        return this.createMethodFromMatch(
          lines, startIndex, methodName, params, 
          access === 'static' ? 'class_method' : 'method', 
          filePath, localDefinedMethods, access === 'private', returnType
        );
      }

      // Simple method in class/interface
      const simpleMethodMatch = cleanedLine.match(/(\w+)(?:<[^>]*>)?\s*\(([^)]*)\)\s*(?::\s*([^{]+))?\s*\{/);
      if (simpleMethodMatch && this.isValidTypeScriptMethodName(simpleMethodMatch[1])) {
        return this.createMethodFromMatch(
          lines, startIndex, simpleMethodMatch[1], simpleMethodMatch[2], 'method', filePath, localDefinedMethods, false, simpleMethodMatch[3]
        );
      }

      return null;
    } catch (error) {
      console.warn(`Failed to extract TypeScript method at line ${startIndex + 1}:`, error);
      return null;
    }
  }

  /**
   * マッチ結果からMethodオブジェクトを作成（TypeScript用）
   */
  private createMethodFromMatch(
    lines: string[],
    startIndex: number,
    methodName: string,
    params: string,
    type: string,
    filePath: string,
    localDefinedMethods: Set<string>,
    isPrivate = false,
    returnType?: string
  ): Method | null {
    if (!this.isValidTypeScriptMethodName(methodName)) {
      return null;
    }

    const methodEndLine = this.findTypeScriptFunctionEnd(lines, startIndex);
    const methodCode = lines.slice(startIndex, methodEndLine + 1).join('\n');
    const methodCalls = this.extractTypeScriptMethodCalls(methodCode, startIndex + 1, localDefinedMethods);

    return {
      name: methodName,
      type: type as Method['type'],
      startLine: startIndex + 1,
      endLine: methodEndLine + 1,
      filePath,
      code: methodCode,
      calls: methodCalls,
      isPrivate,
      parameters: this.parseTypeScriptParameters(params).map(p => ({ name: p })),
      returnType
    };
  }

  /**
   * TypeScript関数の終端を検索
   */
  private findTypeScriptFunctionEnd(lines: string[], startIndex: number): number {
    const startLine = lines[startIndex];
    
    // Arrow function with single expression
    if (startLine.includes('=>') && !startLine.includes('{')) {
      return startIndex;
    }

    let braceCount = 0;
    let foundFirstBrace = false;

    for (let i = startIndex; i < lines.length; i++) {
      const line = this.cleanTypeScriptLine(lines[i]);
      
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
   * TypeScriptメソッド呼び出しの抽出
   */
  private extractTypeScriptMethodCalls(methodCode: string, startLineNumber: number, definedMethods: Set<string>): MethodCall[] {
    const calls: MethodCall[] = [];
    const lines = methodCode.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const cleanedLine = this.cleanTypeScriptLine(line);
      const lineNumber = startLineNumber + i;

      // コメント行をスキップ
      if (this.isCommentLine(cleanedLine)) {
        continue;
      }

      // メソッド呼び出しパターンを検索
      const callMatches = this.findTypeScriptMethodCalls(cleanedLine);

      for (const callMatch of callMatches) {
        const methodName = callMatch.name;

        // フィルタリング条件
        if (this.shouldIncludeMethodCall(methodName, definedMethods)) {
          calls.push({
            methodName,
            line: lineNumber,
            column: callMatch.column,
            filePath: ''
          });
        }
      }
    }

    return calls;
  }

  /**
   * 行からTypeScriptメソッド呼び出しを検索
   */
  private findTypeScriptMethodCalls(line: string): Array<{ name: string; column: number }> {
    const calls: Array<{ name: string; column: number }> = [];
    
    // TypeScript用のメソッド呼び出しパターン（Generic対応）
    const patterns = [
      /(?:\w+|\)|])\s*\.\s*(\w+)(?:<[^>]*>)?\s*\(/g,     // .method<T>()
      /(?:\w+|\)|])\s*\?\.\s*(\w+)(?:<[^>]*>)?\s*\(/g,   // ?.method<T>()
      /(\w+)(?:<[^>]*>)?\s*\(/g                          // method<T>()
    ];

    for (const pattern of patterns) {
      let match;
      pattern.lastIndex = 0;
      
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
           this.isValidTypeScriptMethodName(methodName);
  }

  /**
   * TypeScript行のクリーニング（型注釈の考慮）
   */
  private cleanTypeScriptLine(line: string): string {
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
    return /^\s*(if|else|for|while|switch|try|catch|finally|interface|type|enum)\s*[\(\{<]/.test(line);
  }

  /**
   * TypeScriptメソッド名の有効性判定
   */
  private isValidTypeScriptMethodName(methodName: string): boolean {
    // TypeScript keywords and common patterns to exclude
    const excludeKeywords = [
      'interface', 'type', 'enum', 'namespace', 'module',
      'declare', 'abstract', 'implements', 'extends'
    ];
    
    return !excludeKeywords.includes(methodName) &&
           /^[a-zA-Z_$]\w*$/.test(methodName) &&
           methodName.length > 1;
  }

  /**
   * TypeScriptメソッドパラメータの解析（型注釈対応）
   */
  private parseTypeScriptParameters(paramString: string): Array<{ name: string; type?: string; defaultValue?: string }> {
    const params: Array<{ name: string; type?: string; defaultValue?: string }> = [];
    
    if (!paramString.trim()) {
      return params;
    }

    // 複雑な型注釈を考慮したパラメータ分割
    const paramList = this.splitTypeScriptParameters(paramString);

    for (const param of paramList) {
      if (!param.trim()) continue;

      // デフォルト値付きパラメータ
      if (param.includes('=')) {
        const [nameWithType, defaultValue] = param.split('=').map(p => p.trim());
        if (nameWithType.includes(':')) {
          const [name, type] = nameWithType.split(':').map(p => p.trim());
          params.push({ name, type, defaultValue });
        } else {
          params.push({ name: nameWithType, defaultValue });
        }
      }
      // 型注釈付きパラメータ
      else if (param.includes(':')) {
        const [name, type] = param.split(':').map(p => p.trim());
        params.push({ name, type });
      }
      // 通常のパラメータ
      else {
        params.push({ name: param.trim() });
      }
    }

    return params;
  }

  /**
   * TypeScriptパラメータの分割（ネストした型を考慮、無限ループ対策付き）
   */
  private splitTypeScriptParameters(paramString: string): string[] {
    const params: string[] = [];
    let current = '';
    let depth = 0;
    let inString = false;
    let stringChar = '';
    const MAX_ITERATIONS = 100000; // 最大反復回数（文字数ベース）

    // 入力長制限
    if (paramString.length > MAX_ITERATIONS) {
      console.warn(`[TypeScriptAnalysisPlugin] Parameter string too long (${paramString.length} chars), truncating to ${MAX_ITERATIONS}`);
      paramString = paramString.substring(0, MAX_ITERATIONS);
    }

    for (let i = 0; i < paramString.length; i++) {
      const char = paramString[i];
      const prevChar = i > 0 ? paramString[i - 1] : '';

      // 文字列内の判定
      if ((char === '"' || char === "'" || char === '`') && prevChar !== '\\') {
        if (!inString) {
          inString = true;
          stringChar = char;
        } else if (char === stringChar) {
          inString = false;
          stringChar = '';
        }
      }

      if (!inString) {
        if (char === '<' || char === '{' || char === '[' || char === '(') {
          depth++;
          // 異常な深いネスト検出
          if (depth > 100) {
            console.warn(`[TypeScriptAnalysisPlugin] Excessive nesting depth (${depth}) detected in parameters, aborting`);
            break;
          }
        } else if (char === '>' || char === '}' || char === ']' || char === ')') {
          depth--;
          // 負の深度検出（不正な構文）
          if (depth < 0) {
            console.warn(`[TypeScriptAnalysisPlugin] Negative depth detected in parameters, resetting to 0`);
            depth = 0;
          }
        } else if (char === ',' && depth === 0) {
          params.push(current.trim());
          current = '';
          continue;
        }
      }

      current += char;
      
      // 個別パラメータ長制限
      if (current.length > 10000) {
        console.warn(`[TypeScriptAnalysisPlugin] Single parameter too long (${current.length} chars), truncating`);
        current = current.substring(0, 10000) + '...';
        params.push(current.trim());
        current = '';
        // カンマを探して次のパラメータへ
        while (i < paramString.length && paramString[i] !== ',' && depth === 0) {
          i++;
        }
      }
    }

    if (current.trim()) {
      params.push(current.trim());
    }

    return params;
  }
}