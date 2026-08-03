type TimerNumericProps = {
  remainingMs: number;
};

function formatTime(milliseconds: number) {
  const safeSeconds = Math.ceil(Math.max(0, milliseconds) / 1_000);
  const minutes = Math.floor(safeSeconds / 60);
  const remaining = safeSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(remaining).padStart(2, "0")}`;
}

export function TimerNumeric({ remainingMs }: TimerNumericProps) {
  return (
    <div
      aria-label="残り時間"
      style={{
        color: "var(--fg)",
        fontSize: "clamp(5.5rem, 24vw, 9.5rem)",
        fontWeight: 600,
        letterSpacing: "-.075em",
        lineHeight: 0.9,
        textAlign: "center",
      }}
    >
        {formatTime(remainingMs)}
    </div>
  );
}
