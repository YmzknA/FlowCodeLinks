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
  }
}

module.exports = nextConfig