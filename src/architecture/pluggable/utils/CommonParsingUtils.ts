/**
 * 共通解析ユーティリティクラス
 * 
 * DRY原則に従い、プラグイン間で重複していた解析ロジックを統一
 */

import { ParsedFile, Method, MethodCall, Parameter } from '@/types/codebase';
import { AnalysisResult, AnalysisError } from '../interfaces';
import { isRubyKeyword, isRubyBuiltin } from '@/config/ruby-keywords';
import { isJavaScriptKeyword, isJavaScriptBuiltin } from '@/config/javascript-keywords';

export type SupportedLanguage = 'ruby' | 'javascript' | 'typescript' | 'erb';

export class CommonParsingUtils {
  /**
   * 統一されたパラメータ解析
   * @param paramString パラメータ文字列
   * @param language 言語タイプ
   * @returns 解析されたパラメータ配列
   */
  static parseMethodParameters(paramString: string, language: SupportedLanguage): Parameter[] {
    if (!paramString || paramString.trim() === '') return [];
    
    const cleanedString = paramString.replace(/^\(|\)$/g, '').trim();
    if (!cleanedString) return [];
    
    const paramStrings = this.splitParameters(cleanedString);
    
    return paramStrings.map(param => {
      const trimmedParam = param.trim();
      
      switch (language) {
        case 'ruby':
          return this.parseRubyParameter(trimmedParam);
        case 'javascript':
          return this.parseJavaScriptParameter(trimmedParam);
        case 'typescript':
          return this.parseTypeScriptParameter(trimmedParam);
        default:
          return this.parseGenericParameter(trimmedParam);
      }
    });
  }
  
  /**
   * パラメータ文字列を分割
   * @param paramString パラメータ文字列
   * @returns 分割されたパラメータ配列
   */
  private static splitParameters(paramString: string): string[] {
    const params: string[] = [];
    let current = '';
    let depth = 0;
    let inString = false;
    let stringChar = '';
    
    for (let i = 0; i < paramString.length; i++) {
      const char = paramString[i];
      const prevChar = i > 0 ? paramString[i - 1] : '';
      
      if (!inString && (char === '"' || char === "'" || char === '`')) {
        inString = true;
        stringChar = char;
      } else if (inString && char === stringChar && prevChar !== '\\') {
        inString = false;
        stringChar = '';
      }
      
      if (!inString) {
        if (char === '(' || char === '{' || char === '[' || char === '<') {
          depth++;
        } else if (char === ')' || char === '}' || char === ']' || char === '>') {
          depth--;
        } else if (char === ',' && depth === 0) {
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
   * Ruby固有のパラメータ解析
   */
  private static parseRubyParameter(param: string): Parameter {
    // キーワード引数の検出 (param:)
    if (param.endsWith(':')) {
      return {
        name: param.slice(0, -1),
        type: 'keyword'
      };
    }
    
    // デフォルト値の検出 (param = value)
    const defaultMatch = param.match(/^([^=]+?)=(.+)$/);
    if (defaultMatch) {
      return {
        name: defaultMatch[1].trim(),
        defaultValue: defaultMatch[2].trim()
      };
    }
    
    // ブロックパラメータの検出 (&block)
    if (param.startsWith('&')) {
      return {
        name: param.slice(1),
        type: 'block'
      };
    }
    
    // Splat演算子の検出 (*args)
    if (param.startsWith('*')) {
      return {
        name: param.slice(1),
        type: 'splat'
      };
    }
    
    return { name: param };
  }
  
  /**
   * JavaScript固有のパラメータ解析
   */
  private static parseJavaScriptParameter(param: string): Parameter {
    // デフォルト値の検出 (param = value)
    const defaultMatch = param.match(/^([^=]+?)=(.+)$/);
    if (defaultMatch) {
      return {
        name: defaultMatch[1].trim(),
        defaultValue: defaultMatch[2].trim()
      };
    }
    
    // Rest演算子の検出 (...args)
    if (param.startsWith('...')) {
      return {
        name: param.slice(3),
        type: 'rest'
      };
    }
    
    return { name: param };
  }
  
  /**
   * TypeScript固有のパラメータ解析
   */
  private static parseTypeScriptParameter(param: string): Parameter {
    // 型注釈の検出 (param: type)
    const typeMatch = param.match(/^([^:=]+?):\s*([^=]+?)(?:\s*=\s*(.+))?$/);
    if (typeMatch) {
      return {
        name: typeMatch[1].trim(),
        type: typeMatch[2].trim(),
        defaultValue: typeMatch[3]?.trim()
      };
    }
    
    // デフォルト値のみの検出 (param = value)
    const defaultMatch = param.match(/^([^=]+?)=(.+)$/);
    if (defaultMatch) {
      return {
        name: defaultMatch[1].trim(),
        defaultValue: defaultMatch[2].trim()
      };
    }
    
    // Rest演算子の検出 (...args)
    if (param.startsWith('...')) {
      return {
        name: param.slice(3),
        type: 'rest'
      };
    }
    
    return { name: param };
  }
  
  /**
   * 汎用パラメータ解析
   */
  private static parseGenericParameter(param: string): Parameter {
    return { name: param };
  }
  
  /**
   * 統一されたメソッド呼び出し検出
   * @param code ソースコード
   * @param startLine 開始行番号
   * @param language 言語タイプ
   * @returns 検出されたメソッド呼び出し配列
   */
  static extractMethodCallsFromCode(
    code: string, 
    startLine: number, 
    language: SupportedLanguage
  ): MethodCall[] {
    const lines = code.split('\n');
    const calls: MethodCall[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const lineNumber = startLine + i;
      const line = lines[i];
      
      if (this.isCommentLine(line, language)) {
        continue;
      }
      
      // メソッド定義行は除外（Rubyの場合）
      if (language === 'ruby' && line.trim().match(/^def\s+/)) {
        continue;
      }
      
      const cleanedLine = this.cleanSourceLine(line, language);
      const lineCalls = this.findMethodCallsInLine(cleanedLine, lineNumber, language);
      calls.push(...lineCalls);
    }
    
    return calls;
  }
  
  /**
   * 行内でのメソッド呼び出し検出
   * @param line 行内容
   * @param lineNumber 行番号
   * @param language 言語タイプ
   * @returns 検出されたメソッド呼び出し配列
   */
  static findMethodCallsInLine(
    line: string, 
    lineNumber: number, 
    language: SupportedLanguage
  ): MethodCall[] {
    const calls: MethodCall[] = [];
    const patterns = this.getMethodCallPatterns(language);
    
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(line)) !== null) {
        // Ruby パターンの場合、複数のキャプチャグループがある可能性を考慮
        let methodName = '';
        if (language === 'ruby') {
          // match[1] は前方一致、match[2] は実際のメソッド名の場合
          methodName = match[2] || match[1];
        } else {
          methodName = match[1];
        }
        
        if (this.isValidMethodName(methodName, language)) {
          calls.push({
            methodName,
            line: lineNumber,
            column: match.index
          });
        }
      }
    }
    
    return calls;
  }
  
  /**
   * 言語固有のメソッド呼び出しパターンを取得
   */
  private static getMethodCallPatterns(language: SupportedLanguage): RegExp[] {
    switch (language) {
      case 'ruby':
        return [
          // スタンドアロンメソッド呼び出し: method_name, method_name(), method_name!, method_name?
          /(^|\s+)(\w+[?!]?)(?=\s|$|\(|\)|,|&&|\|\|)/g,
          // ドット記法: object.method_name
          /\.(\w+[?!]?)(?=\s*\(|$|\s|,|\)|\.)/g,
          // 文字列補間内の単純メソッド: #{method_name}
          /#{(\w+[?!]?)(?:\s*\()?}/g,
          // 文字列補間内のオブジェクトメソッド: #{object.method_name}
          /#{[\w]+\.(\w+[?!]?)(?:\s*\()?}/g
        ];
      case 'javascript':
      case 'typescript':
        return [
          /(?:^|[^.\w])(\w+)\s*\(/g,
          /\.(\w+)\s*\(/g,
          /(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?function/g,
          /(?:function|async\s+function)\s+(\w+)\s*\(/g
        ];
      case 'erb':
        return [
          /(\w+)\s*\(/g,
          /(\w+)\s+\w/g
        ];
      default:
        return [/(\w+)\s*\(/g];
    }
  }
  
  /**
   * コメント行かどうかを判定
   * @param line 行内容
   * @param language 言語タイプ
   * @returns コメント行の場合true
   */
  static isCommentLine(line: string, language: SupportedLanguage): boolean {
    const trimmed = line.trim();
    
    switch (language) {
      case 'ruby':
        return trimmed.startsWith('#');
      case 'javascript':
      case 'typescript':
        return trimmed.startsWith('//') || trimmed.startsWith('/*');
      case 'erb':
        return trimmed.startsWith('<%#');
      default:
        return false;
    }
  }
  
  /**
   * 言語キーワードかどうかを判定
   * @param name メソッド名
   * @param language 言語タイプ
   * @returns キーワードの場合true
   */
  static isLanguageKeyword(name: string, language: SupportedLanguage): boolean {
    switch (language) {
      case 'ruby':
        return isRubyKeyword(name) || isRubyBuiltin(name);
      case 'javascript':
      case 'typescript':
        try {
          return isJavaScriptKeyword(name) || isJavaScriptBuiltin(name);
        } catch (e) {
          // フォールバック: 基本的なJavaScriptキーワード
          const jsKeywords = ['function', 'var', 'let', 'const', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'default', 'break', 'continue', 'return', 'try', 'catch', 'finally', 'throw', 'async', 'await', 'class', 'extends', 'constructor', 'this', 'super', 'new', 'typeof', 'instanceof', 'in', 'of', 'true', 'false', 'null', 'undefined'];
          return jsKeywords.includes(name);
        }
      default:
        return false;
    }
  }
  
  /**
   * 有効なメソッド名かどうかを判定
   * @param name メソッド名
   * @param language 言語タイプ
   * @returns 有効な場合true
   */
  static isValidMethodName(name: string, language: SupportedLanguage): boolean {
    if (!name || name.length === 0) return false;
    if (this.isLanguageKeyword(name, language)) return false;
    
    // 数字のみの場合は無効
    if (/^\d+$/.test(name)) return false;
    
    // 有効な識別子パターンをチェック
    const validPattern = language === 'ruby' ? 
      /^[a-zA-Z_][a-zA-Z0-9_]*[!?]?$/ : 
      /^[a-zA-Z_$][a-zA-Z0-9_$]*$/;
    
    return validPattern.test(name);
  }
  
  /**
   * ソース行のクリーニング
   * @param line 行内容
   * @param language 言語タイプ
   * @returns クリーニングされた行
   */
  static cleanSourceLine(line: string, language: SupportedLanguage): string {
    let cleaned = line.trim();
    
    // 文字列リテラルの削除
    cleaned = this.removeStringLiterals(cleaned, language);
    
    // コメントの削除
    cleaned = this.removeComments(cleaned, language);
    
    return cleaned;
  }
  
  /**
   * 文字列リテラルの削除
   * @param line 行内容
   * @param language 言語タイプ
   * @returns 文字列リテラル除去後の行
   */
  private static removeStringLiterals(line: string, language: SupportedLanguage): string {
    const patterns = this.getStringLiteralPatterns(language);
    
    for (const pattern of patterns) {
      line = line.replace(pattern, '""');
    }
    
    return line;
  }
  
  /**
   * 言語固有の文字列リテラルパターンを取得
   */
  private static getStringLiteralPatterns(language: SupportedLanguage): RegExp[] {
    switch (language) {
      case 'ruby':
        return [
          // Ruby: 文字列補間を含まない文字列リテラルのみを除去
          /'(?:[^'\\]|\\.)*'/g,  // シングルクォート（補間なし）
          /`(?:[^`\\]|\\.)*`/g   // バッククォート（コマンド実行）
          // ダブルクォートは補間があるので除去しない
        ];
      case 'javascript':
      case 'typescript':
        return [
          /"(?:[^"\\]|\\.)*"/g,
          /'(?:[^'\\]|\\.)*'/g,
          /`(?:[^`\\]|\\.)*`/g
        ];
      case 'erb':
        return [
          /'(?:[^'\\]|\\.)*'/g  // ERBでもシングルクォートのみ除去
          // ダブルクォートは補間があるので除去しない
        ];
      default:
        return [/"(?:[^"\\]|\\.)*"/g];
    }
  }
  
  /**
   * コメントの削除
   * @param line 行内容
   * @param language 言語タイプ
   * @returns コメント除去後の行
   */
  private static removeComments(line: string, language: SupportedLanguage): string {
    switch (language) {
      case 'ruby':
        // Ruby: # で始まるコメントを削除するが、#{}文字列補間は除外
        return line.replace(/(?<!\\)(#(?![{])).*$/, '');
      case 'javascript':
      case 'typescript':
        return line.replace(/\/\/.*$/, '').replace(/\/\*.*?\*\//, '');
      case 'erb':
        return line.replace(/<%#.*?%>/, '');
      default:
        return line;
    }
  }
  
  /**
   * 安全な解析実行
   * @param analyzer 解析関数
   * @param context コンテキスト
   * @returns 解析結果
   */
  static safeAnalyze<T>(
    analyzer: () => T, 
    context: string
  ): { result: T | null; error: AnalysisError | null } {
    try {
      const result = analyzer();
      return { result, error: null };
    } catch (error) {
      return {
        result: null,
        error: this.formatAnalysisError(error, context)
      };
    }
  }
  
  /**
   * 解析エラーのフォーマット
   * @param error エラーオブジェクト
   * @param context コンテキスト
   * @returns フォーマットされたエラー
   */
  static formatAnalysisError(error: unknown, context: string): AnalysisError {
    return {
      message: `${context}: ${error instanceof Error ? error.message : String(error)}`,
      type: 'runtime',
      severity: 'error'
    };
  }
  
  /**
   * 解析メタデータの作成
   * @param file ファイル情報
   * @param processingTime 処理時間
   * @param engine エンジン名
   * @returns メタデータ
   */
  static createAnalysisMetadata(
    file: ParsedFile, 
    processingTime: number, 
    engine: string
  ) {
    return {
      processingTime,
      linesProcessed: file.totalLines,
      engine,
      fileSize: file.content.length,
      timestamp: new Date().toISOString()
    };
  }
  
  /**
   * メソッドの終了位置を検出
   * @param lines 行配列
   * @param startIndex 開始インデックス
   * @param language 言語タイプ
   * @returns 終了行インデックス
   */
  static findMethodEnd(
    lines: string[], 
    startIndex: number, 
    language: SupportedLanguage
  ): number {
    switch (language) {
      case 'ruby':
        return this.findRubyMethodEnd(lines, startIndex);
      case 'javascript':
      case 'typescript':
        return this.findBraceMethodEnd(lines, startIndex);
      default:
        return startIndex;
    }
  }
  
  /**
   * Ruby固有のメソッド終了位置検出
   */
  private static findRubyMethodEnd(lines: string[], startIndex: number): number {
    const startLine = lines[startIndex];
    const cleanStartLine = startLine.replace(/^\s*\d+:\s*/, '').trim();
    
    // デバッグログ追加
    const methodMatch = cleanStartLine.match(/def\s+(\w+)/);
    const methodName = methodMatch ? methodMatch[1] : 'unknown';
    if (methodName === 'show') {
      console.log(`🔍 [findRubyMethodEnd] Detecting end for method '${methodName}' starting at line ${startIndex + 1}`);
      console.log(`  - Total lines available: ${lines.length}`);
    }
    
    // 1行メソッド（def method_name; end）の検出
    if (cleanStartLine.includes(';') && cleanStartLine.includes('end')) {
      return startIndex; // 同じ行で終了
    }
    
    let depth = 1;
    const maxIterations = 1000;
    let iterations = 0;
    
    for (let i = startIndex + 1; i < lines.length && depth > 0 && iterations < maxIterations; i++) {
      iterations++;
      const line = lines[i];
      // 行番号プレフィックスを除去
      const cleanLine = line.replace(/^\s*\d+:\s*/, '');
      const trimmedLine = cleanLine.trim();
      
      // Ruby構文を正確に判定
      if (trimmedLine.startsWith('def ') || trimmedLine.match(/^\s*def\s+/)) {
        depth++;
      } else if (trimmedLine === 'end' || trimmedLine.startsWith('end ') || trimmedLine.endsWith(' end')) {
        depth--;
        if (methodName === 'show' && i <= startIndex + 15) {
          console.log(`  - Line ${i + 1}: '${trimmedLine}' -> depth decreased to ${depth}`);
        }
        
        // depth変化の追跡（ログなし、処理のみ）
        
      } else if (trimmedLine.match(/^(class|module|begin|if|unless|case|while|until|for)\b/) || 
                 trimmedLine.match(/=\s*(if|unless|case)\b/)) {
        // endが必要なブロック構造はすべてdepthを増やす（インライン構文も含む）
        depth++;
        if (methodName === 'show' && i <= startIndex + 15) {
          console.log(`  - Line ${i + 1}: '${trimmedLine}' -> depth increased to ${depth} (block structure)`);
        }
      }
      // elsif/elseは既存ブロックの一部なのでdepthは変更しない
      
      if (depth === 0) {
        if (methodName === 'show') {
          console.log(`  - Method end found at line ${i + 1} (depth reached 0)`);
        }
        return i;
      }
    }
    
    // メソッドが見つからない場合は、最大で100行まで検索（無限ループ防止）
    if (methodName === 'show') {
      console.log(`  - Method end NOT found, defaulting to line ${Math.min(startIndex + 100, lines.length - 1) + 1}`);
      console.log(`  - Final depth: ${depth}, iterations: ${iterations}`);
    }
    return Math.min(startIndex + 100, lines.length - 1);
  }
  
  /**
   * ブレースベースのメソッド終了位置検出
   */
  private static findBraceMethodEnd(lines: string[], startIndex: number): number {
    let depth = 0;
    const maxIterations = 1000;
    let iterations = 0;
    
    for (let i = startIndex; i < lines.length && iterations < maxIterations; i++) {
      iterations++;
      const line = lines[i];
      const braceCount = this.countBraces(line);
      
      depth += braceCount.open - braceCount.close;
      
      if (depth === 0 && i > startIndex) {
        return i;
      }
    }
    
    // メソッドが見つからない場合は、最大で100行まで検索（無限ループ防止）
    return Math.min(startIndex + 100, lines.length - 1);
  }
  
  /**
   * ブレースの数をカウント
   */
  private static countBraces(line: string): { open: number; close: number } {
    const openBraces = (line.match(/\{/g) || []).length;
    const closeBraces = (line.match(/\}/g) || []).length;
    
    return { open: openBraces, close: closeBraces };
  }
}