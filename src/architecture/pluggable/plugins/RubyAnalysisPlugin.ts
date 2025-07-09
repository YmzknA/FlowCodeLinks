/**
 * Ruby言語解析プラグイン
 * 
 * 既存のRuby解析ロジックをプラガブルアーキテクチャに移植
 */

import { ParsedFile, Method, MethodCall } from '@/types/codebase';
import { MethodAnalysisPlugin, AnalysisResult, AnalysisError } from '../interfaces';
import { isRubyKeyword, isRubyBuiltin, isRubyCrudMethod, isRailsStandardMethod } from '@/config/ruby-keywords';
import { COMMON_PATTERNS, MethodPatternBuilder } from '@/utils/regex-patterns';
import { MethodExclusionService } from '@/services/MethodExclusionService';

export class RubyAnalysisPlugin implements MethodAnalysisPlugin {
  readonly name = 'ruby';
  readonly version = '1.0.0';
  readonly description = 'Ruby言語のメソッド解析プラグイン';

  supports(language: string): boolean {
    return language === 'ruby';
  }

  analyze(file: ParsedFile): AnalysisResult {
    const startTime = performance.now();
    const methods: Method[] = [];
    const errors: AnalysisError[] = [];

    try {
      const analyzedMethods = this.analyzeRubyMethods(file);
      methods.push(...analyzedMethods);
    } catch (error) {
      errors.push({
        message: `Ruby analysis failed: ${error instanceof Error ? error.message : String(error)}`,
        type: 'extraction',
        severity: 'error'
      });
    }

    const endTime = performance.now();

    return {
      methods,
      errors,
      metadata: {
        processingTime: endTime - startTime,
        linesProcessed: file.totalLines,
        engine: 'ruby-regex'
      }
    };
  }

  /**
   * Rubyファイルのメソッド解析メイン処理
   */
  private analyzeRubyMethods(file: ParsedFile): Method[] {
    const methods: Method[] = [];
    const lines = file.content.split('\n');
    let isPrivate = false;

    // このファイル内で定義されているメソッド名を収集
    const localDefinedMethods = this.extractLocalMethodDefinitions(lines);

    // メソッド定義とメソッド呼び出しを解析
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();

      // プライベートセクションの検出
      if (trimmedLine === 'private') {
        isPrivate = true;
        continue;
      }

      // publicやprotectedでプライベート解除
      if (trimmedLine === 'public' || trimmedLine === 'protected') {
        isPrivate = false;
        continue;
      }

      // メソッド定義の検出
      const methodMatch = trimmedLine.match(COMMON_PATTERNS.METHOD_DEFINITION);
      if (methodMatch) {
        const method = this.extractMethodDefinition(
          lines, i, methodMatch, isPrivate, file.path, localDefinedMethods
        );
        if (method) {
          methods.push(method);
        }
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
      const trimmedLine = line.trim();
      const methodMatch = trimmedLine.match(COMMON_PATTERNS.METHOD_DEFINITION);
      if (methodMatch) {
        const [, , methodName] = methodMatch;
        localMethods.add(methodName);
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
    methodMatch: RegExpMatchArray,
    isPrivate: boolean,
    filePath: string,
    localDefinedMethods: Set<string>
  ): Method | null {
    const [, selfPrefix, methodName, params] = methodMatch;
    const isClassMethod = !!selfPrefix;

    try {
      // メソッド除外判定（Rails標準アクション等）
      const isExcluded = MethodExclusionService.isExcludedMethod(methodName, filePath);

      // メソッドの終端を探す
      const methodEndLine = this.findRubyMethodEnd(lines, startIndex);
      const methodCode = lines.slice(startIndex, methodEndLine + 1).join('\n');
      const methodCalls = this.extractRubyMethodCalls(methodCode, startIndex + 1, localDefinedMethods);

      return {
        name: methodName,
        type: isClassMethod ? 'class_method' : 'method',
        startLine: startIndex + 1,
        endLine: methodEndLine + 1,
        filePath,
        code: methodCode,
        calls: methodCalls,
        isPrivate,
        parameters: this.parseRubyParameters(params || '()'),
        isExcluded
      };
    } catch (error) {
      console.warn(`Failed to extract Ruby method ${methodName}:`, error);
      return null;
    }
  }

  /**
   * Rubyメソッドの終端を検索（無限ループ対策付き）
   */
  private findRubyMethodEnd(lines: string[], startIndex: number): number {
    let depth = 1;
    let i = startIndex + 1;
    const MAX_ITERATIONS = 10000; // 最大反復回数
    let iterations = 0;

    while (i < lines.length && depth > 0 && iterations < MAX_ITERATIONS) {
      iterations++;
      const line = lines[i].trim();

      // コメント行をスキップ
      if (line.startsWith('#') || line === '') {
        i++;
        continue;
      }

      // Ruby特有のブロック開始キーワード
      if (/^(def|class|module|if|unless|case|begin|while|until|for)\b/.test(line)) {
        depth++;
      }

      // end キーワード
      if (line === 'end' || /^end\s/.test(line)) {
        depth--;
      }

      i++;
    }

    // 無限ループ検出時の処理
    if (iterations >= MAX_ITERATIONS) {
      console.warn(`[RubyAnalysisPlugin] Method end detection reached maximum iterations (${MAX_ITERATIONS}) at line ${startIndex}`);
      // 安全な推定終端位置を返す（開始位置から100行後、またはファイル終端）
      return Math.min(startIndex + 100, lines.length - 1);
    }

    return depth === 0 ? i - 1 : lines.length - 1;
  }

  /**
   * Rubyメソッド呼び出しの抽出
   */
  private extractRubyMethodCalls(methodCode: string, startLineNumber: number, definedMethods: Set<string>): MethodCall[] {
    const calls: MethodCall[] = [];
    const lines = methodCode.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = startLineNumber + i;

      // コメント行をスキップ
      if (line.trim().startsWith('#')) {
        continue;
      }

      // メソッド呼び出しパターンを検索
      const callMatches = this.findRubyMethodCalls(line);

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
   * 行からRubyメソッド呼び出しを検索
   */
  private findRubyMethodCalls(line: string): Array<{ name: string; column: number }> {
    const calls: Array<{ name: string; column: number }> = [];
    
    // Ruby用のメソッド呼び出しパターン
    const patterns = [
      /(\w+)(?:\s*\(|\s+[^=\s])/g,  // method_name( or method_name arg
      /\.(\w+)/g,                    // .method_name
      /(\w+)!/g,                     // method_name!
      /(\w+)\?/g                     // method_name?
    ];

    for (const pattern of patterns) {
      let match;
      pattern.lastIndex = 0; // Reset regex
      
      while ((match = pattern.exec(line)) !== null) {
        const methodName = match[1];
        const column = match.index;
        
        if (methodName && /^[a-zA-Z_]\w*$/.test(methodName)) {
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
    // 定義済みメソッドのみを含める（変数フィルタリング）
    return definedMethods.has(methodName) &&
           !isRubyKeyword(methodName) &&
           !isRubyBuiltin(methodName) &&
           !isRubyCrudMethod(methodName) &&
           !isRailsStandardMethod(methodName);
  }

  /**
   * Rubyメソッドパラメータの解析
   */
  private parseRubyParameters(paramString: string): Array<{ name: string; type?: string; defaultValue?: string }> {
    const params: Array<{ name: string; type?: string; defaultValue?: string }> = [];
    
    // パラメータ文字列をクリーンアップ
    const cleanParams = paramString.replace(/[()]/g, '').trim();
    
    if (!cleanParams) {
      return params;
    }

    // パラメータを分割
    const paramList = cleanParams.split(',').map(p => p.trim());

    for (const param of paramList) {
      if (!param) continue;

      // デフォルト値付きパラメータ
      if (param.includes('=')) {
        const [name, defaultValue] = param.split('=').map(p => p.trim());
        params.push({ name, defaultValue });
      }
      // キーワード引数
      else if (param.includes(':')) {
        const name = param.replace(':', '').trim();
        params.push({ name, type: 'keyword' });
      }
      // 通常のパラメータ
      else {
        params.push({ name: param });
      }
    }

    return params;
  }
}