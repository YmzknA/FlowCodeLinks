/**
 * Method Exclusion Service
 * 
 * フレームワーク固有のメソッド除外ルールを管理するサービス
 * 新しいフレームワーク対応時は、ExclusionRuleを追加するだけで対応可能
 */

import { isRailsControllerStandardAction } from '@/config/rails-constants';

/**
 * 除外ルールの定義インターフェース
 */
interface ExclusionRule {
  /** フレームワーク名 */
  framework: string;
  /** ファイルパターン（正規表現） */
  filePattern: RegExp;
  /** 除外判定関数 */
  isExcluded: (methodName: string, filePath: string) => boolean;
  /** 説明 */
  description: string;
}

/**
 * メソッド除外サービス
 * 
 * 各フレームワークの除外ルールを統一的に管理し、
 * メソッドの除外判定を行います。
 */
export class MethodExclusionService {
  /**
   * 除外ルール一覧
   * 新しいフレームワーク対応時はここにルールを追加
   */
  private static readonly rules: ExclusionRule[] = [
    {
      framework: 'rails',
      filePattern: /_controller\.rb$/,
      isExcluded: isRailsControllerStandardAction,
      description: 'Rails controller standard actions (index, show, new, edit, create, update, destroy)'
    }
    // 将来のフレームワーク対応例:
    // {
    //   framework: 'laravel',
    //   filePattern: /Controller\.php$/,
    //   isExcluded: isLaravelControllerStandardAction,
    //   description: 'Laravel controller standard actions'
    // }
  ];

  /**
   * メソッドが除外対象かどうかを判定
   * 
   * @param methodName - メソッド名
   * @param filePath - ファイルパス
   * @returns 除外対象の場合true
   */
  static isExcludedMethod(methodName: string, filePath: string): boolean {
    return this.rules.some(rule => 
      rule.filePattern.test(filePath) && 
      rule.isExcluded(methodName, filePath)
    );
  }

  /**
   * メソッドがクリック可能かどうかを判定
   * 
   * @param methodName - メソッド名
   * @param filePath - ファイルパス
   * @returns クリック可能な場合true
   */
  static isClickableMethod(methodName: string, filePath: string): boolean {
    return !this.isExcludedMethod(methodName, filePath);
  }

  /**
   * メソッドがジャンプ対象かどうかを判定
   * 
   * @param methodName - メソッド名
   * @param filePath - ファイルパス
   * @returns ジャンプ対象の場合true
   */
  static isJumpTargetMethod(methodName: string, filePath: string): boolean {
    return !this.isExcludedMethod(methodName, filePath);
  }

  /**
   * 適用される除外ルール情報を取得（デバッグ用）
   * 
   * @param methodName - メソッド名
   * @param filePath - ファイルパス
   * @returns 適用される除外ルール、なければnull
   */
  static getAppliedRule(methodName: string, filePath: string): ExclusionRule | null {
    return this.rules.find(rule => 
      rule.filePattern.test(filePath) && 
      rule.isExcluded(methodName, filePath)
    ) || null;
  }

  /**
   * 登録されている除外ルール一覧を取得（デバッグ用）
   * 
   * @returns 除外ルール一覧
   */
  static getAllRules(): readonly ExclusionRule[] {
    return Object.freeze([...this.rules]);
  }
}