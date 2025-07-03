/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // カスタムカラーパレット（コードエディタ風）
      colors: {
        'code-bg': '#1e1e1e',
        'code-text': '#d4d4d4',
        'code-comment': '#6a9955',
        'code-keyword': '#569cd6',
        'code-string': '#ce9178',
      },
      // フローティングウィンドウ用のサイズ
      width: {
        'window': '400px',
        'window-collapsed': '200px',
      },
      height: {
        'window': '600px',
        'window-collapsed': '40px',
      },
      // ドラッグ中の z-index
      zIndex: {
        'floating': '1000',
        'dragging': '1001',
      }
    },
  },
  plugins: [],
}