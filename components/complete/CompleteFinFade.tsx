type CompleteFinFadeProps = {
  taskName: string;
};

const styles = [
  ".complete-fin { align-items: center; display: flex; justify-content: center; min-height: 240px; overflow: hidden; position: relative; width: 100%; }",
  ".complete-fin__word { animation: complete-fin-fade 1250ms cubic-bezier(.22, 1, .36, 1) both; color: var(--fg); font-size: clamp(2.2rem, 9vw, 4rem); font-weight: 500; letter-spacing: -.07em; line-height: 1; }",
  "@keyframes complete-fin-fade { 0% { opacity: 0; transform: translateY(8px); } 54% { opacity: .72; transform: translateY(0); } 100% { opacity: 1; transform: translateY(0); } }",
  "@media (prefers-reduced-motion: reduce) { .complete-fin__word { animation: none; opacity: 1; transform: none; } }",
].join("\n");

export function CompleteFinFade({ taskName }: CompleteFinFadeProps) {
  return (
    <>
      <style>{styles}</style>
      <div
        aria-label={taskName + "\u306e\u5b8c\u4e86\u6f14\u51fa\u3001Fin\u306e\u30d5\u30a7\u30fc\u30c9"}
        className="complete-fin"
        role="img"
      >
        <span aria-hidden="true" className="complete-fin__word">
          Fin
        </span>
      </div>
    </>
  );
}
