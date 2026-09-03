"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { writeOnboardingCompleted } from "@/lib/onboarding";

const tasks = [
  { duration: "10m", title: "\u30e1\u30fc\u30eb\u3092\u78ba\u8a8d\u3059\u308b" },
  { duration: "20m", title: "\u8cc7\u6599\u306e\u898b\u51fa\u3057\u3092\u6574\u3048\u308b" },
  { duration: "15m", title: "\u660e\u65e5\u306e\u6e96\u5099" },
];

export default function Screen7Page() {
  const router = useRouter();

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const originalTheme = document.documentElement.dataset.theme;

    const syncTheme = () => {
      document.documentElement.dataset.theme = mediaQuery.matches ? "dark" : "light";
    };

    syncTheme();
    mediaQuery.addEventListener("change", syncTheme);

    return () => {
      mediaQuery.removeEventListener("change", syncTheme);

      if (originalTheme) {
        document.documentElement.dataset.theme = originalTheme;
      } else {
        delete document.documentElement.dataset.theme;
      }
    };
  }, []);

  return (
    <main
      style={{
        alignItems: "center",
        background: "var(--bg)",
        color: "var(--fg)",
        display: "flex",
        minHeight: "100dvh",
        padding: "clamp(28px, 7vw, 56px) 20px",
      }}
    >
      <section
        aria-labelledby="onboarding-title"
        style={{
          display: "flex",
          flexDirection: "column",
          margin: "0 auto",
          maxWidth: 500,
          width: "100%",
        }}
      >
        <div style={{ alignItems: "center", display: "flex", gap: 10, marginBottom: 34 }}>
          <span
            aria-hidden="true"
            style={{
              background: "var(--accent)",
              borderRadius: 999,
              display: "block",
              height: 9,
              width: 9,
            }}
          />
          <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-.02em" }}>Fin</span>
        </div>

        <p
          style={{
            color: "var(--fg-50)",
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: ".12em",
            margin: "0 0 12px",
          }}
        >
          {"\u305d\u306e\u65e5\u306e\u7d42\u308f\u308a\u3092\u3001\u3055\u3089\u3063\u3068\u898b\u901a\u3059"}
        </p>
        <h1
          id="onboarding-title"
          style={{
            fontSize: "clamp(2rem, 8vw, 3.25rem)",
            fontWeight: 650,
            letterSpacing: "-.055em",
            lineHeight: 1.1,
            margin: 0,
          }}
        >
          {"\u4eca\u65e5\u306e\u7d42\u308f\u308a\u304c\u3001\u898b\u3048\u308b\u3002"}
        </h1>
        <p
          style={{
            color: "var(--fg-60)",
            fontSize: 15,
            lineHeight: 1.75,
            margin: "18px 0 30px",
            maxWidth: 390,
          }}
        >
          {"\u4eca\u3067\u304d\u308b\u3053\u3068\u3092\u9759\u304b\u306b\u4e26\u3079\u3066\u3001\u7d42\u308f\u308b\u4e88\u5b9a\u6642\u523b\u3092\u6559\u3048\u307e\u3059\u3002"}
        </p>

        <div
          aria-label="\u4eca\u65e5\u306e\u4e88\u5b9a\u30d7\u30ec\u30d3\u30e5\u30fc"
          style={{
            background: "var(--sheet)",
            border: "1px solid var(--fg-14)",
            borderRadius: 28,
            boxShadow: "0 18px 48px var(--hover)",
            overflow: "hidden",
          }}
        >
          <div style={{ padding: "24px 24px 21px" }}>
            <div style={{ alignItems: "center", display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--fg-50)", fontSize: 13, fontWeight: 600 }}>
                {"\u4eca\u65e5\u306e\u898b\u901a\u3057"}
              </span>
              <span
                style={{
                  background: "var(--fg-14)",
                  borderRadius: 999,
                  color: "var(--fg-60)",
                  fontSize: 12,
                  fontWeight: 600,
                  padding: "6px 9px",
                }}
              >
                {"\u3042\u3068 3\u4ef6"}
              </span>
            </div>

            <div style={{ margin: "33px 0 31px", textAlign: "center" }}>
              <p style={{ color: "var(--fg-50)", fontSize: 13, margin: "0 0 6px" }}>
                {"\u7d42\u308f\u308b\u4e88\u5b9a"}
              </p>
              <div
                style={{
                  color: "var(--fg)",
                  fontSize: "clamp(4rem, 20vw, 6.5rem)",
                  fontWeight: 650,
                  letterSpacing: "-.08em",
                  lineHeight: 0.94,
                }}
              >
                19:40
              </div>
              <p style={{ color: "var(--fg-50)", fontSize: 13, margin: "13px 0 0" }}>
                {"\u4eca\u304b\u3089\u59cb\u3081\u305f\u5834\u5408"}
              </p>
            </div>

            <div style={{ borderTop: "1px solid var(--fg-14)", display: "grid" }}>
              {tasks.map((task, index) => (
                <div
                  key={task.title}
                  style={{
                    alignItems: "center",
                    borderTop: index === 0 ? "none" : "1px solid var(--fg-14)",
                    display: "flex",
                    gap: 12,
                    padding: "13px 0",
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      background: index === 0 ? "var(--accent)" : "var(--fg-32)",
                      borderRadius: 999,
                      height: 7,
                      opacity: index === 0 ? 1 : 0.7,
                      width: 7,
                    }}
                  />
                  <span style={{ flex: 1, fontSize: 14, fontWeight: index === 0 ? 600 : 450 }}>{task.title}</span>
                  <span style={{ color: "var(--fg-50)", fontSize: 12, fontWeight: 600 }}>{task.duration}</span>
                </div>
              ))}
            </div>
          </div>
          <div
            style={{
              background: "var(--fg-14)",
              color: "var(--fg-60)",
              fontSize: 13,
              lineHeight: 1.5,
              padding: "15px 24px",
              textAlign: "center",
            }}
          >
            {"\u3072\u3068\u3064\u305a\u3064\u306a\u3089\u3001\u3061\u3083\u3093\u3068\u7d42\u308f\u308b\u3002"}
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            // 保存に失敗しても先へ進める。ここで止めると、ストレージが使えない端末では
            // 「始める」を押しても何も起きないアプリになる。
            writeOnboardingCompleted();
            router.push("/");
          }}
          style={{
            alignItems: "center",
            background: "var(--fg)",
            border: "1px solid var(--fg)",
            borderRadius: 16,
            color: "var(--bg)",
            cursor: "pointer",
            display: "flex",
            fontFamily: "inherit",
            fontSize: 16,
            fontWeight: 650,
            justifyContent: "center",
            marginTop: 16,
            minHeight: 56,
            padding: "14px 20px",
            width: "100%",
          }}
        >
          {"\u0046\u0069\u006e\u3092\u59cb\u3081\u308b"}
        </button>

        <p
          style={{
            color: "var(--fg-42)",
            fontSize: 12,
            lineHeight: 1.65,
            margin: "16px auto 0",
            maxWidth: 330,
            textAlign: "center",
          }}
        >
          {"\u30c7\u30fc\u30bf\u306f\u3053\u306e\u7aef\u672b\u5185\u306b\u306e\u307f\u4fdd\u5b58\u3055\u308c\u307e\u3059\u3002\u30a2\u30ab\u30a6\u30f3\u30c8\u306e\u4f5c\u6210\u3084\u30b5\u30a4\u30f3\u30a4\u30f3\u306f\u5fc5\u8981\u3042\u308a\u307e\u305b\u3093\u3002"}
        </p>
      </section>
    </main>
  );
}
