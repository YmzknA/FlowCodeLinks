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
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // 開発環境でNext.jsが動作するように緩和
              "style-src 'self' 'unsafe-inline'", // 開発環境でスタイルが動作するように緩和
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