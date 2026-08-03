import type { CSSProperties } from "react";

type CompleteConfettiSoftProps = {
  taskName: string;
};

const completionLabel = "\u5b8c\u4e86";

const confettiPieces = [
  { travelX: "-86px", travelY: "-34px", rotate: "-24deg", delay: "40ms", tone: "accent" },
  { travelX: "-62px", travelY: "-74px", rotate: "18deg", delay: "110ms", tone: "muted" },
  { travelX: "-18px", travelY: "-92px", rotate: "-12deg", delay: "180ms", tone: "accent" },
  { travelX: "28px", travelY: "-84px", rotate: "28deg", delay: "70ms", tone: "muted" },
  { travelX: "74px", travelY: "-54px", rotate: "-18deg", delay: "160ms", tone: "accent" },
  { travelX: "92px", travelY: "-12px", rotate: "34deg", delay: "20ms", tone: "muted" },
  { travelX: "80px", travelY: "40px", rotate: "-30deg", delay: "130ms", tone: "accent" },
  { travelX: "34px", travelY: "78px", rotate: "16deg", delay: "210ms", tone: "muted" },
  { travelX: "-20px", travelY: "94px", rotate: "-26deg", delay: "90ms", tone: "accent" },
  { travelX: "-68px", travelY: "68px", rotate: "22deg", delay: "190ms", tone: "muted" },
  { travelX: "-94px", travelY: "22px", rotate: "-14deg", delay: "150ms", tone: "accent" },
] as const;

const styles = [
  ".complete-confetti { align-items: center; display: flex; justify-content: center; min-height: 240px; overflow: hidden; position: relative; width: 100%; }",
  ".complete-confetti__piece { animation: complete-confetti-piece 1250ms cubic-bezier(.22, 1, .36, 1) both; border-radius: 999px; height: 10px; left: calc(50% - 3px); opacity: 0; position: absolute; top: calc(50% - 5px); transform-origin: center; width: 6px; z-index: 1; }",
  ".complete-confetti__piece--accent { background: var(--accent); }",
  ".complete-confetti__piece--muted { background: var(--fg-38); height: 8px; width: 5px; }",
  ".complete-confetti__mark { align-items: center; animation: complete-confetti-mark 780ms cubic-bezier(.22, 1, .36, 1) both; background: var(--sheet); border: 1px solid var(--fg-14); border-radius: 50%; box-shadow: 0 12px 34px var(--fg-14); color: var(--accent); display: flex; font-size: 31px; font-weight: 400; height: 88px; justify-content: center; line-height: 1; position: relative; width: 88px; z-index: 2; }",
  ".complete-confetti__label { animation: complete-confetti-label 900ms 240ms ease-out both; color: var(--fg-50); font-size: 12px; letter-spacing: .12em; margin: 22px 0 0; position: absolute; top: calc(50% + 42px); }",
  "@keyframes complete-confetti-piece { 0% { opacity: 0; transform: translate(0, 0) rotate(0deg) scale(.5); } 27% { opacity: .66; transform: translate(0, 0) rotate(0deg) scale(1); } 100% { opacity: 0; transform: translate(var(--complete-x), var(--complete-y)) rotate(var(--complete-rotate)) scale(.92); } }",
  "@keyframes complete-confetti-mark { 0% { opacity: 0; transform: scale(.78); } 62% { opacity: 1; transform: scale(1.035); } 100% { opacity: 1; transform: scale(1); } }",
  "@keyframes complete-confetti-label { 0% { opacity: 0; transform: translateY(4px); } 100% { opacity: 1; transform: translateY(0); } }",
  "@media (prefers-reduced-motion: reduce) { .complete-confetti__piece, .complete-confetti__mark, .complete-confetti__label { animation: none; } .complete-confetti__piece { opacity: .28; transform: translate(var(--complete-x), var(--complete-y)) rotate(var(--complete-rotate)) scale(.92); } .complete-confetti__mark, .complete-confetti__label { opacity: 1; transform: none; } }",
].join("\n");

export function CompleteConfettiSoft({ taskName }: CompleteConfettiSoftProps) {
  return (
    <>
      <style>{styles}</style>
      <div
        aria-label={taskName + "\u306e\u5b8c\u4e86\u6f14\u51fa\u3001\u63a7\u3048\u3081\u306a\u7d19\u5439\u96ea"}
        className="complete-confetti"
        role="img"
      >
        {confettiPieces.map((piece, index) => (
          <span
            aria-hidden="true"
            className={"complete-confetti__piece complete-confetti__piece--" + piece.tone}
            key={piece.travelX + "-" + index}
            style={
              {
                "--complete-x": piece.travelX,
                "--complete-y": piece.travelY,
                "--complete-rotate": piece.rotate,
                animationDelay: piece.delay,
              } as CSSProperties
            }
          />
        ))}
        <div aria-hidden="true" className="complete-confetti__mark">
          &#10003;
        </div>
        <p aria-hidden="true" className="complete-confetti__label">
          {completionLabel}
        </p>
      </div>
    </>
  );
}
