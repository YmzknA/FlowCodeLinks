/**
 * 解析プラグインの共通基底クラス
 * 
 * DRY原則に基づき、共通のロジックを抽象化して重複を排除
 */

import { ParsedFile, Method, MethodCall } from '@/types/codebase';
import { MethodAnalysisPlugin, AnalysisResult, AnalysisError, AnalysisMetadata } from '../interfaces';

/**
 * 全解析プラグインの基底クラス
 * 
 * 共通機能:
 * - パラメータ解析
 * - メソッド呼び出し検出
 * - エラーハンドリング
 * - メタデータ生成
 */
export abstract class BaseAnalysisPlugin implements MethodAnalysisPlugin {
  abstract readonly name: string;
  abstract readonly version: string;
  abstract readonly description: string;

  abstract supports(language: string): boolean;
  abstract analyze(file: ParsedFile): AnalysisResult;

  /**
   * 共通のパラメータ解析ロジック
   * @param paramString パラメータ文字列
   * @returns パラメータ配列
   */
  protected parseParameters(paramString: string): Array<{ 
    name: string; 
    type?: string; 
    defaultValue?: string 
  }> {
    const params: Array<{ name: string; type?: string; defaultValue?: string }> = [];
    
    if (!paramString || !paramString.trim()) {
      return params;
    }

    // パラメータ文字列をクリーンアップ
    const cleanParams = paramString.replace(/[()]/g, '').trim();
    
    // カンマで分割（ただし括弧内のカンマは除く）
    const paramList = this.splitParameters(cleanParams);

    for (const param of paramList) {
      if (!param.trim()) continue;

      const cleanParam = param.trim();
      
      // デフォルト値付きパラメータ
      if (cleanParam.includes('=')) {
        const [name, defaultValue] = cleanParam.split('=', 2).map(p => p.trim());
        params.push({ name, defaultValue });
      }
      // 型注釈付きパラメータ（TypeScript）
      else if (cleanParam.includes(':') && !cleanParam.startsWith(':')) {
        const [name, type] = cleanParam.split(':', 2).map(p => p.trim());
        params.push({ name, type });
      }
      // キーワード引数（Ruby）
      else if (cleanParam.includes(':') && cleanParam.endsWith(':')) {
        const name = cleanParam.replace(':', '').trim();
        params.push({ name, type: 'keyword' });
      }
      // 通常のパラメータ
      else {
        params.push({ name: cleanParam });
      }
    }

    return params;
  }

  /**
   * 共通のメソッド呼び出し検出ロジック
   * @param code ソースコード
   * @param startLine 開始行番号
   * @returns メソッド呼び出し配列
   */
  protected extractMethodCalls(
    code: string, 
    startLine: number = 1
  ): MethodCall[] {
    const calls: MethodCall[] = [];
    const lines = code.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = startLine + i;

      // コメント行をスキップ
      if (this.isCommentLine(line)) {
        continue;
      }

      const lineCalls = this.findMethodCallsInLine(line, lineNumber);
      calls.push(...lineCalls);
    }

    return calls;
  }

  /**
   * 安全なエラーハンドリング付きの解析実行
   * @param file 解析対象ファイル
   * @param analyzer 実際の解析関数
   * @returns 解析結果
   */
  protected safeAnalyze(
    file: ParsedFile, 
    analyzer: () => Method[]
  ): AnalysisResult {
    const startTime = performance.now();
    const errors: AnalysisError[] = [];
    let methods: Method[] = [];

    try {
      methods = analyzer();
    } catch (error) {
      errors.push({
        message: `Analysis failed: ${error instanceof Error ? error.message : String(error)}`,
        type: 'runtime',
        severity: 'error'
      });
    }

    const endTime = performance.now();

    return {
      methods,
      errors,
      metadata: this.createMetadata(file, endTime - startTime)
    };
  }

  /**
   * メタデータの生成
   * @param file 解析対象ファイル
   * @param processingTime 処理時間
   * @returns メタデータ
   */
  protected createMetadata(
    file: ParsedFile, 
    processingTime: number
  ): AnalysisMetadata {
    return {
      processingTime,
      linesProcessed: file.totalLines,
      engine: this.name,
      additionalInfo: {
        fileSize: file.content.length,
        language: file.language
      }
    };
  }

  /**
   * パラメータ文字列を適切に分割
   * @param paramString パラメータ文字列
   * @returns 分割されたパラメータ配列
   */
  private splitParameters(paramString: string): string[] {
    const params: string[] = [];
    let current = '';
    let depth = 0;
    let inString = false;
    let stringChar = '';

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
        // 括弧の深度管理
        if (char === '(' || char === '[' || char === '{' || char === '<') {
          depth++;
        } else if (char === ')' || char === ']' || char === '}' || char === '>') {
          depth--;
        } else if (char === ',' && depth === 0) {
          // トップレベルのカンマで分割
          params.push(current.trim());
          current = '';
          continue;
        }
      }

      current += char;
    }

    if (current.trim()) {
      params.push(current.trim());
    }

    return params;
  }

  /**
   * コメント行かどうかを判定
   * @param line ソースコード行
   * @returns コメント行の場合true
   */
  private isCommentLine(line: string): boolean {
    const trimmed = line.trim();
    return trimmed.startsWith('#') ||     // Ruby, Python
           trimmed.startsWith('//') ||    // JavaScript, TypeScript
           trimmed.startsWith('/*') ||    // JavaScript, TypeScript
           trimmed.startsWith('*') ||     // JavaDoc style
           trimmed === '';                // 空行
  }

  /**
   * 1行からメソッド呼び出しを検出
   * @param line ソースコード行
   * @param lineNumber 行番号
   * @returns メソッド呼び出し配列
   */
  private findMethodCallsInLine(line: string, lineNumber: number): MethodCall[] {
    const calls: MethodCall[] = [];
    
    // 一般的なメソッド呼び出しパターン
    const patterns = [
      /(\w+)\s*\(/g,                    // method_name(
      /\.(\w+)\s*(?:\(|$)/g,           // .method_name( or .method_name at end
      /(\w+)\s+\w+/g,                  // method_name arg (Ruby style)
    ];

    for (const pattern of patterns) {
      let match;
      pattern.lastIndex = 0; // Reset regex state
      
      while ((match = pattern.exec(line)) !== null) {
        const methodName = match[1];
        const column = match.index;
        
        if (methodName && this.isValidMethodName(methodName)) {
          calls.push({
            methodName,
            line: lineNumber,
            column,
            filePath: '' // 呼び出し先のファイルパスは後で解決
          });
        }
      }
    }

    return calls;
  }

  /**
   * 有効なメソッド名かどうかを判定
   * @param name メソッド名
   * @returns 有効な場合true
   */
  private isValidMethodName(name: string): boolean {
    // 基本的な識別子パターン
    return /^[a-zA-Z_]\w*[!?]?$/.test(name) &&
           // 言語キーワードを除外
           !this.isLanguageKeyword(name);
  }

  /**
   * 言語キーワードかどうかを判定
   * @param name 識別子名
   * @returns キーワードの場合true
   */
  private isLanguageKeyword(name: string): boolean {
    const commonKeywords = [
      // JavaScript/TypeScript
      'function', 'const', 'let', 'var', 'if', 'else', 'for', 'while', 
      'return', 'class', 'interface', 'type', 'import', 'export',
      // Ruby
      'def', 'end', 'class', 'module', 'if', 'else', 'elsif', 'unless',
      'case', 'when', 'while', 'until', 'for', 'do', 'begin', 'rescue',
      // 共通
      'true', 'false', 'null', 'undefined', 'nil'
    ];

    return commonKeywords.includes(name);
  }
}