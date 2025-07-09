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
import { CommonParsingUtils } from '../utils/CommonParsingUtils';

export class RubyAnalysisPlugin implements MethodAnalysisPlugin {
  readonly name = 'ruby';
  readonly version = '1.0.0';
  readonly description = 'Ruby言語のメソッド解析プラグイン';

  supports(language: string): boolean {
    return language === 'ruby';
  }

  analyze(file: ParsedFile): AnalysisResult {
    const startTime = performance.now();
    
    const { result, error } = CommonParsingUtils.safeAnalyze(
      () => this.analyzeRubyMethods(file),
      'Ruby analysis'
    );

    const endTime = performance.now();
    const metadata = CommonParsingUtils.createAnalysisMetadata(file, endTime - startTime, 'ruby-regex');

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
    return CommonParsingUtils.findMethodEnd(lines, startIndex, 'ruby');
  }

  /**
   * Rubyメソッド呼び出しの抽出
   */
  private extractRubyMethodCalls(methodCode: string, startLineNumber: number, definedMethods: Set<string>): MethodCall[] {
    const calls = CommonParsingUtils.extractMethodCallsFromCode(methodCode, startLineNumber, 'ruby');
    
    // 定義済みメソッドでフィルタリング
    return calls.filter(call => this.shouldIncludeMethodCall(call.methodName, definedMethods));
  }

  /**
   * 行からRubyメソッド呼び出しを検索
   */
  private findRubyMethodCalls(line: string): Array<{ name: string; column: number }> {
    const calls = CommonParsingUtils.findMethodCallsInLine(line, 0, 'ruby');
    return calls.map(call => ({ name: call.methodName, column: call.column || 0 }));
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
    return CommonParsingUtils.parseMethodParameters(paramString, 'ruby');
  }
}