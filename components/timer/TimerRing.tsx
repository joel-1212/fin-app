type TimerRingProps = {
  remainingMs: number;
  totalMs: number;
};

function formatTime(milliseconds: number) {
  const safeSeconds = Math.ceil(Math.max(0, milliseconds) / 1_000);
  const minutes = Math.floor(safeSeconds / 60);
  const remaining = safeSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(remaining).padStart(2, "0")}`;
}

export function TimerRing({ remainingMs, totalMs }: TimerRingProps) {
  const radius = 102;
  const circumference = 2 * Math.PI * radius;
  const progress = totalMs > 0 ? Math.min(1, Math.max(0, remainingMs / totalMs)) : 0;

  return (
    <div
      aria-label="残り時間"
      style={{
        display: "grid",
        placeItems: "center",
        position: "relative",
        width: "min(76vw, 300px)",
        aspectRatio: "1",
      }}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 240 240"
        style={{ height: "100%", inset: 0, overflow: "visible", position: "absolute", width: "100%" }}
      >
        <circle
          cx="120"
          cy="120"
          fill="none"
          r={radius}
          stroke="var(--fg-14)"
          strokeWidth="12"
        />
        <circle
          cx="120"
          cy="120"
          fill="none"
          r={radius}
          stroke="var(--accent)"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - progress)}
          strokeLinecap="round"
          strokeWidth="12"
          style={{ transform: "rotate(-90deg)", transformOrigin: "center" }}
        />
      </svg>
      <div
        style={{
          color: "var(--fg)",
          fontSize: "clamp(3.5rem, 15vw, 6.25rem)",
          fontWeight: 600,
          letterSpacing: "-.075em",
          lineHeight: 0.9,
          position: "relative",
        }}
      >
        {formatTime(remainingMs)}
      </div>
    </div>
  );
}
