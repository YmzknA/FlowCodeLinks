import type { Metadata } from 'next'
import './globals.css'
import '../styles/prism-theme.css'

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
      <body className="bg-gray-100 font-mono">
        {children}
      </body>
    </html>
  )
}