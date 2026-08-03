type CompleteIconFillProps = {
  taskName: string;
};

const completionLabel = "\u5b8c\u4e86";

const styles = [
  ".complete-icon { align-items: center; display: flex; justify-content: center; min-height: 240px; overflow: hidden; position: relative; width: 100%; }",
  ".complete-icon__glow { animation: complete-icon-glow 1220ms cubic-bezier(.22, 1, .36, 1) both; background: radial-gradient(circle, var(--fg-14) 0, transparent 68%); border-radius: 50%; height: 150px; opacity: 0; position: absolute; width: 150px; }",
  ".complete-icon__shell { align-items: center; animation: complete-icon-fill 1120ms cubic-bezier(.22, 1, .36, 1) both; background: transparent; border: 1px solid var(--fg-32); border-radius: 50%; display: flex; height: 88px; justify-content: center; position: relative; width: 88px; z-index: 1; }",
  ".complete-icon__svg { height: 58px; overflow: visible; width: 58px; }",
  ".complete-icon__outline { animation: complete-icon-outline 1120ms cubic-bezier(.22, 1, .36, 1) both; fill: none; stroke: var(--accent); stroke-width: 1.6; }",
  ".complete-icon__check { animation: complete-icon-check 1120ms cubic-bezier(.22, 1, .36, 1) both; fill: none; stroke: var(--accent); stroke-linecap: round; stroke-linejoin: round; stroke-width: 2.4; }",
  ".complete-icon__label { animation: complete-icon-label 900ms 280ms ease-out both; color: var(--fg-50); font-size: 12px; letter-spacing: .12em; margin: 22px 0 0; position: absolute; top: calc(50% + 42px); }",
  "@keyframes complete-icon-glow { 0% { opacity: 0; transform: scale(.72); } 48% { opacity: .66; transform: scale(1); } 100% { opacity: .28; transform: scale(1.12); } }",
  "@keyframes complete-icon-fill { 0%, 38% { background: transparent; border-color: var(--fg-32); box-shadow: 0 0 0 0 transparent; } 62% { background: var(--accent); border-color: var(--accent); box-shadow: 0 0 0 10px var(--fg-14), 0 12px 34px var(--fg-14); } 100% { background: var(--accent); border-color: var(--accent); box-shadow: 0 0 0 7px var(--fg-14), 0 12px 30px var(--fg-14); } }",
  "@keyframes complete-icon-outline { 0%, 42% { stroke: var(--accent); } 100% { stroke: var(--bg); } }",
  "@keyframes complete-icon-check { 0%, 36% { stroke-dasharray: 38; stroke-dashoffset: 38; stroke: var(--accent); } 64% { stroke-dasharray: 38; stroke-dashoffset: 0; stroke: var(--accent); } 100% { stroke-dasharray: 38; stroke-dashoffset: 0; stroke: var(--bg); } }",
  "@keyframes complete-icon-label { 0% { opacity: 0; transform: translateY(4px); } 100% { opacity: 1; transform: translateY(0); } }",
  "@media (prefers-reduced-motion: reduce) { .complete-icon__glow, .complete-icon__shell, .complete-icon__outline, .complete-icon__check, .complete-icon__label { animation: none; } .complete-icon__glow { opacity: .28; transform: none; } .complete-icon__shell { background: var(--accent); border-color: var(--accent); box-shadow: 0 0 0 7px var(--fg-14), 0 12px 30px var(--fg-14); } .complete-icon__outline { stroke: var(--bg); } .complete-icon__check { stroke-dasharray: 38; stroke-dashoffset: 0; stroke: var(--bg); } .complete-icon__label { opacity: 1; transform: none; } }",
].join("\n");

export function CompleteIconFill({ taskName }: CompleteIconFillProps) {
  return (
    <>
      <style>{styles}</style>
      <div
        aria-label={taskName + "\u306e\u5b8c\u4e86\u6f14\u51fa\u3001\u30a2\u30a4\u30b3\u30f3\u306e\u5857\u308a"}
        className="complete-icon"
        role="img"
      >
        <div aria-hidden="true" className="complete-icon__glow" />
        <div aria-hidden="true" className="complete-icon__shell">
          <svg className="complete-icon__svg" viewBox="0 0 64 64">
            <circle className="complete-icon__outline" cx="32" cy="32" r="22" />
            <path className="complete-icon__check" d="M21 32.5 28.5 40 44 24.5" />
          </svg>
        </div>
        <p aria-hidden="true" className="complete-icon__label">
          {completionLabel}
        </p>
      </div>
    </>
  );
}
