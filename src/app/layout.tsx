import type { Metadata } from 'next'
import './globals.css'
import '../styles/prism-theme.css'
import { FilesProvider } from '@/context/FilesContext'

export const metadata: Metadata = {
  title: 'FlowCodeLinks',
  description: 'Visualize code flow and method relationships',
  openGraph: {
    title: 'FlowCodeLinks',
    description: 'Visualize code flow and method relationships',
    images: ['/ogp.png'],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FlowCodeLinks',
    description: 'Visualize code flow and method relationships',
    images: ['/ogp.png'],
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
