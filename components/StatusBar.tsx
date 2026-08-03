/** iOS のステータスバー。実機では OS が描くので、これはモック用 */
export function StatusBar({ time, dim = false }: { time: string; dim?: boolean }) {
  const bar = (w: number, h: number, r: number, o = 1) => (
    <span
      style={{
        width: w,
        height: h,
        borderRadius: r,
        background: "currentColor",
        opacity: o,
      }}
    />
  );

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "16px 30px 0",
        fontSize: 15,
        fontWeight: 600,
        letterSpacing: ".01em",
        opacity: dim ? 0.75 : 1,
      }}
    >
      <span>{time}</span>
      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {bar(17, 11, 2, 0.9)}
        {bar(16, 9, 3, 0.55)}
        {bar(24, 11, 3)}
      </span>
    </div>
  );
}

/** 画面下部のホームインジケータ */
export function HomeIndicator() {
  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        bottom: 9,
        transform: "translateX(-50%)",
        width: 134,
        height: 5,
        borderRadius: 3,
        background: "var(--fg-32)",
      }}
    />
  );
}
