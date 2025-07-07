import type { Metadata } from 'next'
import './globals.css'
import '../styles/prism-theme.css'
import { FilesProvider } from '@/context/FilesContext'

const baseUrl = process.env.NODE_ENV === 'production' 
  ? 'https://flow-code-links.vercel.app'
  : 'http://localhost:3001';

const TITLE = 'FlowCodeLinks';
const DESCRIPTION = 'Visualize code flow and method relationships';

export const metadata: Metadata = {
  title: 'FlowCodeLinks',
  description: 'Visualize code flow and method relationships',
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
        <meta property="og:title" content="FlowCodeLinks" />
        <meta property="og:description" content="Visualize code flow and method relationships" />
        <meta property="og:image" content="/ogp.png" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="FlowCodeLinks" />
        <meta name="twitter:description" content="Visualize code flow and method relationships" />
        <meta name="twitter:image" content="/ogp.png" />
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
