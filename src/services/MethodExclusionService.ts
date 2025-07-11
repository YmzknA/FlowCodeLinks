/**
 * Method Exclusion Service - Redesigned for Granular Control
 * 
 * フレームワーク固有のメソッド除外ルールを管理するサービス
 * 
 * 🎯 問題解決: Rails標準アクション除外ロジックの粒度細分化
 * 
 * 従来の粗い除外ロジックを以下3つの機能に分離：
 * 1. isDefinitionClickable() - 定義のクリック可否
 * 2. isDefinitionJumpTarget() - 定義のジャンプ対象可否
 * 3. isCallDetectionEnabled() - 内部での呼び出し検知可否
 * 
 * これにより、Rails標準アクション内でのメソッド呼び出し検知が正常に動作する
 */

import { isRailsControllerStandardAction } from '@/config/rails-constants';

/**
 * 除外ルールの定義インターフェース
 * 粒度別の除外判定をサポート
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
 * 詳細除外設定インターフェース
 * 各機能について個別に除外設定を指定
 */
interface DetailedExclusionSettings {
  /** 定義のクリック可否 */
  definitionClickable: boolean;
  /** 定義のジャンプ対象可否 */
  definitionJumpTarget: boolean;
  /** 内部での呼び出し検知可否 */
  callDetectionEnabled: boolean;
}

/**
 * メソッド除外サービス（リデザイン版）
 * 
 * 各フレームワークの除外ルールを統一的に管理し、
 * 粒度別にメソッドの除外判定を行います。
 * 
 * 🎯 主な改善点:
 * - Rails標準アクション内での呼び出し検知を正常化
 * - 定義クリック・ジャンプ・呼び出し検知の分離
 * - 後方互換性の保持
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
   * 🎯 Rails標準アクション固有の詳細除外設定
   * 
   * Rails標準アクション（index, show, new, edit, create, update, destroy）について：
   * - 定義のクリック: 不可（透明な存在として扱う）
   * - 定義のジャンプ対象: 不可（ジャンプ先にならない）
   * - 呼び出し検知: 可能（内部でのメソッド呼び出しは検知する）
   */
  private static readonly railsStandardActionSettings: DetailedExclusionSettings = {
    definitionClickable: false,    // 標準アクション定義はクリック不可
    definitionJumpTarget: false,   // 標準アクション定義はジャンプ対象外
    callDetectionEnabled: true     // 🎯 重要: 標準アクション内での呼び出し検知は有効
  };

  // =============================================================================
  // 🎯 新しい粒度別API（推奨）
  // =============================================================================

  /**
   * メソッド定義がクリック可能かどうかを判定
   * 
   * @param methodName - メソッド名
   * @param filePath - ファイルパス
   * @returns クリック可能な場合true
   */
  static isDefinitionClickable(methodName: string, filePath: string): boolean {
    // Rails標準アクションの特別処理
    if (this.isRailsControllerStandardAction(methodName, filePath)) {
      return this.railsStandardActionSettings.definitionClickable;
    }
    
    // その他のフレームワークルール（将来拡張用）
    const excludedByOtherRules = this.isExcludedByNonRailsRules(methodName, filePath);
    return !excludedByOtherRules;
  }

  /**
   * メソッド定義がジャンプ対象かどうかを判定
   * 
   * @param methodName - メソッド名
   * @param filePath - ファイルパス
   * @returns ジャンプ対象の場合true
   */
  static isDefinitionJumpTarget(methodName: string, filePath: string): boolean {
    // Rails標準アクションの特別処理
    if (this.isRailsControllerStandardAction(methodName, filePath)) {
      return this.railsStandardActionSettings.definitionJumpTarget;
    }
    
    // その他のフレームワークルール（将来拡張用）
    const excludedByOtherRules = this.isExcludedByNonRailsRules(methodName, filePath);
    return !excludedByOtherRules;
  }

  /**
   * 🎯 メソッド内での呼び出し検知が有効かどうかを判定（問題解決の核心）
   * 
   * @param methodName - メソッド名
   * @param filePath - ファイルパス
   * @returns 呼び出し検知が有効な場合true
   */
  static isCallDetectionEnabled(methodName: string, filePath: string): boolean {
    // Rails標準アクションの特別処理
    if (this.isRailsControllerStandardAction(methodName, filePath)) {
      return this.railsStandardActionSettings.callDetectionEnabled;
    }
    
    // その他のフレームワークルール（将来拡張用）
    const excludedByOtherRules = this.isExcludedByNonRailsRules(methodName, filePath);
    return !excludedByOtherRules;
  }

  /**
   * 🎯 メソッドが矢印ターゲットとして有効かどうかを判定（新API）
   * 
   * Rails標準アクション（new, show等）は矢印の終点になることを防ぐ
   * 
   * @param methodName - メソッド名
   * @param filePath - ファイルパス
   * @returns 矢印ターゲットとして有効な場合true
   */
  static isValidArrowTarget(methodName: string, filePath: string): boolean {
    // Rails標準アクションの特別処理：矢印ターゲット不可
    if (this.isRailsControllerStandardAction(methodName, filePath)) {
      return false;
    }
    
    // その他のフレームワークルール（将来拡張用）
    const excludedByOtherRules = this.isExcludedByNonRailsRules(methodName, filePath);
    return !excludedByOtherRules;
  }

  // =============================================================================
  // 🔄 既存API（後方互換性）
  // =============================================================================

  /**
   * メソッドが除外対象かどうかを判定
   * 
   * @deprecated 新しいAPIを使用してください: isDefinitionClickable, isDefinitionJumpTarget, isCallDetectionEnabled
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
   * @deprecated 新しいAPIを使用してください: isDefinitionClickable
   * @param methodName - メソッド名
   * @param filePath - ファイルパス
   * @returns クリック可能な場合true
   */
  static isClickableMethod(methodName: string, filePath: string): boolean {
    return this.isDefinitionClickable(methodName, filePath);
  }

  /**
   * メソッドがジャンプ対象かどうかを判定
   * 
   * @deprecated 新しいAPIを使用してください: isDefinitionJumpTarget
   * @param methodName - メソッド名
   * @param filePath - ファイルパス
   * @returns ジャンプ対象の場合true
   */
  static isJumpTargetMethod(methodName: string, filePath: string): boolean {
    return this.isDefinitionJumpTarget(methodName, filePath);
  }

  // =============================================================================
  // 🔧 ヘルパーメソッド（内部使用）
  // =============================================================================

  /**
   * Rails Controller標準アクションかどうかを判定
   * 
   * @param methodName - メソッド名
   * @param filePath - ファイルパス
   * @returns Rails Controller標準アクションの場合true
   */
  private static isRailsControllerStandardAction(methodName: string, filePath: string): boolean {
    const railsRule = this.rules.find(rule => rule.framework === 'rails');
    if (!railsRule) return false;
    
    return railsRule.filePattern.test(filePath) && railsRule.isExcluded(methodName, filePath);
  }

  /**
   * Rails以外のルールによって除外されるかどうかを判定
   * 
   * @param methodName - メソッド名
   * @param filePath - ファイルパス
   * @returns Rails以外のルールで除外される場合true
   */
  private static isExcludedByNonRailsRules(methodName: string, filePath: string): boolean {
    return this.rules
      .filter(rule => rule.framework !== 'rails')
      .some(rule => 
        rule.filePattern.test(filePath) && 
        rule.isExcluded(methodName, filePath)
      );
  }

  // =============================================================================
  // 🔍 デバッグ・情報取得用メソッド
  // =============================================================================

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
   * 詳細除外設定を取得（デバッグ用）
   * 
   * @param methodName - メソッド名
   * @param filePath - ファイルパス
   * @returns 詳細除外設定
   */
  static getDetailedExclusionSettings(methodName: string, filePath: string): DetailedExclusionSettings {
    return {
      definitionClickable: this.isDefinitionClickable(methodName, filePath),
      definitionJumpTarget: this.isDefinitionJumpTarget(methodName, filePath),
      callDetectionEnabled: this.isCallDetectionEnabled(methodName, filePath)
    };
  }

  /**
   * 登録されている除外ルール一覧を取得（デバッグ用）
   * 
   * @returns 除外ルール一覧
   */
  static getAllRules(): readonly ExclusionRule[] {
    return Object.freeze([...this.rules]);
  }

  /**
   * Rails標準アクション設定を取得（デバッグ用）
   * 
   * @returns Rails標準アクション設定
   */
  static getRailsStandardActionSettings(): DetailedExclusionSettings {
    return Object.freeze({ ...this.railsStandardActionSettings });
  }
}