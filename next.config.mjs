/** @type {import('next').NextConfig} */
const nextConfig = {
  // Capacitor は静的ファイルを読み込むため、iOS ビルド時は export が必要になる。
  // 開発中は通常の dev サーバーで動かし、ネイティブ化する段階で有効にする。
  // output: 'export',
  images: { unoptimized: true },

  // このオリジンは通常のサイトであると同時に、通知・課金プラグインを持つ
  // ネイティブ WebView が読み込む中身でもある（capacitor.config.ts の server.url）。
  // 本番が返していたのは HSTS だけだった（2026-08-11 実測）。
  //
  // CSP 本体はここに入れていない。app/layout.tsx のインラインのテーマ初期化を
  // nonce と hash のどちらで通すか決める必要があり、リモート URL 方式では
  // 壊れた CSP がデプロイ即座に全ユーザーへ届く。別課題として切り出す。

  // /joel は開発者ページ（静的HTML）。public/joel/index.html を素のまま返す。
  // Next のルートや globals.css と混ぜないため、あえて public 配下の静的ファイルにしている。
  // 本体（iOS の WebView が読む "/"）には影響しない。
  async rewrites() {
    return [{ source: "/joel", destination: "/joel/index.html" }];
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // 埋め込ませない。フレーム経由で操作させる余地を消す。
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // アプリはどれも使わない。プラグイン経由の通知はこの対象外。
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
