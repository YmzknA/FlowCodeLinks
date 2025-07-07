import type { Metadata } from 'next'
import './globals.css'
import '../styles/prism-theme.css'
import { FilesProvider } from '@/context/FilesContext'

const baseUrl = process.env.NODE_ENV === 'production' 
  ? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://flow-code-links.vercel.app')
  : 'http://localhost:3001';

const TITLE = 'FlowCodeLinks';
const DESCRIPTION = 'Visualize code flow and method relationships';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  metadataBase: new URL(baseUrl),
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: baseUrl,
    siteName: TITLE,
    images: [
      {
        url: `${baseUrl}/ogp.png`,
        width: 1200,
        height: 630,
        alt: 'FlowCodeLinks - Visualize code flow and method relationships',
      },
    ],
    locale: 'ja_JP',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: [`${baseUrl}/ogp.png`],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja" data-theme="nord">
      <head>
        <link rel="icon" href="/favicon.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Raleway:ital,wght@0,100..900;1,100..900&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-slate-50 text-slate-900 font-sans antialiased raleway">
        <FilesProvider>
          <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
            {children}
          </div>
        </FilesProvider>
      </body>
    </html>
  )
}
