# Node.js 18を使用（安定版かつNext.js 14対応）
FROM node:18-alpine

# 作業ディレクトリを設定
WORKDIR /app

# パッケージマネージャーのキャッシュを有効活用するため
# package.jsonとpackage-lock.jsonを先にコピー
COPY package*.json ./

# 依存関係をインストール
RUN npm install

# アプリケーションのソースコードをコピー
COPY . .

# Next.jsの開発サーバーを起動
EXPOSE 3000
CMD ["npm", "run", "dev"]