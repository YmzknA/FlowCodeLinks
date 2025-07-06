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
 * import文内の個別メソッド名をクリック可能にする関数
 * @param html ハイライト済みのHTML
 * @param importMethods import文で使用されているメソッド名の配列
 * @param findMethodDefinition メソッド定義検索関数（クリック可能性判定用）
 * @returns 処理済みHTML
 */
export const makeImportMethodsClickable = (
  html: string, 
  importMethods: string[], 
  findMethodDefinition?: (methodName: string) => { methodName: string; filePath: string } | null
): string => {
  let result = html;
  
  // 保護マーカー（既存のclassのdata-method-nameを保護）
  const protectMarker = createProtectMarker();
  const protectMap = new Map<string, string>();
  let protectIndex = 0;
  
  // 既存のdata-method-name属性を保護
  result = result.replace(/data-method-name="[^"]*"/g, (match) => {
    const protectedValue = `${protectMarker}_INDEX_${protectIndex}_END__`;
    protectMap.set(protectedValue, match);
    protectIndex++;
    return protectedValue;
  });

  // import文で使用されているメソッド名をクリック可能にする
  importMethods.forEach(methodName => {
    // 定義元が見つからない場合はクリック可能にしない
    const hasDefinition = findMethodDefinition ? findMethodDefinition(methodName) !== null : true;
    if (!hasDefinition) {
      return; // クリック可能にしない
    }
    
    const escapedMethodName = methodName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // Prismハイライト後のimport文内メソッド名を検出
    // パターン1: 通常のidentifier（何もタグで囲まれていない）
    const plainPattern = new RegExp(`\\b${escapedMethodName}\\b(?![^<]*>)(?!\\s*as\\s+\\w+)`, 'g');
    
    // パターン2: Prismでハイライトされた場合（例：<span class="token">methodName</span>）
    const prismPattern = new RegExp(
      `(<span[^>]*class="[^"]*token[^"]*"[^>]*>)\\s*(${escapedMethodName})\\s*(</span>)(?!\\s*as\\s+\\w+)`,
      'g'
    );
    
    // 通常のパターンを処理
    result = result.replace(plainPattern, (match) => {
      // import文の内部かどうかをチェック（簡易的）
      return `<span class="cursor-pointer text-blue-600 hover:text-blue-800" data-method-name="${methodName}" data-import-method="true">${match}</span>`;
    });
    
    // Prismハイライト済みパターンを処理
    result = result.replace(prismPattern, (match, openTag, methodNamePart, closeTag) => {
      return `${openTag}<span class="cursor-pointer text-blue-600 hover:text-blue-800" data-method-name="${methodName}" data-import-method="true">${methodNamePart}</span>${closeTag}`;
    });
  });
  
  // 保護されたdata-method-name属性を復元
  protectMap.forEach((originalContent, marker) => {
    const escapedMarker = marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    result = result.replace(new RegExp(escapedMarker, 'g'), originalContent);
  });
  
  return result;
};

/**
 * HTMLコンテンツ内でメソッド名を置換する関数
 * HTMLタグ内の属性は置換対象から除外する
 * @param html HTML文字列
 * @param methodName メソッド名
 * @param escapedMethodName エスケープ済みメソッド名
 * @param findMethodDefinition メソッド定義検索関数（クリック可能性判定用）
 * @param findAllMethodCallers メソッド呼び出し元検索関数（モーダル表示可能性判定用）
 * @param currentFilePath 現在のファイルパス
 * @param files 全ファイルデータ
 * @returns 処理済みHTML
 */
export const replaceMethodNameInText = (
  html: string, 
  methodName: string, 
  escapedMethodName: string,
  findMethodDefinition?: (methodName: string) => { methodName: string; filePath: string } | null,
  findAllMethodCallers?: (methodName: string) => Array<{ methodName: string; filePath: string; lineNumber?: number }>,
  currentFilePath?: string,
  files?: any[]
): string => {
  // クリック可能性の判定（判定関数が提供された場合のみ実行）
  let isClickable = true; // デフォルトはクリック可能
  
  if (findMethodDefinition && findAllMethodCallers && currentFilePath && files) {
    // 現在のファイルでメソッドが定義されているかチェック
    const currentFile = files.find(f => f.path === currentFilePath);
    const isDefinedInCurrentFile = currentFile?.methods?.some((method: any) => method.name === methodName);
    
    if (isDefinedInCurrentFile) {
      // 定義元メソッドの場合：呼び出し元があるかチェック
      const callers = findAllMethodCallers(methodName);
      isClickable = callers.length > 0; // 呼び出し元がある場合のみクリック可能（モーダル表示）
    } else {
      // 呼び出されているメソッドの場合：定義元があるかチェック
      const definition = findMethodDefinition(methodName);
      isClickable = definition !== null; // 定義元がある場合のみクリック可能（ジャンプ）
    }
    
    // クリック可能でない場合はそのまま返す
    if (!isClickable) {
      return html;
    }
  }
  
  // 特定のケースのみ保護する、より安全なアプローチ
  let result = html;
  
  // 一時的な保護マーカー（堅牢なエラーハンドリング付き）
  const protectMarker = createProtectMarker();
  const protectMap = new Map<string, string>();
  let protectIndex = 0;
  
  // 1. 完全なHTMLタグを保護（開始タグと終了タグ）
  result = result.replace(/<\/?[a-zA-Z][^>]*>/g, (match: string) => {
    if (match.includes(methodName)) {
      const protectedValue = `${protectMarker}_INDEX_${protectIndex}_END__`;
      protectMap.set(protectedValue, match);
      protectIndex++;
      return protectedValue;
    }
    return match;
  });
  
  // 2. 属性値の形式を保護 (="value" または ='value' 形式)
  result = result.replace(/\w+\s*=\s*["'][^"']*["']/g, (match: string) => {
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