'use client';

import { useEffect } from 'react';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import CodeVisualizer from '@/components/CodeVisualizer';

export default function Home() {
  useEffect(() => {
    // クライアントサイドでのみPrism.jsを読み込む
    const loadPrism = async () => {
      if (typeof window !== 'undefined' && !(window as any).Prism) {
        try {
          console.log('Loading Prism.js globally...');
          // Prism.jsコアをインポート
          const Prism = (await import('prismjs')).default;
          
          // 言語サポートを追加
          await import('prismjs/components/prism-ruby' as any);
          await import('prismjs/components/prism-javascript' as any);
          await import('prismjs/components/prism-typescript' as any);
          
          // Prism.jsテーマ
          await import('prismjs/themes/prism-tomorrow.css' as any);
          
          // グローバルに設定
          (window as any).Prism = Prism;
          console.log('Prism.js loaded successfully');
        } catch (error) {
          console.error('Failed to load Prism.js:', error);
        }
      }
    };

    loadPrism();
  }, []);

  return (
    <ErrorBoundary>
      <CodeVisualizer />
    </ErrorBoundary>
  );
}