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
import { RepomixContentService } from '@/services/RepomixContentService';
import { RailsImplicitMethodResolver } from '@/services/RailsImplicitMethodResolver';
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

    // 利用可能な全メソッド名を収集（ローカル + インクルードされたモジュール）
    const allDefinedMethods = this.extractAllAvailableMethods(file);

    // メソッド定義とメソッド呼び出しを解析
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // 行番号プレフィックスを除去
      const cleanLine = line.replace(/^\s*\d+:\s*/, '');
      const trimmedLine = cleanLine.trim();

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
          lines, i, methodMatch, isPrivate, file.path, allDefinedMethods
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
      // 行番号プレフィックスを除去
      const cleanLine = line.replace(/^\s*\d+:\s*/, '');
      const trimmedLine = cleanLine.trim();
      const methodMatch = trimmedLine.match(COMMON_PATTERNS.METHOD_DEFINITION);
      if (methodMatch) {
        const [, , methodName] = methodMatch;
        localMethods.add(methodName);
        
      }
    }


    return localMethods;
  }

  /**
   * 全利用可能メソッドの抽出（ローカル + インクルードされたモジュール + グローバル定義）
   */
  private extractAllAvailableMethods(file: ParsedFile): Set<string> {
    const lines = file.content.split('\n');
    
    // 1. ローカルメソッドを抽出
    const localMethods = this.extractLocalMethodDefinitions(lines);
    
    // 2. Rails包括的メソッド解決を実行（Phase 1-4）
    const railsResolver = RailsImplicitMethodResolver.getInstance();
    const resolutionResult = railsResolver.resolveAllAvailableMethods(
      file.content,
      file.path,
      localMethods
    );
    
    // 3. デバッグログ出力
    railsResolver.logResolutionDetails(resolutionResult, file.path);
    
    // 4. 🔄 FIX: グローバル定義メソッドを追加
    const repomixService = RepomixContentService.getInstance();
    if (repomixService.hasAllDefinedMethods()) {
      const globalDefinedMethods = repomixService.getAllDefinedMethods();
      const combinedMethods = new Set(resolutionResult.resolvedMethods);
      globalDefinedMethods.forEach(method => combinedMethods.add(method));
      
      
      return combinedMethods;
    }
    
    return resolutionResult.resolvedMethods;
  }

  /**
   * インクルードされたモジュールからメソッドを抽出
   */
  private extractMethodsFromIncludedModules(file: ParsedFile): Set<string> {
    const includedMethods = new Set<string>();
    const lines = file.content.split('\n');
    const includedModules: string[] = [];
    
    // include文を検出
    for (const line of lines) {
      // 行番号プレフィックスを除去
      const cleanLine = line.replace(/^\s*\d+:\s*/, '');
      const trimmedLine = cleanLine.trim();
      const includeMatch = trimmedLine.match(/^\s*include\s+([A-Z][A-Za-z0-9_]*)\s*$/);
      if (includeMatch) {
        const moduleName = includeMatch[1];
        includedModules.push(moduleName);
      }
    }
    
    // 各モジュールのメソッドを抽出
    for (const moduleName of includedModules) {
      const moduleMethodsFound = this.findMethodsInModule(file.content, moduleName);
      moduleMethodsFound.forEach(method => {
        includedMethods.add(method);
      });
    }
    
    return includedMethods;
  }

  /**
   * 指定されたモジュール内のメソッドを検索（repomix全体を検索）
   */
  private findMethodsInModule(fileContent: string, moduleName: string): Set<string> {
    const repomixService = RepomixContentService.getInstance();
    
    // 1. 全体コンテンツが利用可能な場合はそれを使用
    if (repomixService.hasFullContent()) {
      return repomixService.findMethodsInModule(moduleName);
    }
    
    // 2. フォールバック: 現在のファイルコンテンツのみで検索
    const methods = new Set<string>();
    
    // repomix形式でモジュール定義を検索（行番号プレフィックス含む）
    const modulePattern = new RegExp(`^\\s*\\d+:\\s*module\\s+${moduleName}\\b`, 'm');
    const moduleMatch = fileContent.match(modulePattern);
    
    if (!moduleMatch) {
      return methods;
    }
    
    // モジュールの開始位置を特定
    const moduleStartIndex = fileContent.indexOf(moduleMatch[0]);
    const lines = fileContent.split('\n');
    let moduleStartLine = -1;
    let currentIndex = 0;
    
    // 開始行を特定
    for (let i = 0; i < lines.length; i++) {
      const lineLength = lines[i].length + 1; // +1 for newline
      if (currentIndex >= moduleStartIndex) {
        moduleStartLine = i;
        break;
      }
      currentIndex += lineLength;
    }
    
    if (moduleStartLine === -1) {
      return methods;
    }
    
    
    // モジュールの終了を検索（repomix形式のend行も考慮）
    let moduleEndLine = lines.length - 1;
    let depth = 0;
    
    for (let i = moduleStartLine; i < lines.length; i++) {
      const line = lines[i];
      // 行番号プレフィックスを除去
      const cleanLine = line.replace(/^\s*\d+:\s*/, '');
      const trimmedLine = cleanLine.trim();
      
      // モジュール/クラス/def などの開始
      if (trimmedLine.match(/^(module|class|def|if|unless|case|while|until|for|begin)\b/)) {
        depth++;
      } else if (trimmedLine === 'end') {
        depth--;
        if (depth === 0) {
          moduleEndLine = i;
          break;
        }
      }
      
      // repomix の次のファイルセクションに達した場合も終了
      if (i > moduleStartLine && line.match(/^## File:/)) {
        moduleEndLine = i - 1;
        break;
      }
    }
    
    // モジュール内のメソッドを抽出
    for (let i = moduleStartLine + 1; i < moduleEndLine; i++) {
      const line = lines[i];
      // 行番号プレフィックスを除去
      const cleanLine = line.replace(/^\s*\d+:\s*/, '');
      const trimmedLine = cleanLine.trim();
      
      const methodMatch = trimmedLine.match(COMMON_PATTERNS.METHOD_DEFINITION);
      if (methodMatch) {
        const [, , methodName] = methodMatch;
        methods.add(methodName);
      }
    }
    
    return methods;
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
    allAvailableMethods: Set<string>,
  ): Method | null {
    const [, selfPrefix, methodName, params] = methodMatch;
    const isClassMethod = !!selfPrefix;

    try {
      // 🎯 新API: メソッド除外判定（粒度細分化）
      const isExcluded = !MethodExclusionService.isDefinitionClickable(methodName, filePath);

      // メソッドの終端を探す
      const methodEndLine = this.findRubyMethodEnd(lines, startIndex);
      const methodCode = lines.slice(startIndex, methodEndLine + 1).join('\n');
      
      // 🔄 FIX: combinedDefinedMethods ロジックを復元（7b586d88 based）
      // ローカル定義メソッドを抽出
      const localDefinedMethods = this.extractLocalMethodDefinitions(lines);
      
      // combinedDefinedMethods = localDefinedMethods + allAvailableMethods （7b586d88ロジック）
      const combinedDefinedMethods = new Set(localDefinedMethods);
      allAvailableMethods.forEach(method => combinedDefinedMethods.add(method));
      
      
      const methodCalls = this.extractRubyMethodCalls(methodCode, startIndex + 1, combinedDefinedMethods);

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
    const filteredCalls = calls.filter(call => this.shouldIncludeMethodCall(call.methodName, definedMethods));
    
    
    return filteredCalls;
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
    
    // Rubyキーワードは除外
    if (isRubyKeyword(methodName)) return false;
    
    // 定義済みメソッド、CRUDメソッド、Rails標準メソッドのいずれかに該当する場合は含める
    // ただし、Rubyビルトインメソッドは除外
    const result = (definedMethods.has(methodName) || 
            isRubyCrudMethod(methodName) || 
            isRailsStandardMethod(methodName)) &&
           !isRubyBuiltin(methodName);
    
    
    return result;
  }

  /**
   * Rubyメソッドパラメータの解析
   */
  private parseRubyParameters(paramString: string): Array<{ name: string; type?: string; defaultValue?: string }> {
    return CommonParsingUtils.parseMethodParameters(paramString, 'ruby');
  }
}