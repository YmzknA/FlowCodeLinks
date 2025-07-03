import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Code Visualizer',
  description: 'Visualize code structure and method relationships',
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