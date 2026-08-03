import type { ReactNode } from "react";

export const PHONE = { width: 393, height: 852, radius: 46 } as const;

/** iPhone 実機サイズの枠。デザイン検証用で、実機ビルドでは使わない */
export function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        width: PHONE.width,
        height: PHONE.height,
        borderRadius: PHONE.radius,
        overflow: "hidden",
        position: "relative",
        background: "var(--bg)",
        color: "var(--fg)",
        boxShadow: "0 24px 60px rgba(0,0,0,.5)",
        flex: "none",
      }}
    >
      {children}
    </div>
  );
}

/** 「＋」ボタン。ライト時は前景色を反転させる */
export function AddButton({ style }: { style?: React.CSSProperties }) {
  return (
    <span
      style={{
        width: 58,
        height: 58,
        borderRadius: "50%",
        background: "var(--accent)",
        color: "var(--bg)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 32,
        fontWeight: 300,
        lineHeight: 1,
        ...style,
      }}
    >
      ＋
    </span>
  );
}
