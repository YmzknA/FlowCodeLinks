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
  // TypeScript ESTreeのNode.js専用モジュールをクライアントサイドから除外
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        os: false,
      };
      // TypeScript ESTreeをクライアントサイドでは無効化
      config.resolve.alias = {
        ...config.resolve.alias,
        '@typescript-eslint/typescript-estree': false,
      };
    }
    
    return config;
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
              // 環境に応じた script-src の設定（Vercel Live Feedback対応）
              "script-src 'self' https://vercel.live" + (process.env.NODE_ENV === 'development' ? " 'unsafe-inline' 'unsafe-eval'" : " 'unsafe-inline'"),
              // 環境に応じた style-src の設定（Google Fontsを追加）
              "style-src 'self' https://fonts.googleapis.com" + (process.env.NODE_ENV === 'development' ? " 'unsafe-inline'" : " 'unsafe-inline'"),
              "img-src 'self' data: blob:",
              "connect-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com",
              "font-src 'self' https://fonts.gstatic.com",
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
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload'
          },
          {
            key: 'X-Permitted-Cross-Domain-Policies',
            value: 'none'
          },
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp'
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin'
          }
        ]
      }
    ]
  }
}

module.exports = nextConfig