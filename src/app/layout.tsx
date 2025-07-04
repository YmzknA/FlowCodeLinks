import type { Metadata } from 'next'
import './globals.css'

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
    <html lang="ja">
      <head>
        <link rel="stylesheet" href="/prism-theme.css" />
      </head>
      <body className="bg-gray-100 font-mono">
        {children}
      </body>
    </html>
  )
}