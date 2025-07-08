/**
 * Rails framework specific constants and utilities
 * 
 * このファイルはRails固有の定数と判定ロジックを提供します。
 * 新しいフレームワーク対応時は、同様の構造で定数ファイルを作成してください。
 */

/**
 * Rails標準アクションの定数定義
 * RESTful設計に基づく7つの標準アクション
 */
export const RAILS_STANDARD_ACTIONS = [
  'index',
  'show', 
  'new',
  'edit',
  'create',
  'update',
  'destroy'
] as const;

/**
 * Rails標準アクションの型定義
 */
export type RailsStandardAction = typeof RAILS_STANDARD_ACTIONS[number];

/**
 * 高速検索のためのSet（O(1)検索）
 */
const RAILS_STANDARD_ACTIONS_SET = new Set(RAILS_STANDARD_ACTIONS);

/**
 * メソッド名がRails標準アクションかどうかを判定
 * 
 * @param methodName - 判定するメソッド名
 * @returns Rails標準アクションの場合true
 */
export const isRailsStandardAction = (methodName: string): methodName is RailsStandardAction => {
  return RAILS_STANDARD_ACTIONS_SET.has(methodName as RailsStandardAction);
};

/**
 * ファイルパスがRailsコントローラーファイルかどうかを判定
 * 
 * @param filePath - 判定するファイルパス
 * @returns Railsコントローラーファイルの場合true
 */
export const isRailsControllerFile = (filePath: string): boolean => {
  return filePath.endsWith('_controller.rb');
};

/**
 * メソッドがRailsコントローラーの標準アクションかどうかを総合判定
 * 
 * @param methodName - メソッド名
 * @param filePath - ファイルパス
 * @returns Railsコントローラーの標準アクションの場合true
 */
export const isRailsControllerStandardAction = (methodName: string, filePath: string): boolean => {
  return isRailsControllerFile(filePath) && isRailsStandardAction(methodName);
};