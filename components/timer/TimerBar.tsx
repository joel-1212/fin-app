type TimerBarProps = {
  remainingMs: number;
  totalMs: number;
};

function formatTime(milliseconds: number) {
  const safeSeconds = Math.ceil(Math.max(0, milliseconds) / 1_000);
  const minutes = Math.floor(safeSeconds / 60);
  const remaining = safeSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(remaining).padStart(2, "0")}`;
}

export function TimerBar({ remainingMs, totalMs }: TimerBarProps) {
  const progress = totalMs > 0 ? Math.min(1, Math.max(0, remainingMs / totalMs)) : 0;

  return (
    <div
      aria-label="残り時間"
      style={{ display: "flex", flexDirection: "column", gap: 22, width: "min(100%, 520px)" }}
    >
      <div
        style={{
          color: "var(--fg)",
          fontSize: "clamp(5rem, 20vw, 8.5rem)",
          fontWeight: 600,
          letterSpacing: "-.075em",
          lineHeight: 0.9,
          textAlign: "center",
        }}
      >
        {formatTime(remainingMs)}
      </div>
      <div
        aria-hidden="true"
        style={{
          background: "var(--fg-14)",
          borderRadius: 999,
          height: 12,
          overflow: "hidden",
          width: "100%",
        }}
      >
        <div
          style={{
            background: "var(--accent)",
            borderRadius: "inherit",
            height: "100%",
            transition: "width 700ms ease",
            width: `${progress * 100}%`,
          }}
        />
      </div>
    </div>
  );
}
