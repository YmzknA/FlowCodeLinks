/**
 * ERB言語解析プラグイン
 * 
 * ERBテンプレート内のRubyコード解析に特化したプラグイン
 */

import { ParsedFile, Method, MethodCall } from '@/types/codebase';
import { MethodAnalysisPlugin, AnalysisResult, AnalysisError } from '../interfaces';
import { isRubyKeyword, isRubyBuiltin, isRubyCrudMethod, isRailsStandardMethod } from '@/config/ruby-keywords';
import { COMMON_PATTERNS } from '@/utils/regex-patterns';
import { CommonParsingUtils } from '../utils/CommonParsingUtils';

export class ErbAnalysisPlugin implements MethodAnalysisPlugin {
  readonly name = 'erb';
  readonly version = '1.0.0';
  readonly description = 'ERBテンプレートのメソッド解析プラグイン（Rails対応）';

  supports(language: string): boolean {
    return language === 'erb';
  }

  analyze(file: ParsedFile): AnalysisResult {
    const startTime = performance.now();
    
    const { result, error } = CommonParsingUtils.safeAnalyze(
      () => this.analyzeErbMethods(file),
      'ERB analysis'
    );

    const endTime = performance.now();
    const metadata = CommonParsingUtils.createAnalysisMetadata(file, endTime - startTime, 'erb-regex');

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
   * ERBファイルのメソッド解析メイン処理
   */
  private analyzeErbMethods(file: ParsedFile): Method[] {
    const methods: Method[] = [];
    const lines = file.content.split('\n');
    const methodCallMap = new Map<string, { lines: number[]; contexts: string[] }>();

    // 各行のERBタグからメソッド呼び出しを抽出
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;

      try {
        const calls = this.extractErbMethodCalls(line, lineNumber);

        for (const call of calls) {
          const methodName = call.methodName;
          
          if (!methodCallMap.has(methodName)) {
            methodCallMap.set(methodName, { lines: [], contexts: [] });
          }
          
          const existing = methodCallMap.get(methodName)!;
          existing.lines.push(call.line);
          existing.contexts.push(call.context || line.trim());
        }
      } catch (error) {
        console.warn(`ERB analysis warning at line ${lineNumber}:`, error);
      }
    }

    // 各メソッド呼び出しを個別のMethodエントリとして作成
    for (const [methodName, info] of methodCallMap.entries()) {
      methods.push({
        name: methodName,
        type: 'erb_call',
        startLine: Math.min(...info.lines),
        endLine: Math.max(...info.lines),
        filePath: file.path,
        code: info.contexts.join('\n'),
        calls: [],
        isPrivate: false,
        parameters: []
      });
    }

    // ファイル全体を表現する仮想メソッドを作成
    if (methodCallMap.size > 0) {
      const allCalls: MethodCall[] = [];
      
      for (const [methodName, info] of methodCallMap.entries()) {
        for (const line of info.lines) {
          allCalls.push({
            methodName,
            line,
            column: 0,
            filePath: ''
          });
        }
      }

      const fileName = file.path.split('/').pop() || 'erb_file';
      methods.push({
        name: `[ERB File: ${fileName}]`,
        type: 'erb_call',
        startLine: 1,
        endLine: lines.length,
        filePath: file.path,
        code: file.content,
        calls: allCalls,
        isPrivate: false,
        parameters: []
      });
    }

    return methods;
  }

  /**
   * 行からERBメソッド呼び出しを抽出
   */
  private extractErbMethodCalls(line: string, lineNumber: number): MethodCall[] {
    const calls: MethodCall[] = [];

    // ERBタグパターンを使用してRubyコードを抽出
    const erbTagMatches = Array.from(line.matchAll(COMMON_PATTERNS.ERB_TAG));

    for (const match of erbTagMatches) {
      const rubyCode = match[1];
      if (rubyCode.trim()) {
        const rubyMethodCalls = this.extractErbRubyMethodCalls(rubyCode, lineNumber);
        calls.push(...rubyMethodCalls);
      }
    }

    return calls;
  }

  /**
   * ERBタグ内のRubyコードからメソッド呼び出しを抽出
   */
  private extractErbRubyMethodCalls(code: string, lineNumber: number): MethodCall[] {
    const calls: MethodCall[] = [];
    const lines = code.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const absoluteLineNumber = lineNumber + i;

      // コメント行をスキップ
      if (line.trim().startsWith('#')) {
        continue;
      }

      // 文字列補間内のメソッド呼び出し
      calls.push(...this.extractInterpolationMethodCalls(line, absoluteLineNumber));

      // ドット記法のメソッド呼び出し
      calls.push(...this.extractErbDotMethodCalls(line, absoluteLineNumber));

      // スタンドアロンメソッド呼び出し
      calls.push(...this.extractErbStandaloneMethodCalls(line, absoluteLineNumber));
    }

    // 重複を除去
    const uniqueCalls = calls.filter((call, index, self) =>
      index === self.findIndex((c) => 
        c.methodName === call.methodName && c.line === call.line
      )
    );

    return uniqueCalls;
  }

  /**
   * 文字列補間内のメソッド呼び出しを抽出
   */
  private extractInterpolationMethodCalls(line: string, lineNumber: number): MethodCall[] {
    const calls: MethodCall[] = [];

    // 文字列補間パターン #{...} 
    const interpolationMatches = Array.from(line.matchAll(/#{([^}]+)}/g));

    for (const match of interpolationMatches) {
      const interpolationCode = match[1];
      
      // 補間内のメソッド呼び出しを検索
      const methodMatches = Array.from(interpolationCode.matchAll(/(\w+)(?:\(|\s|$)/g));
      
      for (const methodMatch of methodMatches) {
        const methodName = methodMatch[1];
        
        if (this.isValidErbMethodCall(methodName)) {
          calls.push({
            methodName,
            line: lineNumber,
            column: line.indexOf(match[0]),
            context: line.trim()
          });
        }
      }
    }

    return calls;
  }

  /**
   * ドット記法のメソッド呼び出しを抽出
   */
  private extractErbDotMethodCalls(line: string, lineNumber: number): MethodCall[] {
    const calls: MethodCall[] = [];

    const dotMethodMatches = Array.from(line.matchAll(COMMON_PATTERNS.DOT_METHOD));
    
    for (const match of dotMethodMatches) {
      const methodName = match[1];

      if (this.isValidErbMethodCall(methodName)) {
        calls.push({
          methodName,
          line: lineNumber,
          column: match.index || 0,
          context: line.trim()
        });
      }
    }

    return calls;
  }

  /**
   * スタンドアロンメソッド呼び出しを抽出
   */
  private extractErbStandaloneMethodCalls(line: string, lineNumber: number): MethodCall[] {
    const calls: MethodCall[] = [];

    const standaloneMethodMatches = Array.from(line.matchAll(COMMON_PATTERNS.STANDALONE_METHOD));
    
    for (const match of standaloneMethodMatches) {
      const methodName = match[1];

      // 変数代入のチェック
      const beforeMethod = line.substring(0, line.indexOf(methodName));
      const afterMethod = line.substring(line.indexOf(methodName) + methodName.length);
      const isAssignmentTarget = beforeMethod.trim().match(/\w+\s*$/) && afterMethod.trim().startsWith('=');

      if (!isAssignmentTarget && this.isValidErbMethodCall(methodName)) {
        calls.push({
          methodName,
          line: lineNumber,
          column: match.index || 0,
          context: line.trim()
        });
      }
    }

    return calls;
  }

  /**
   * ERBメソッド呼び出しの有効性判定
   */
  private isValidErbMethodCall(methodName: string): boolean {
    if (!methodName || typeof methodName !== 'string') {
      return false;
    }

    // Rubyキーワードを除外
    if (isRubyKeyword(methodName)) {
      return false;
    }

    // 一般的なRubyビルトインメソッドは除外（ただし、一部は許可）
    if (isRubyBuiltin(methodName) && !this.isAllowedBuiltinMethod(methodName)) {
      return false;
    }

    // Rails標準メソッドやCRUDメソッドは許可
    if (isRailsStandardMethod(methodName) || isRubyCrudMethod(methodName)) {
      return true;
    }

    // 基本的な識別子パターンのチェック
    if (!/^[a-zA-Z_]\w*[?!]?$/.test(methodName)) {
      return false;
    }

    // 短すぎるメソッド名を除外（ただし、一般的なものは許可）
    if (methodName.length === 1 && !['t', 'l'].includes(methodName)) {
      return false;
    }

    return true;
  }

  /**
   * 許可されたビルトインメソッドの判定
   */
  private isAllowedBuiltinMethod(methodName: string): boolean {
    // ERBテンプレートでよく使用されるビルトインメソッド
    const allowedBuiltins = [
      't', 'translate',           // I18n
      'l', 'localize',            // I18n
      'h', 'html_escape',         // Escaping
      'j', 'escape_javascript',   // Escaping
      'raw', 'html_safe',         // Raw HTML
      'pluralize', 'singularize', // Inflection
      'humanize', 'titleize',     // String formatting
      'time_ago_in_words',        // Time helpers
      'number_to_currency',       // Number helpers
      'truncate', 'simple_format' // Text helpers
    ];

    return allowedBuiltins.includes(methodName);
  }

  /**
   * ERBタグの数をカウント
   */
  private countErbTags(content: string): number {
    const matches = content.match(COMMON_PATTERNS.ERB_TAG);
    return matches ? matches.length : 0;
  }
}