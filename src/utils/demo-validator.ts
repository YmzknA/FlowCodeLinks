/**
 * デモ機能のための簡単な検証ユーティリティ
 * 過剰な品質監視システムの代替として、必要最小限の検証のみを実装
 */

interface ValidationResult {
  valid: boolean;
  error?: string;
}

// 共通定数: ファイルサイズ制限 (1MB)
const MAX_SIZE = 1024 * 1024;

/**
 * デモコンテンツの基本的な検証
 * @param content - 検証対象のコンテンツ
 * @returns 検証結果
 */
export function validateDemoContent(content: string): ValidationResult {
  
  if (!content) {
    return { valid: false, error: 'コンテンツが空です' };
  }
  
  if (content.length > MAX_SIZE) {
    return { valid: false, error: 'ファイルサイズが大きすぎます' };
  }
  
  return { valid: true };
}

/**
 * ファイルタイプの基本的な検証
 * @param file - 検証対象のファイル
 * @returns 検証結果
 */
export function validateDemoFile(file: File): ValidationResult {
  
  if (file.size > MAX_SIZE) {
    return { valid: false, error: 'ファイルサイズが大きすぎます' };
  }
  
  // .mdファイルまたはテキストファイルのみ許可
  if (!file.name.endsWith('.md') && !file.type.includes('text')) {
    return { valid: false, error: 'サポートされていないファイル形式です' };
  }
  
  return { valid: true };
}