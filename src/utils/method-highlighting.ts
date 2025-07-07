/**
 * セキュリティ強化された保護マーカー生成関数
 * crypto.randomUUID() を優先使用し、フォールバックも提供
 */
const createProtectMarker = (): string => {
  try {
    // crypto.randomUUID() の使用（Node.js 14.17.0+ またはブラウザ対応）
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return `__PROTECT_${crypto.randomUUID()}__`;
    }
    
    // フォールバック（既存の実装）
    const timestamp = Date.now().toString(36);
    const random1 = Math.random().toString(36).slice(2, 11);
    const random2 = Math.random().toString(36).slice(2, 11);
    
    return `__PROTECT_${timestamp}_${random1}_${random2}__`;
  } catch (error) {
    debugError('Failed to create protect marker:', error);
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
  findMethodDefinition?: (methodName: string) => { methodName: string; filePath: string } | null,
  highlightedMethod?: { methodName: string; filePath: string; lineNumber?: number } | null,
  currentFilePath?: string,
  originalClickedMethod?: string | null
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
    
    // ハイライト対象かどうかを判定
    const isHighlighted = originalClickedMethod && 
                         originalClickedMethod === methodName && 
                         highlightedMethod && 
                         highlightedMethod.filePath === currentFilePath;
    
    const escapedMethodName = methodName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // Prismハイライト後のimport文内メソッド名を検出
    // パターン1: 通常のidentifier（何もタグで囲まれていない）
    const plainPattern = new RegExp(`\\b${escapedMethodName}\\b(?![^<]*>)(?!\\s*as\\s+\\w+)`, 'g');
    
    // パターン2: Prismでハイライトされた場合（例：<span class="token">methodName</span>）
    const prismPattern = new RegExp(
      `(<span[^>]*class="[^"]*token[^"]*"[^>]*>)\\s*(${escapedMethodName})\\s*(</span>)(?!\\s*as\\s+\\w+)`,
      'g'
    );
    
    const baseClasses = "cursor-pointer text-blue-600 hover:text-blue-800 hover:bg-blue-900 hover:bg-opacity-40 rounded px-1 relative";
    const highlightClasses = isHighlighted ? " bg-red-200 bg-opacity-60 border-2 border-red-300" : "";
    
    // 通常のパターンを処理
    result = result.replace(plainPattern, (match) => {
      // import文の内部かどうかをチェック（簡易的）
      return `<span class="${baseClasses}${highlightClasses}" data-method-name="${methodName}" data-import-method="true">${match}<span class="absolute -top-1 -right-1 text-xs text-yellow-400" aria-hidden="true" title="クリック可能なメソッド">*</span></span>`;
    });
    
    // Prismハイライト済みパターンを処理
    result = result.replace(prismPattern, (match, openTag, methodNamePart, closeTag) => {
      return `${openTag}<span class="${baseClasses}${highlightClasses}" data-method-name="${methodName}" data-import-method="true">${methodNamePart}<span class="absolute -top-1 -right-1 text-xs text-yellow-400" aria-hidden="true" title="クリック可能なメソッド">*</span></span>${closeTag}`;
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
import { isExternalLibraryMethod } from '@/config/external-methods';
import { methodHighlightStorage } from '@/utils/secure-storage';
import { debugLog, debugError } from '@/utils/debug';

export const replaceMethodNameInText = (
  html: string, 
  methodName: string, 
  escapedMethodName: string,
  findMethodDefinition?: (methodName: string) => { methodName: string; filePath: string } | null,
  findAllMethodCallers?: (methodName: string) => Array<{ methodName: string; filePath: string; lineNumber?: number }>,
  currentFilePath?: string,
  files?: any[],
  highlightedMethod?: { methodName: string; filePath: string; lineNumber?: number } | null,
  originalClickedMethod?: string | null
): string => {
  // 外部ライブラリメソッドは即座に非クリック化
  if (isExternalLibraryMethod(methodName)) {
    return html; // そのまま返す（クリック不可）
  }
  
  // クリック可能性の判定 - 統一ロジック
  let isClickable = false; // デフォルトは非クリック（安全側に倒す）
  
  if (findMethodDefinition && findAllMethodCallers && currentFilePath && files) {
    // 全パラメータが提供された場合：完全な判定を実行
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
  } else if (findMethodDefinition) {
    // findMethodDefinitionのみが提供された場合：定義検索ベースで判定
    const definition = findMethodDefinition(methodName);
    isClickable = definition !== null;
  } else {
    // findMethodDefinitionが利用できない場合：パターンベースで判定（フォールバック）
    // Ruby/JavaScript/TypeScriptメソッドの一般的なパターンでクリック可能性を判定
    const knownProjectMethods = new Set(['useAuth', 'useUser', 'useProfile']); // 確実にプロジェクト定義のメソッド
    
    // Rubyメソッドの一般的なパターン: snake_case、?や!で終わるメソッド
    const isRubyMethod = /^[a-z_][a-z0-9_]*[?!]?$/.test(methodName);
    
    // JavaScript/TypeScriptメソッドの一般的なパターン: camelCase、Pascalcase
    const isJavaScriptMethod = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(methodName);
    
    // 既知のプロジェクトメソッドまたは一般的なメソッドパターンの場合はクリック可能
    isClickable = knownProjectMethods.has(methodName) || isRubyMethod || isJavaScriptMethod;
  }
  // その他の場合：従来通り全てクリック可能（後方互換性）
  
  // クリック可能でない場合はそのまま返す
  if (!isClickable) {
    return html;
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
  
  // ハイライト対象かどうかを判定（完全一致のみ）
  // 最初にクリックしたメソッド名をハイライト
  const isHighlighted = originalClickedMethod && 
                       originalClickedMethod === methodName && 
                       highlightedMethod && 
                       highlightedMethod.filePath === currentFilePath;
  
  
  const baseClasses = "cursor-pointer hover:bg-blue-900 hover:bg-opacity-40 rounded px-1 relative";
  const highlightClasses = isHighlighted ? " bg-red-200 bg-opacity-60 border-2 border-red-300" : "";
  
  result = result.replace(methodNameRegex, 
    `<span class="${baseClasses}${highlightClasses}" data-method-name="${methodName}">$&<span class="absolute -top-1 -right-1 text-xs text-yellow-400" aria-hidden="true" title="クリック可能なメソッド">*</span></span>`
  );
  
  // 保護されたHTMLタグと属性を復元
  protectMap.forEach((originalContent, marker) => {
    // マーカーをエスケープして安全に置換
    const escapedMarker = marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    result = result.replace(new RegExp(escapedMarker, 'g'), originalContent);
  });
  
  return result;
};

/**
 * メソッド定義をハイライトする関数
 * @param html ハイライト済みのHTML
 * @param highlightedMethod ハイライト対象のメソッド情報
 * @param currentFilePath 現在のファイルパス
 * @param methods 現在のファイルのメソッド一覧
 * @returns 処理済みHTML
 */
export const highlightMethodDefinition = (
  html: string,
  highlightedMethod: { methodName: string; filePath: string; lineNumber?: number } | null | undefined,
  currentFilePath: string,
  methods: Array<{ name: string; startLine: number; endLine: number; type: string }> = []
): string => {
  if (!highlightedMethod || highlightedMethod.filePath !== currentFilePath) {
    return html;
  }

  // 対象メソッドを見つける
  const targetMethod = methods.find(method => method.name === highlightedMethod.methodName);
  if (!targetMethod) {
    return html;
  }


  // Rubyのメソッド定義パターンをハイライト
  // def method_name や private def method_name など
  const escapedMethodName = highlightedMethod.methodName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  
  // パターン1: def method_name
  const defPattern = new RegExp(
    `(<span[^>]*class="[^"]*token[^"]*keyword[^"]*"[^>]*>def</span>\\s*<span[^>]*class="[^"]*token[^"]*function[^"]*"[^>]*>)(${escapedMethodName})(</span>)`,
    'g'
  );
  
  // メソッド定義をハイライト
  let result = html.replace(defPattern, (match, beforeMethod, methodName, afterMethod) => {
    return `${beforeMethod}<span class="bg-red-200 bg-opacity-60 border-2 border-red-300 rounded px-1">${methodName}</span>${afterMethod}`;
  });

  return result;
};