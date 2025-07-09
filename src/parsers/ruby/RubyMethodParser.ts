/**
 * Ruby Method Parser
 * 
 * Ruby言語専用のメソッド解析パーサー
 * 複数の抽出器を組み合わせて包括的な解析を実行
 */

import { BaseLanguageParser } from '../base/LanguageParser';
import { ParsedFile, Method } from '@/types/codebase';
import { BasicMethodDefinitionExtractor } from './extractors/BasicMethodDefinitionExtractor';
import { BasicMethodCallExtractor } from './extractors/BasicMethodCallExtractor';
import { RawMethodData } from './extractors/MethodExtractor';

export class RubyMethodParser extends BaseLanguageParser {
  readonly language = 'ruby';

  // 抽出器のインスタンス
  private definitionExtractors = [
    new BasicMethodDefinitionExtractor(),
    // 将来的な拡張:
    // new QuestionMethodExtractor(),
    // new BangMethodExtractor(),
    // new OperatorMethodExtractor(),
  ];

  private callExtractors = [
    new BasicMethodCallExtractor(),
    // 将来的な拡張:
    // new ChainedMethodCallExtractor(),
    // new BlockMethodCallExtractor(),
  ];

  analyzeFile(file: ParsedFile, allDefinedMethods?: Set<string>): Method[] {
    if (!this.validateFile(file)) {
      return [];
    }

    return this.safeExecute(() => {
      // 1. メソッド定義の抽出
      const rawDefinitions = this.extractRawDefinitions(file);
      
      // 2. ローカル定義メソッドのセット作成
      const localDefinedMethods = new Set(rawDefinitions.map(def => def.name));
      const combinedDefinedMethods = this.combineMethodSets(localDefinedMethods, allDefinedMethods);
      
      // 3. メソッド呼び出しの抽出と統合
      const methods = rawDefinitions.map(rawDef => 
        this.enrichWithCalls(rawDef, file.path, combinedDefinedMethods)
      );

      return methods;
    }, []);
  }

  extractDefinitions(file: ParsedFile): Method[] {
    if (!this.validateFile(file)) {
      return [];
    }

    return this.safeExecute(() => {
      const rawDefinitions = this.extractRawDefinitions(file);
      return rawDefinitions.map(rawDef => this.convertToMethod(rawDef, file.path, []));
    }, []);
  }

  /**
   * 生のメソッド定義データを抽出
   */
  private extractRawDefinitions(file: ParsedFile): RawMethodData[] {
    const allDefinitions: RawMethodData[] = [];

    for (const extractor of this.definitionExtractors) {
      try {
        const definitions = extractor.extract(file.content, file.path);
        allDefinitions.push(...definitions);
      } catch (error) {
        console.warn(`Definition extraction failed with ${extractor.name}:`, error);
      }
    }

    // 重複除去（同じ名前・同じ行のメソッドを除去）
    return this.removeDuplicateDefinitions(allDefinitions);
  }

  /**
   * メソッド呼び出し情報を付加
   */
  private enrichWithCalls(
    rawDef: RawMethodData, 
    filePath: string, 
    definedMethods: Set<string>
  ): Method {
    const calls: any[] = [];

    for (const extractor of this.callExtractors) {
      try {
        const extractedCalls = extractor.extract(rawDef.code, rawDef.startLine, definedMethods);
        calls.push(...extractedCalls);
      } catch (error) {
        console.warn(`Call extraction failed with ${extractor.name}:`, error);
      }
    }

    return this.convertToMethod(rawDef, filePath, calls);
  }

  /**
   * 生データをMethodオブジェクトに変換
   */
  private convertToMethod(rawDef: RawMethodData, filePath: string, calls: any[]): Method {
    return {
      name: rawDef.name,
      type: rawDef.isClassMethod ? 'class_method' : 'method',
      startLine: rawDef.startLine,
      endLine: rawDef.endLine,
      filePath: filePath,
      code: rawDef.code,
      calls: calls,
      isPrivate: rawDef.isPrivate || false,
      parameters: this.parseParameters(rawDef.parameters || '()').map(p => ({ name: p })),
      isExcluded: rawDef.isExcluded || false
    };
  }

  /**
   * パラメータ文字列をパース
   */
  private parseParameters(paramString: string): string[] {
    const params = paramString.replace(/[()]/g, '').trim();
    return params ? params.split(',').map(p => p.trim()) : [];
  }

  /**
   * メソッドセットの結合
   */
  private combineMethodSets(local: Set<string>, global?: Set<string>): Set<string> {
    const combined = new Set(local);
    if (global) {
      global.forEach(method => combined.add(method));
    }
    return combined;
  }

  /**
   * 重複する定義を除去
   */
  private removeDuplicateDefinitions(definitions: RawMethodData[]): RawMethodData[] {
    const seen = new Set<string>();
    return definitions.filter(def => {
      const key = `${def.name}:${def.startLine}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }
}