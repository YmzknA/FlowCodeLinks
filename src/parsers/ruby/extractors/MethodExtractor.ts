/**
 * Ruby Method Extractor Interface
 * 
 * Ruby言語のメソッド抽出に関する基盤インターフェース
 * 各種抽出器はこのインターフェースを実装する
 */

import { Method, MethodCall } from '@/types/codebase';

/**
 * 抽出された生データ（パース前の状態）
 */
export interface RawMethodData {
  /** メソッド名 */
  name: string;
  /** 行番号（1ベース） */
  startLine: number;
  /** 終了行番号（1ベース） */
  endLine: number;
  /** メソッドのコード */
  code: string;
  /** パラメータ文字列 */
  parameters?: string;
  /** クラスメソッドかどうか */
  isClassMethod?: boolean;
  /** プライベートかどうか */
  isPrivate?: boolean;
  /** 除外対象かどうか */
  isExcluded?: boolean;
}

/**
 * メソッド定義抽出器のインターフェース
 */
export interface MethodDefinitionExtractor {
  /**
   * 抽出器の名前（デバッグ用）
   */
  readonly name: string;

  /**
   * メソッド定義を抽出
   * 
   * @param code - 解析対象コード
   * @param filePath - ファイルパス（除外判定用）
   * @returns 抽出された生メソッドデータ
   */
  extract(code: string, filePath: string): RawMethodData[];

  /**
   * この抽出器が指定パターンを処理できるかチェック
   * 
   * @param line - チェック対象行
   * @returns 処理可能な場合true
   */
  canHandle(line: string): boolean;
}

/**
 * メソッド呼び出し抽出器のインターフェース
 */
export interface MethodCallExtractor {
  /**
   * 抽出器の名前（デバッグ用）
   */
  readonly name: string;

  /**
   * メソッド呼び出しを抽出
   * 
   * @param code - 解析対象コード
   * @param startLineNumber - 開始行番号
   * @param definedMethods - 定義済みメソッド一覧（変数フィルタリング用）
   * @returns 抽出されたメソッド呼び出し
   */
  extract(code: string, startLineNumber: number, definedMethods?: Set<string>): MethodCall[];
}

/**
 * 抽象基底クラス：メソッド定義抽出器
 */
export abstract class BaseMethodDefinitionExtractor implements MethodDefinitionExtractor {
  abstract readonly name: string;

  abstract extract(code: string, filePath: string): RawMethodData[];
  abstract canHandle(line: string): boolean;

  /**
   * 行番号を計算
   */
  protected getLineNumber(code: string, index: number): number {
    return code.substring(0, index).split('\n').length;
  }

  /**
   * パラメータ文字列をパース
   */
  protected parseParameters(paramString: string): string[] {
    const params = paramString.replace(/[()]/g, '').trim();
    return params ? params.split(',').map(p => p.trim()) : [];
  }

  /**
   * メソッドの終端行を検索
   */
  protected findMethodEnd(lines: string[], startIndex: number): number {
    let depth = 1;
    for (let i = startIndex + 1; i < lines.length; i++) {
      const trimmedLine = lines[i].trim();
      
      // 新しいメソッド定義が見つかった場合、現在のメソッドは終了
      if (trimmedLine.match(/^def\s+/)) {
        return i - 1;
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
}

/**
 * 抽象基底クラス：メソッド呼び出し抽出器
 */
export abstract class BaseMethodCallExtractor implements MethodCallExtractor {
  abstract readonly name: string;

  abstract extract(code: string, startLineNumber: number, definedMethods?: Set<string>): MethodCall[];

  /**
   * 重複する呼び出しを除去
   */
  protected removeDuplicates(calls: MethodCall[]): MethodCall[] {
    return calls.filter((call, index, self) =>
      index === self.findIndex((c) => 
        c.methodName === call.methodName && c.line === call.line
      )
    );
  }

  /**
   * 定義済みメソッドかどうかチェック
   */
  protected isDefinedMethod(methodName: string, definedMethods?: Set<string>): boolean {
    return definedMethods ? definedMethods.has(methodName) : false;
  }
}