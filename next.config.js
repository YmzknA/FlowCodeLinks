/** @type {import('next').NextConfig} */
const nextConfig = {
  // 静的サイト生成の設定（本番デプロイ時に使用）
  // output: 'export',
  // 画像最適化を無効化（静的エクスポート時に必要）
  images: {
    unoptimized: true
  },
  // Vercelデプロイ時のTrailing slash設定
  trailingSlash: true,
  // SSR時のエラーを回避
  experimental: {
    serverComponentsExternalPackages: ['prismjs']
  },
  // Content Security Policy設定
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Prism.jsとNext.jsで必要
              "style-src 'self' 'unsafe-inline'", // Tailwind CSSで必要
              "img-src 'self' data: blob:",
              "connect-src 'self'",
              "font-src 'self'",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'"
            ].join('; ')
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          }
        ]
      }
    ]
  }
}

module.exports = nextConfig