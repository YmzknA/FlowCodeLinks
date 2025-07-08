/**
 * キャンバス関連の設定値
 */

export const CANVAS_CONFIG = {
  /** キャンバスオフセット座標 */
  OFFSET: { x: 2000, y: 1000 },
  
  /** タイミング設定（ミリ秒） */
  TIMING: {
    /** 外部パンリセットまでの遅延 */
    EXTERNAL_PAN_RESET: 50,
    /** ジャンプ完了判定までの遅延 */
    JUMP_COMPLETION: 200,
    /** センタリング実行までの遅延 */
    CENTERING_DELAY: 50,
    /** 新規ファイル表示時の待機時間 */
    NEW_FILE_WAIT: 300,
    /** 既存ファイル内ジャンプの待機時間 */
    EXISTING_FILE_WAIT: 200
  }
} as const;