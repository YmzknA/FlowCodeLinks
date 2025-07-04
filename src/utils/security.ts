// セキュリティ関連のユーティリティ関数

/**
 * 外部リンクを安全化する関数
 * rel="noopener noreferrer" target="_blank" を自動付与
 */
export const sanitizeExternalLinks = (html: string): string => {
  return html.replace(
    /<a\s+href="([^"]*)"([^>]*)>/gi,
    (match, href, attrs) => {
      // 外部リンクでない場合は何もしない
      if (!isExternalLink(href)) {
        return match;
      }
      
      // 既にrel属性がある場合は適切に処理
      const hasRel = /\brel\s*=\s*["']([^"']*)["']/i.test(attrs);
      const hasTarget = /\btarget\s*=\s*["']([^"']*)["']/i.test(attrs);
      
      let newAttrs = attrs;
      
      if (hasRel) {
        // 既存のrel属性に noopener noreferrer を追加
        newAttrs = newAttrs.replace(
          /\brel\s*=\s*["']([^"']*)["']/i,
          (relMatch: string, relValue: string) => {
            const relValues = relValue.split(/\s+/);
            if (!relValues.includes('noopener')) relValues.push('noopener');
            if (!relValues.includes('noreferrer')) relValues.push('noreferrer');
            return `rel="${relValues.join(' ')}"`;
          }
        );
      } else {
        newAttrs += ' rel="noopener noreferrer"';
      }
      
      if (!hasTarget) {
        newAttrs += ' target="_blank"';
      }
      
      return `<a href="${href}"${newAttrs}>`;
    }
  );
};

/**
 * 外部リンクかどうかを判定する関数
 */
const isExternalLink = (href: string): boolean => {
  try {
    // 相対リンクや内部リンクの場合
    if (href.startsWith('#') || href.startsWith('/') || href.startsWith('./') || href.startsWith('../')) {
      return false;
    }
    
    // プロトコルがある場合は外部リンクとして扱う
    if (href.includes('://')) {
      // ブラウザ環境でない場合（テスト環境など）は全て外部リンクとして扱う
      if (typeof window === 'undefined') {
        return true;
      }
      const url = new URL(href);
      return url.hostname !== window.location.hostname;
    }
    
    return false;
  } catch {
    // URLパースに失敗した場合は安全側に倒して外部リンクとして扱う
    return true;
  }
};

/**
 * HTMLコンテンツ内の潜在的に危険な要素をログ出力する関数
 * 開発環境でのセキュリティ監視用
 */
export const auditHtmlContent = (html: string, source: string = 'unknown'): void => {
  if (process.env.NODE_ENV !== 'development') return;
  
  const suspiciousPatterns = [
    /javascript:/gi,
    /vbscript:/gi,
    /data:text\/html/gi,
    /<script/gi,
    /onload=/gi,
    /onerror=/gi,
    /onclick=/gi,
  ];
  
  suspiciousPatterns.forEach(pattern => {
    const matches = html.match(pattern);
    if (matches) {
      console.warn(`[Security Audit] Suspicious pattern found in ${source}:`, {
        pattern: pattern.toString(),
        matches: matches,
        context: html.substring(html.search(pattern) - 20, html.search(pattern) + 50)
      });
    }
  });
};