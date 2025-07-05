/**
 * 堅牢なエラーハンドリング付きの保護マーカー生成関数
 */
const createProtectMarker = (): string => {
  try {
    const timestamp = Date.now().toString(36);
    const random1 = Math.random().toString(36).slice(2, 11);
    const random2 = Math.random().toString(36).slice(2, 11);
    
    return `__PROTECT_${timestamp}_${random1}_${random2}__`;
  } catch (error) {
    console.error('Failed to create protect marker:', error);
    // フォールバック: 単純な連番
    return `__PROTECT_${Date.now()}_FALLBACK_${Math.floor(Math.random() * 10000)}__`;
  }
};

/**
 * HTMLコンテンツ内でメソッド名を置換する関数
 * HTMLタグ内の属性は置換対象から除外する
 */
export const replaceMethodNameInText = (html: string, methodName: string, escapedMethodName: string): string => {
  // 特定のケースのみ保護する、より安全なアプローチ
  let result = html;
  
  // 一時的な保護マーカー（堅牢なエラーハンドリング付き）
  const protectMarker = createProtectMarker();
  const protectMap = new Map<string, string>();
  let protectIndex = 0;
  
  // 1. 完全なHTMLタグを保護（開始タグと終了タグ）
  result = result.replace(/<\/?[a-zA-Z][^>]*>/g, (match) => {
    if (match.includes(methodName)) {
      const protectedValue = `${protectMarker}_INDEX_${protectIndex}_END__`;
      protectMap.set(protectedValue, match);
      protectIndex++;
      return protectedValue;
    }
    return match;
  });
  
  // 2. 属性値の形式を保護 (="value" または ='value' 形式)
  result = result.replace(/\w+\s*=\s*["'][^"']*["']/g, (match) => {
    if (match.includes(methodName)) {
      const protectedValue = `${protectMarker}_INDEX_${protectIndex}_END__`;
      protectMap.set(protectedValue, match);
      protectIndex++;
      return protectedValue;
    }
    return match;
  });
  
  // 保護されていないメソッド名（テキストノード内のみ）を置換
  // より厳密な境界条件：前後が英数字・アンダースコアでないことを確認
  const methodNameRegex = new RegExp(`(?<![\\w])${escapedMethodName}(?![\\w])`, 'g');
  result = result.replace(methodNameRegex, 
    `<span class="cursor-pointer" data-method-name="${methodName}">$&</span>`
  );
  
  // 保護されたHTMLタグと属性を復元
  protectMap.forEach((originalContent, marker) => {
    // マーカーをエスケープして安全に置換
    const escapedMarker = marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    result = result.replace(new RegExp(escapedMarker, 'g'), originalContent);
  });
  
  return result;
};