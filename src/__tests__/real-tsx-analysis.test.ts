import { analyzeMethodsInFile } from '@/utils/method-analyzer';
import { ParsedFile, Language } from '@/types/codebase';

describe('実際のTSXファイル解析テスト', () => {
  const createTsxFile = (path: string, content: string): ParsedFile => ({
    path,
    language: 'tsx' as Language,
    content,
    directory: path.split('/').slice(0, -1).join('/'),
    fileName: path.split('/').pop() || '',
    totalLines: content.split('\n').length,
    methods: []
  });

  test('ContactPage - useEffectとコンポーネントを検出', () => {
    const content = `"use client";

import { useEffect } from "react";

export default function ContactPage() {
  useEffect(() => {
    const ffCompose = document.getElementById("ff-compose");
    if (ffCompose) {
      ffCompose.appendChild(document.createElement("script")).src =
        process.env.NEXT_PUBLIC_GOOGLE_FORM_URL || "";
    }
  }, []);

  return (
    <article className="w-full m-auto">
      <div id="ff-compose"></div>
    </article>
  );
}`;

    const file = createTsxFile('front/src/app/contact/page.tsx', content);
    const methods = analyzeMethodsInFile(file);

    console.log('ContactPage 解析結果:', methods.map(m => ({ name: m.name, type: m.type, line: m.startLine })));

    // コンポーネント自体が検出されること
    const contactPageComponent = methods.find(m => m.name === 'ContactPage');
    expect(contactPageComponent).toBeDefined();
    expect(contactPageComponent?.type).toBe('component');

    // useEffectのコールバック関数が検出されることがあるかチェック（実装次第）
    expect(methods.length).toBeGreaterThanOrEqual(1);
  });

  test('PrivacyPolicyPage - シンプルなコンポーネント', () => {
    const content = `import Link from "next/link";

export default function PrivacyPolicyPage() {
  return (
    <article className="container my-8 leading-7">
      <h2 className="text-center text-3xl">プライバシーポリシー</h2>
      <p className="my-8">
        本サービスは
        <a
          href="https://docs.github.com/ja/site-policy/privacy-policies"
          target="_blank"
        >
          GitHubのプライバシーポリシー
        </a>
        に準拠します。
      </p>
    </article>
  );
}`;

    const file = createTsxFile('front/src/app/privacypolicy/page.tsx', content);
    const methods = analyzeMethodsInFile(file);

    console.log('PrivacyPolicyPage 解析結果:', methods.map(m => ({ name: m.name, type: m.type, line: m.startLine })));

    const privacyPolicyComponent = methods.find(m => m.name === 'PrivacyPolicyPage');
    expect(privacyPolicyComponent).toBeDefined();
    expect(privacyPolicyComponent?.type).toBe('component');
  });

  test('複雑なコンポーネント - 状態管理とイベントハンドラー', () => {
    const content = `"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface RecordPageProps {
  params: { name: string };
}

export default function RecordPage({ params }: RecordPageProps) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchData();
  }, [params.name]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(\`/api/records/\${params.name}\`);
      if (!response.ok) throw new Error('Failed to fetch');
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [params.name]);

  const handleRetry = useCallback(() => {
    setError(null);
    fetchData();
  }, [fetchData]);

  const handleEdit = useCallback(() => {
    router.push(\`/record/\${params.name}/edit\`);
  }, [params.name, router]);

  if (loading) return <div>Loading...</div>;
  if (error) return (
    <div>
      <p>Error: {error}</p>
      <button onClick={handleRetry}>Retry</button>
    </div>
  );

  return (
    <div>
      <h1>Record: {params.name}</h1>
      <div>{JSON.stringify(data)}</div>
      <button onClick={handleEdit}>Edit</button>
    </div>
  );
}`;

    const file = createTsxFile('front/src/app/record/[name]/page.tsx', content);
    const methods = analyzeMethodsInFile(file);

    console.log('RecordPage 解析結果:', methods.map(m => ({ name: m.name, type: m.type, line: m.startLine })));

    // メインコンポーネント
    const recordPageComponent = methods.find(m => m.name === 'RecordPage');
    expect(recordPageComponent).toBeDefined();
    expect(recordPageComponent?.type).toBe('component');

    // コールバック関数
    const fetchDataMethod = methods.find(m => m.name === 'fetchData');
    const handleRetryMethod = methods.find(m => m.name === 'handleRetry');
    const handleEditMethod = methods.find(m => m.name === 'handleEdit');

    expect(fetchDataMethod).toBeDefined();
    expect(fetchDataMethod?.type).toBe('function');
    expect(handleRetryMethod).toBeDefined();
    expect(handleEditMethod).toBeDefined();

    // 十分な数のメソッドが検出されること
    expect(methods.length).toBeGreaterThanOrEqual(4);
  });

  test('レイアウトコンポーネント - 子要素を含む', () => {
    const content = `import type { Metadata } from "next";
import { Noto_Sans_JP } from "next/font/google";
import "./globals.css";
import MainLayout from "@/components/layouts/mainLayout";

const notoSansJP = Noto_Sans_JP({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Hoshi ni Task wo - 星にタスクを",
  description: "GitHubのタスクを星座として可視化するツール",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className={notoSansJP.className}>
        <MainLayout>
          {children}
        </MainLayout>
      </body>
    </html>
  );
}`;

    const file = createTsxFile('front/src/app/layout.tsx', content);
    const methods = analyzeMethodsInFile(file);

    console.log('RootLayout 解析結果:', methods.map(m => ({ name: m.name, type: m.type, line: m.startLine })));

    // RootLayoutコンポーネント
    const rootLayoutComponent = methods.find(m => m.name === 'RootLayout');
    expect(rootLayoutComponent).toBeDefined();
    expect(rootLayoutComponent?.type).toBe('component');

    // metadataオブジェクト（変数として検出される可能性）
    expect(methods.length).toBeGreaterThanOrEqual(1);
  });

  test('Headerコンポーネント - Linkとナビゲーション', () => {
    const content = `import Link from "next/link";

export default function Header() {
  return (
    <header className="bg-blue-900 text-white sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-xl font-bold hover:text-blue-200">
            Hoshi ni Task wo
          </Link>
          <nav className="hidden md:flex space-x-6">
            <Link href="/record" className="hover:text-blue-200">
              記録
            </Link>
            <Link href="/contact" className="hover:text-blue-200">
              お問い合わせ
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}`;

    const file = createTsxFile('front/src/components/layouts/header.tsx', content);
    const methods = analyzeMethodsInFile(file);

    console.log('Header 解析結果:', methods.map(m => ({ name: m.name, type: m.type, line: m.startLine })));

    const headerComponent = methods.find(m => m.name === 'Header');
    expect(headerComponent).toBeDefined();
    expect(headerComponent?.type).toBe('component');
  });

  test('統合テスト - 全コンポーネントを同時解析', () => {
    const files = [
      createTsxFile('contact/page.tsx', `export default function ContactPage() { return <div>Contact</div>; }`),
      createTsxFile('layout.tsx', `export default function RootLayout({ children }) { return <div>{children}</div>; }`),
      createTsxFile('header.tsx', `export default function Header() { return <header>Header</header>; }`),
    ];

    const allMethods = files.map(file => analyzeMethodsInFile(file)).flat();
    
    console.log('統合テスト 解析結果:', allMethods.map(m => ({ name: m.name, type: m.type, file: m.filePath })));

    // 各ファイルからコンポーネントが検出されること
    expect(allMethods.some(m => m.name === 'ContactPage')).toBe(true);
    expect(allMethods.some(m => m.name === 'RootLayout')).toBe(true);
    expect(allMethods.some(m => m.name === 'Header')).toBe(true);

    // 全て component type として検出されること
    const components = allMethods.filter(m => m.type === 'component');
    expect(components.length).toBeGreaterThanOrEqual(3);
  });
});