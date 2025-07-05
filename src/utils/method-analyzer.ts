import { ParsedFile, Method, MethodCall } from '@/types/codebase';
import { isRubyKeyword, isRubyBuiltin, isRubyCrudMethod } from '@/config/ruby-keywords';
import { COMMON_PATTERNS, MethodPatternBuilder } from '@/utils/regex-patterns';

export function analyzeMethodsInFile(file: ParsedFile): Method[] {
  if (!file.content.trim() || file.language === 'unknown') {
    return [];
  }

  let methods: Method[] = [];
  
  switch (file.language) {
    case 'ruby':
      methods = analyzeRubyMethods(file);
      break;
    case 'javascript':
    case 'typescript':
      methods = analyzeJavaScriptMethods(file);
      break;
    default:
      return [];
  }
  
  
  return methods;
}

function analyzeRubyMethods(file: ParsedFile): Method[] {
  const methods: Method[] = [];
  const lines = file.content.split('\n');
  let isPrivate = false;

  // 単一ループでメソッド名収集と解析を同時実行（パフォーマンス最適化）
  const definedMethods = new Set<string>();

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

    // メソッド定義の検出（?や!を含むメソッド名にも対応）
    const methodMatch = trimmedLine.match(COMMON_PATTERNS.METHOD_DEFINITION);
    if (methodMatch) {
      const [, selfPrefix, methodName, params] = methodMatch;
      const isClassMethod = !!selfPrefix;
      
      // メソッド名を収集
      definedMethods.add(methodName);
      
      // メソッドの終端を探す
      const methodEndLine = findRubyMethodEnd(lines, i);
      const methodCode = lines.slice(i, methodEndLine + 1).join('\n');
      const methodCalls = extractRubyMethodCalls(methodCode, i + 1, definedMethods);

      methods.push({
        name: methodName,
        type: isClassMethod ? 'class_method' : 'method',
        startLine: i + 1,
        endLine: methodEndLine + 1,
        filePath: file.path,
        code: methodCode,
        calls: methodCalls,
        isPrivate,
        parameters: parseRubyParameters(params || '()')
      });
    }
  }

  return methods;
}

function analyzeJavaScriptMethods(file: ParsedFile): Method[] {
  const methods: Method[] = [];
  const lines = file.content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();

    // 通常の関数宣言
    const functionMatch = trimmedLine.match(/^function\s+(\w+)\s*\(([^)]*)\)/);
    if (functionMatch) {
      const [, functionName, params] = functionMatch;
      const methodEndLine = findJavaScriptFunctionEnd(lines, i);
      const methodCode = lines.slice(i, methodEndLine + 1).join('\n');
      const methodCalls = extractJavaScriptMethodCalls(methodCode, i + 1);

      methods.push({
        name: functionName,
        type: 'function',
        startLine: i + 1,
        endLine: methodEndLine + 1,
        filePath: file.path,
        code: methodCode,
        calls: methodCalls,
        isPrivate: false,
        parameters: parseJavaScriptParameters(params)
      });
      continue;
    }

    // アロー関数
    const arrowMatch = trimmedLine.match(/^(?:const|let|var)\s+(\w+)\s*=\s*\([^)]*\)\s*=>/);
    if (arrowMatch) {
      const [, functionName] = arrowMatch;
      const methodEndLine = findJavaScriptArrowFunctionEnd(lines, i);
      const methodCode = lines.slice(i, methodEndLine + 1).join('\n');
      const methodCalls = extractJavaScriptMethodCalls(methodCode, i + 1);

      methods.push({
        name: functionName,
        type: 'function',
        startLine: i + 1,
        endLine: methodEndLine + 1,
        filePath: file.path,
        code: methodCode,
        calls: methodCalls,
        isPrivate: false,
        parameters: []
      });
      continue;
    }

    // オブジェクトメソッド
    const objectMethodMatch = trimmedLine.match(/^(\w+)\s*[:]\s*function\s*\(([^)]*)\)/) ||
                             trimmedLine.match(/^(\w+)\s*\(([^)]*)\)\s*\{/);
    if (objectMethodMatch) {
      const [, methodName, params] = objectMethodMatch;
      const methodEndLine = findJavaScriptFunctionEnd(lines, i);
      const methodCode = lines.slice(i, methodEndLine + 1).join('\n');
      const methodCalls = extractJavaScriptMethodCalls(methodCode, i + 1);

      methods.push({
        name: methodName,
        type: 'method',
        startLine: i + 1,
        endLine: methodEndLine + 1,
        filePath: file.path,
        code: methodCode,
        calls: methodCalls,
        isPrivate: false,
        parameters: parseJavaScriptParameters(params || '')
      });
    }
  }

  return methods;
}

function findRubyMethodEnd(lines: string[], startIndex: number): number {
  let depth = 1;
  for (let i = startIndex + 1; i < lines.length; i++) {
    const trimmedLine = lines[i].trim();
    
    // 新しいメソッド定義が見つかった場合、現在のメソッドは終了
    if (trimmedLine.match(/^def\s+/)) {
      return i - 1; // 前の行で終了
    }
    
    // その他の制御構造でdepthを増加
    if (trimmedLine.match(/^(class|module|if|unless|while|until|for|case|begin)/)) {
      depth++;
    } else if (trimmedLine === 'end') {
      depth--;
      if (depth === 0) {
        return i;
      }
    }
  }
  return lines.length - 1;
}

function findJavaScriptFunctionEnd(lines: string[], startIndex: number): number {
  let depth = 0;
  let foundStart = false;
  
  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i];
    for (const char of line) {
      if (char === '{') {
        depth++;
        foundStart = true;
      } else if (char === '}') {
        depth--;
        if (foundStart && depth === 0) {
          return i;
        }
      }
    }
  }
  return lines.length - 1;
}

function findJavaScriptArrowFunctionEnd(lines: string[], startIndex: number): number {
  const line = lines[startIndex];
  if (line.includes(';')) {
    return startIndex;
  }
  return findJavaScriptFunctionEnd(lines, startIndex);
}

/**
 * 文字列補間内のメソッド呼び出しを抽出
 * 改善版: 構造化された正規表現パターンを使用
 */
function extractInterpolationMethodCalls(line: string, lineNumber: number): MethodCall[] {
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
 * ドット記法のメソッド呼び出しを抽出（チェーンメソッドを含む）
 * 改善版: 構造化された正規表現パターンを使用
 */
function extractDotMethodCalls(line: string, lineNumber: number, definedMethods: Set<string>): MethodCall[] {
  const calls: MethodCall[] = [];
  
  // ドット記法メソッド呼び出しパターンを使用
  const dotMethodMatches = Array.from(line.matchAll(COMMON_PATTERNS.DOT_METHOD));
  for (const match of dotMethodMatches) {
    const methodName = match[1];
    if (methodName && !isRubyBuiltin(methodName) && (!isRubyCrudMethod(methodName) || definedMethods.has(methodName))) {
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
 * 改善版: 構造化された正規表現パターンを使用
 */
function extractStandaloneMethodCalls(line: string, lineNumber: number, definedMethods: Set<string>): MethodCall[] {
  const calls: MethodCall[] = [];
  
  // スタンドアロンメソッド呼び出しパターンを使用
  const standaloneMethodMatches = Array.from(line.matchAll(COMMON_PATTERNS.STANDALONE_METHOD));
  for (const match of standaloneMethodMatches) {
    const methodName = match[1];
    
    // 変数代入（=）、文字列内、コメント内でないことを確認
    const beforeMethod = line.substring(0, line.indexOf(methodName));
    const afterMethod = line.substring(line.indexOf(methodName) + methodName.length);
    
    // 変数代入の左側（変数名）でない、かつRubyキーワードでない場合のみ
    // 右側（値）のメソッド呼び出しは検出対象
    const isAssignmentTarget = beforeMethod.trim().match(/\w+\s*$/) && afterMethod.trim().startsWith('=');
    
    if (methodName && 
        !isAssignmentTarget &&
        !isRubyKeyword(methodName) && 
        !isRubyBuiltin(methodName) && 
        (!isRubyCrudMethod(methodName) || definedMethods.has(methodName))) {
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
 * Rubyコード内からメソッド呼び出しを抽出
 */
function extractRubyMethodCalls(code: string, startLineNumber: number, definedMethods: Set<string> = new Set()): MethodCall[] {
  const calls: MethodCall[] = [];
  const lines = code.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const absoluteLineNumber = startLineNumber + i;
    
    // コメント行をスキップ
    if (line.trim().startsWith('#')) continue;
    
    // 文字列補間内のメソッド呼び出し
    calls.push(...extractInterpolationMethodCalls(line, absoluteLineNumber));
    
    // メソッド定義行以外で通常のメソッド呼び出しを解析
    if (!line.trim().startsWith('def ')) {
      // ドット記法のメソッド呼び出し
      calls.push(...extractDotMethodCalls(line, absoluteLineNumber, definedMethods));
      
      // スタンドアロンのメソッド呼び出し
      calls.push(...extractStandaloneMethodCalls(line, absoluteLineNumber, definedMethods));
    }
  }
  
  // 重複を除去
  const uniqueCalls = calls.filter((call, index, self) =>
    index === self.findIndex((c) => 
      c.methodName === call.methodName && c.line === call.line
    )
  );
  
  return uniqueCalls;
}

function extractJavaScriptMethodCalls(code: string, startLineNumber: number): MethodCall[] {
  const calls: MethodCall[] = [];
  const lines = code.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const absoluteLineNumber = startLineNumber + i; // ファイル内での絶対行番号
    
    // 関数定義行は除外
    if (line.trim().startsWith('function ') || 
        line.includes('function(') ||
        /^\s*\w+\s*[:=]\s*function/.test(line)) {
      continue;
    }
    
    const methodCallMatches = Array.from(line.matchAll(/(\w+)\s*\(/g));
    
    for (const match of methodCallMatches) {
      const methodName = match[1];
      if (methodName && !isJavaScriptKeyword(methodName)) {
        calls.push({
          methodName,
          line: absoluteLineNumber,
          context: line.trim()
        });
      }
    }
  }
  
  return calls;
}

function parseRubyParameters(paramString: string): string[] {
  const params = paramString.replace(/[()]/g, '').trim();
  return params ? params.split(',').map(p => p.trim()) : [];
}

function parseJavaScriptParameters(paramString: string): string[] {
  const params = paramString.trim();
  return params ? params.split(',').map(p => p.trim()) : [];
}


function isJavaScriptKeyword(word: string): boolean {
  const keywords = ['if', 'else', 'while', 'for', 'switch', 'case', 'try', 'catch', 'finally', 'return', 'break', 'continue', 'function', 'var', 'let', 'const', 'class', 'new'];
  return keywords.includes(word);
}