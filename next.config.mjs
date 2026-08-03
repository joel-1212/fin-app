/** @type {import('next').NextConfig} */
const nextConfig = {
  // Capacitor は静的ファイルを読み込むため、iOS ビルド時は export が必要になる。
  // 開発中は通常の dev サーバーで動かし、ネイティブ化する段階で有効にする。
  // output: 'export',
  images: { unoptimized: true },
};

export default nextConfig;
