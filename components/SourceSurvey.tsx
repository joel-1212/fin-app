"use client";

// 流入元アンケート（全アプリ共通の1画面）。🔴 正本は private-app-dev-harness/templates/source-survey/。
//
// 置き方: 最上位の layout / providers で children の前に <SourceSurvey />。
// 初回だけ全画面で出て、押したら消える。答えは端末に記録し、シートへ投げっぱなしで送る。
// SSR では何も描かない（localStorage を読むまで判断できないので hydration の食い違いを避ける）。

import { useEffect, useState, type CSSProperties } from "react";
import {
  readSourceAnswer,
  sendSourceAnswer,
  SOURCE_OPTIONS,
  writeSourceAnswer,
  type SourceId,
} from "@/lib/source-survey";

type Props = {
  /** 画面上部に出すアプリ名 */
  appName: string;
  /** 送信に添えるアプリの版（任意。lib/version 等から） */
  version?: string;
  /** アクセント色（任意。既定は各アプリの --accent、無ければ #2f6df6） */
  accent?: string;
  /** 地色・文字色（任意。CSS 変数 --bg/--fg を持たない暗いアプリは明示する。例: bg="#0a0a0a" fg="#fff"） */
  bg?: string;
  fg?: string;
  /** iOS/Android アプリの中でだけ出す（Web の共有ページや LP を見に来た人に出さない）。MusicDNA など */
  nativeOnly?: boolean;
  /** 出さないパスの先頭一致（既定: 法務・LP・共有ページ）。Web版の「アプリ本体」以外には出さない */
  excludePaths?: string[];
};

const DEFAULT_EXCLUDE = ["/privacy", "/terms", "/legal", "/landing", "/s/", "/share", "/og", "/api"];

export function SourceSurvey({ appName, version = "", accent, bg, fg, nativeOnly = false, excludePaths = DEFAULT_EXCLUDE }: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
      const isNative = !!cap?.isNativePlatform?.();
      if (nativeOnly && !isNative) return;
      const path = window.location.pathname;
      if (!isNative && excludePaths.some((p) => path.startsWith(p))) return;
    } catch {
      return;
    }
    const answer = readSourceAnswer();
    if (answer === null) setOpen(true); // 未回答のときだけ出す。"unavailable" は出さない
  }, [nativeOnly, excludePaths]);

  if (!open) return null;

  const choose = (source: SourceId) => {
    writeSourceAnswer(source);
    sendSourceAnswer(source, version);
    setOpen(false);
  };

  const accentColor = accent ?? "var(--accent, #2f6df6)";

  const button: CSSProperties = {
    appearance: "none",
    background: "var(--sheet, rgba(127,127,127,.08))",
    border: "1px solid var(--fg-14, rgba(127,127,127,.28))",
    borderRadius: 14,
    color: "inherit",
    cursor: "pointer",
    font: "inherit",
    fontSize: 16,
    fontWeight: 600,
    padding: "14px 16px",
    textAlign: "left",
    width: "100%",
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="source-survey-title"
      style={{
        alignItems: "center",
        background: bg ?? "var(--bg, #fff)",
        color: fg ?? "var(--fg, #111)",
        display: "flex",
        inset: 0,
        justifyContent: "center",
        overflowY: "auto",
        padding: "max(24px, env(safe-area-inset-top)) 20px max(24px, env(safe-area-inset-bottom))",
        position: "fixed",
        zIndex: 1000,
      }}
    >
      <section style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 420, width: "100%" }}>
        <p style={{ color: accentColor, fontSize: 13, fontWeight: 700, letterSpacing: ".08em", margin: "0 0 4px" }}>
          {appName}
        </p>
        <h1 id="source-survey-title" style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-.02em", lineHeight: 1.3, margin: "0 0 4px" }}>
          このアプリを、どこで知りましたか？
        </h1>
        <p style={{ fontSize: 14, lineHeight: 1.7, margin: "0 0 14px", opacity: 0.7 }}>
          1回だけお聞きします。答えは「どこで知ったか」だけを匿名で集計し、個人を特定する情報は送りません。
        </p>
        {SOURCE_OPTIONS.map((o) => (
          <button key={o.id} type="button" style={button} onClick={() => choose(o.id)}>
            {o.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => choose("skip")}
          style={{ ...button, background: "transparent", border: "none", fontWeight: 500, opacity: 0.6, textAlign: "center" }}
        >
          答えずに始める
        </button>
      </section>
    </div>
  );
}
