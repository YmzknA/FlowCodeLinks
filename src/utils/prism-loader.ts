/**
 * Prism.js動的ローダーユーティリティ
 * 言語コンポーネントの依存関係を適切に管理
 */

export interface PrismLoader {
  loadLanguageSupport: (language: string) => Promise<any>;
  isPrismLoaded: () => boolean;
}

/**
 * Prism.jsの言語サポートを動的に読み込む
 */
export const createPrismLoader = (): PrismLoader => {
  let prismInstance: any = null;

  const loadLanguageSupport = async (language: string): Promise<any> => {
    // クライアントサイドでのみ実行
    if (typeof window === 'undefined') {
      return null;
    }

    // 既存のPrismインスタンスをチェック
    if (!prismInstance) {
      prismInstance = (window as any).Prism;
      
      if (!prismInstance) {
        // Prism.jsコアを読み込み
        prismInstance = (await import('prismjs')).default;
        (window as any).Prism = prismInstance;
      }
    }

    // 言語固有のコンポーネントを読み込み
    if (process.env.NODE_ENV === 'development') {
      console.log(`Loading Prism language: ${language}`);
    }

    try {
      switch (language) {
        case 'ruby':
          await import('prismjs/components/prism-ruby' as any);
          break;
          
        case 'javascript':
          await import('prismjs/components/prism-javascript' as any);
          break;
          
        case 'typescript':
          await import('prismjs/components/prism-typescript' as any);
          break;
          
        case 'tsx':
          // TSXの依存関係を順次読み込み
          await import('prismjs/components/prism-javascript' as any);
          await import('prismjs/components/prism-typescript' as any);
          await import('prismjs/components/prism-jsx' as any);
          await import('prismjs/components/prism-tsx' as any);
          if (process.env.NODE_ENV === 'development') {
            console.log('TSX components loaded successfully');
          }
          break;
          
        default:
          // サポートされていない言語の場合は何もしない
          break;
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.warn(`Failed to load Prism component for ${language}:`, error);
      }
    }

    return prismInstance;
  };

  const isPrismLoaded = (): boolean => {
    return prismInstance !== null || (typeof window !== 'undefined' && !!(window as any).Prism);
  };

  return {
    loadLanguageSupport,
    isPrismLoaded
  };
};

/**
 * グローバルPrismローダーインスタンス
 */
export const prismLoader = createPrismLoader();