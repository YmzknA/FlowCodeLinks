/**
 * Basic Ruby Method Definition Extractor
 * 
 * 基本的なRubyメソッド定義を抽出する
 * - def method_name
 * - def self.method_name
 * - private def method_name
 */

import { BaseMethodDefinitionExtractor, RawMethodData } from './MethodExtractor';
import { MethodExclusionService } from '@/services/MethodExclusionService';
import { COMMON_PATTERNS } from '@/utils/regex-patterns';

export class BasicMethodDefinitionExtractor extends BaseMethodDefinitionExtractor {
  readonly name = 'BasicMethodDefinition';

  canHandle(line: string): boolean {
    const trimmed = line.trim();
    return COMMON_PATTERNS.METHOD_DEFINITION.test(trimmed);
  }

  extract(code: string, filePath: string): RawMethodData[] {
    const methods: RawMethodData[] = [];
    const lines = code.split('\n');
    let isPrivate = false;

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
      if (this.canHandle(line)) {
        const method = this.extractSingleMethod(lines, i, filePath, isPrivate);
        if (method) {
          methods.push(method);
        }
      }
    }

    return methods;
  }

  private extractSingleMethod(
    lines: string[], 
    lineIndex: number, 
    filePath: string, 
    isPrivate: boolean
  ): RawMethodData | null {
    const line = lines[lineIndex];
    const trimmedLine = line.trim();
    
    const methodMatch = trimmedLine.match(COMMON_PATTERNS.METHOD_DEFINITION);
    if (!methodMatch) {
      return null;
    }

    const [, selfPrefix, methodName, params] = methodMatch;
    const isClassMethod = !!selfPrefix;
    
    // 🎯 新API: 除外対象メソッドの判定（粒度細分化）
    const isExcluded = !MethodExclusionService.isDefinitionClickable(methodName, filePath);
    
    // メソッドの終端を探す
    const methodEndLine = this.findMethodEnd(lines, lineIndex);
    const methodCode = lines.slice(lineIndex, methodEndLine + 1).join('\n');

    return {
      name: methodName,
      startLine: lineIndex + 1,
      endLine: methodEndLine + 1,
      code: methodCode,
      parameters: params || '()',
      isClassMethod,
      isPrivate,
      isExcluded
    };
  }
}