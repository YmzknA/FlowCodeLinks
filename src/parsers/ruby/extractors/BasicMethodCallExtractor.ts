/**
 * Basic Ruby Method Call Extractor
 * 
 * 基本的なRubyメソッド呼び出しを抽出する
 * - スタンドアロン呼び出し: method_name
 * - ドット記法: object.method_name
 * - 文字列補間: "#{method_name}"
 */

import { BaseMethodCallExtractor } from './MethodExtractor';
import { MethodCall } from '@/types/codebase';
import { isRubyKeyword, isRubyBuiltin, isRubyCrudMethod, isRailsStandardMethod } from '@/config/ruby-keywords';
import { COMMON_PATTERNS } from '@/utils/regex-patterns';

export class BasicMethodCallExtractor extends BaseMethodCallExtractor {
  readonly name = 'BasicMethodCall';

  extract(code: string, startLineNumber: number, definedMethods?: Set<string>): MethodCall[] {
    const calls: MethodCall[] = [];
    const lines = code.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const absoluteLineNumber = startLineNumber + i;
      
      // コメント行をスキップ
      if (line.trim().startsWith('#')) continue;
      
      // メソッド定義行以外で通常のメソッド呼び出しを解析
      if (!line.trim().startsWith('def ')) {
        // 文字列補間内のメソッド呼び出し
        calls.push(...this.extractInterpolationMethodCalls(line, absoluteLineNumber));
        
        // ドット記法のメソッド呼び出し
        calls.push(...this.extractDotMethodCalls(line, absoluteLineNumber, definedMethods));
        
        // スタンドアロンのメソッド呼び出し
        calls.push(...this.extractStandaloneMethodCalls(line, absoluteLineNumber, definedMethods));
      }
    }
    
    return this.removeDuplicates(calls);
  }

  /**
   * 文字列補間内のメソッド呼び出しを抽出
   */
  private extractInterpolationMethodCalls(line: string, lineNumber: number): MethodCall[] {
    const calls: MethodCall[] = [];
    
    // 文字列補間内の単純なメソッド呼び出しパターンを使用
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
    
    // 文字列補間内のオブジェクトメソッド呼び出しパターンを使用
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
   * ドット記法のメソッド呼び出しを抽出
   */
  private extractDotMethodCalls(line: string, lineNumber: number, definedMethods?: Set<string>): MethodCall[] {
    const calls: MethodCall[] = [];
    
    const dotMethodMatches = Array.from(line.matchAll(COMMON_PATTERNS.DOT_METHOD));
    for (const match of dotMethodMatches) {
      const methodName = match[1];
      
      // ビルトインメソッドまたは定義済みメソッドのみ検出
      if (methodName && 
          !isRubyBuiltin(methodName) && 
          (isRubyCrudMethod(methodName) || this.isDefinedMethod(methodName, definedMethods))) {
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
   * スタンドアロンのメソッド呼び出しを抽出
   */
  private extractStandaloneMethodCalls(line: string, lineNumber: number, definedMethods?: Set<string>): MethodCall[] {
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
           this.isDefinedMethod(methodName, definedMethods))) {
        calls.push({
          methodName,
          line: lineNumber,
          context: line.trim()
        });
      }
    }
    
    return calls;
  }
}