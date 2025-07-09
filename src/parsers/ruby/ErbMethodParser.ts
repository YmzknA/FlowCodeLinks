/**
 * ERB Method Parser
 * 
 * ERBファイル専用のメソッド解析パーサー
 * ERBタグ内のRubyメソッド呼び出しを検出
 */

import { BaseLanguageParser } from '../base/LanguageParser';
import { ParsedFile, Method, MethodCall } from '@/types/codebase';
import { COMMON_PATTERNS } from '@/utils/regex-patterns';
import { isRubyKeyword, isRubyBuiltin, isRubyCrudMethod, isRailsStandardMethod } from '@/config/ruby-keywords';

export class ErbMethodParser extends BaseLanguageParser {
  readonly language = 'erb';

  analyzeFile(file: ParsedFile, allDefinedMethods?: Set<string>): Method[] {
    if (!this.validateFile(file)) {
      return [];
    }

    return this.safeExecute(() => {
      const methods: Method[] = [];
      const lines = file.content.split('\n');
      const methodCallMap = new Map<string, { lines: number[], contexts: string[] }>();
      
      // ERBファイル全体からメソッド呼び出しを収集
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const methodCalls = this.extractErbMethodCalls(line, i + 1, allDefinedMethods);
        
        // メソッド呼び出しを集計
        for (const call of methodCalls) {
          if (!methodCallMap.has(call.methodName)) {
            methodCallMap.set(call.methodName, { lines: [], contexts: [] });
          }
          const callInfo = methodCallMap.get(call.methodName)!;
          callInfo.lines.push(call.line);
          callInfo.contexts.push(call.context);
        }
      }
      
      // ERBファイル全体から検出されたメソッド呼び出しをまとめて1つの特別なメソッドとして登録
      if (methodCallMap.size > 0) {
        const allMethodCalls: MethodCall[] = [];
        
        for (const [methodName, callInfo] of methodCallMap.entries()) {
          // 各メソッド呼び出しをMethodCallとして作成
          allMethodCalls.push({
            methodName: methodName,
            line: Math.min(...callInfo.lines),
            context: callInfo.contexts[0] // 最初のコンテキストを使用
          });
          
          // 個別のメソッド呼び出しエントリも作成（サイドバー表示用）
          methods.push({
            name: methodName,
            type: 'erb_call',
            startLine: Math.min(...callInfo.lines),
            endLine: Math.max(...callInfo.lines),
            filePath: file.path,
            code: callInfo.contexts.join('\n'),
            calls: [],
            isPrivate: false,
            parameters: []
          });
        }
        
        // ERBファイル全体の仮想メソッドを作成（依存関係作成用）
        const fileName = file.fileName
          .replace(/\.erb$/, '')
          .replace(/\.(html|xml|json|js|turbo_stream)$/, '');
        
        methods.push({
          name: `[ERB File: ${fileName}]`,
          type: 'erb_call',
          startLine: 1,
          endLine: lines.length,
          filePath: file.path,
          code: file.content,
          calls: allMethodCalls,
          isPrivate: false,
          parameters: []
        });
      }
      
      return methods;
    }, []);
  }

  extractDefinitions(file: ParsedFile): Method[] {
    // ERBファイルはメソッド定義を持たないので空配列を返す
    return [];
  }

  /**
   * ERBタグからRubyコードを抽出してメソッド呼び出しを検出
   */
  private extractErbMethodCalls(line: string, lineNumber: number, allDefinedMethods?: Set<string>): MethodCall[] {
    const calls: MethodCall[] = [];
    
    // ERBタグパターンを使用してRubyコードを抽出
    const erbTagMatches = Array.from(line.matchAll(COMMON_PATTERNS.ERB_TAG));
    
    for (const match of erbTagMatches) {
      const rubyCode = match[1];
      if (rubyCode.trim()) {
        // 抽出したRubyコードからメソッド呼び出しを検出（ERB専用）
        const rubyMethodCalls = this.extractErbRubyMethodCalls(rubyCode, lineNumber, allDefinedMethods);
        calls.push(...rubyMethodCalls);
      }
    }
    
    return calls;
  }

  /**
   * ERB用のRubyメソッド呼び出し抽出
   */
  private extractErbRubyMethodCalls(code: string, lineNumber: number, allDefinedMethods?: Set<string>): MethodCall[] {
    const calls: MethodCall[] = [];
    const lines = code.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const absoluteLineNumber = lineNumber + i;
      
      // コメント行をスキップ
      if (line.trim().startsWith('#')) continue;
      
      // 文字列補間内のメソッド呼び出し
      calls.push(...this.extractInterpolationMethodCalls(line, absoluteLineNumber));
      
      // ドット記法のメソッド呼び出し（定義済みメソッドでフィルタリング）
      calls.push(...this.extractErbDotMethodCalls(line, absoluteLineNumber, allDefinedMethods));
      
      // スタンドアロンのメソッド呼び出し（定義済みメソッドでフィルタリング）
      calls.push(...this.extractErbStandaloneMethodCalls(line, absoluteLineNumber, allDefinedMethods));
    }
    
    // 重複を除去
    return this.removeDuplicates(calls);
  }

  /**
   * 文字列補間内のメソッド呼び出しを抽出
   */
  private extractInterpolationMethodCalls(line: string, lineNumber: number): MethodCall[] {
    const calls: MethodCall[] = [];
    
    const interpolationMatches = Array.from(line.matchAll(COMMON_PATTERNS.INTERPOLATION_SIMPLE));
    for (const match of interpolationMatches) {
      const methodName = match[1];
      if (methodName && !isRubyKeyword(methodName)) {
        calls.push({
          methodName,
          line: lineNumber,
          context: line.trim()
        });
      }
    }
    
    const objectInterpolationMatches = Array.from(line.matchAll(COMMON_PATTERNS.INTERPOLATION_OBJECT));
    for (const match of objectInterpolationMatches) {
      const methodName = match[1];
      if (methodName && !isRubyKeyword(methodName)) {
        calls.push({
          methodName,
          line: lineNumber,
          context: line.trim()
        });
      }
    }
    
    return calls;
  }

  /**
   * ERB用のドット記法メソッド呼び出し抽出
   */
  private extractErbDotMethodCalls(line: string, lineNumber: number, allDefinedMethods?: Set<string>): MethodCall[] {
    const calls: MethodCall[] = [];
    
    const dotMethodMatches = Array.from(line.matchAll(COMMON_PATTERNS.DOT_METHOD));
    for (const match of dotMethodMatches) {
      const methodName = match[1];
      
      // ビルトインメソッドまたは定義済みメソッドのみ検出
      if (methodName && 
          !isRubyBuiltin(methodName) && 
          (isRubyCrudMethod(methodName) || (allDefinedMethods && allDefinedMethods.has(methodName)))) {
        calls.push({
          methodName,
          line: lineNumber,
          context: line.trim()
        });
      }
    }
    
    return calls;
  }

  /**
   * ERB用のスタンドアロンメソッド呼び出し抽出
   */
  private extractErbStandaloneMethodCalls(line: string, lineNumber: number, allDefinedMethods?: Set<string>): MethodCall[] {
    const calls: MethodCall[] = [];
    
    const standaloneMethodMatches = Array.from(line.matchAll(COMMON_PATTERNS.STANDALONE_METHOD));
    for (const match of standaloneMethodMatches) {
      const methodName = match[1];
      
      // 変数代入の確認
      const beforeMethod = line.substring(0, line.indexOf(methodName));
      const afterMethod = line.substring(line.indexOf(methodName) + methodName.length);
      const isAssignmentTarget = beforeMethod.trim().match(/\w+\s*$/) && afterMethod.trim().startsWith('=');
      
      if (methodName && 
          !isAssignmentTarget &&
          !isRubyKeyword(methodName) && 
          !isRubyBuiltin(methodName) &&
          (isRubyCrudMethod(methodName) || 
           isRailsStandardMethod(methodName) || 
           (allDefinedMethods && allDefinedMethods.has(methodName)))) {
        calls.push({
          methodName,
          line: lineNumber,
          context: line.trim()
        });
      }
    }
    
    return calls;
  }

  /**
   * 重複を除去
   */
  private removeDuplicates(calls: MethodCall[]): MethodCall[] {
    return calls.filter((call, index, self) =>
      index === self.findIndex((c) => 
        c.methodName === call.methodName && c.line === call.line
      )
    );
  }
}