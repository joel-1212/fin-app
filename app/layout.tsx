import type { Metadata, Viewport } from "next";
import "./globals.css";
import { TaskProvider } from "./providers";

const SITE_TITLE = "Fin ー 終わる時間がわかるタスク管理";
const SITE_DESCRIPTION =
  "タスクに「何分かかるか」を入れると、全部終わる予定時刻が出ます。今やる1つだけを表示して、勝手に次へ進みません。";

export const metadata: Metadata = {
  metadataBase: new URL("https://fin-app.xyz"),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  openGraph: {
    type: "website",
    siteName: "Fin",
    locale: "ja_JP",
    url: "https://fin-app.xyz",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { color: "#f5f3ef", media: "(prefers-color-scheme: light)" },
    { color: "#0e0f10", media: "(prefers-color-scheme: dark)" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              'try{var p=localStorage.getItem("fin.theme");if(p!=="system"&&p!=="light"&&p!=="dark")p="system";var d=p==="dark"||(p==="system"&&matchMedia("(prefers-color-scheme: dark)").matches);if(d)document.documentElement.setAttribute("data-theme","dark");else document.documentElement.removeAttribute("data-theme")}catch(e){}',
          }}
        />
      </head>
      <body>
        <TaskProvider>{children}</TaskProvider>
      </body>
    </html>
  );
}
