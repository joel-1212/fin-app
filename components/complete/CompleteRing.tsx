type CompleteRingProps = {
  taskName: string;
};

const completionLabel = "\u5b8c\u4e86";

const styles = [
  ".complete-ring { align-items: center; display: flex; justify-content: center; min-height: 240px; overflow: hidden; position: relative; width: 100%; }",
  ".complete-ring__wave { animation: complete-ring-wave 1500ms cubic-bezier(.22, 1, .36, 1) both; border: 1px solid var(--accent); border-radius: 50%; height: 94px; opacity: 0; position: absolute; width: 94px; }",
  ".complete-ring__mark { align-items: center; animation: complete-ring-mark 820ms cubic-bezier(.22, 1, .36, 1) both; background: var(--sheet); border: 1px solid var(--fg-14); border-radius: 50%; box-shadow: 0 12px 34px var(--fg-14); color: var(--accent); display: flex; font-size: 31px; font-weight: 400; height: 88px; justify-content: center; line-height: 1; position: relative; width: 88px; z-index: 1; }",
  ".complete-ring__label { animation: complete-ring-label 900ms 240ms ease-out both; color: var(--fg-50); font-size: 12px; letter-spacing: .12em; margin: 22px 0 0; position: absolute; top: calc(50% + 42px); }",
  "@keyframes complete-ring-wave { 0% { opacity: .6; transform: scale(.72); } 52% { opacity: .26; transform: scale(1.42); } 100% { opacity: 0; transform: scale(2.12); } }",
  "@keyframes complete-ring-mark { 0% { opacity: 0; transform: scale(.88); } 60% { opacity: 1; transform: scale(1.02); } 100% { opacity: 1; transform: scale(1); } }",
  "@keyframes complete-ring-label { 0% { opacity: 0; transform: translateY(4px); } 100% { opacity: 1; transform: translateY(0); } }",
  "@media (prefers-reduced-motion: reduce) { .complete-ring__wave, .complete-ring__mark, .complete-ring__label { animation: none; } .complete-ring__wave { opacity: .24; transform: scale(1.72); } .complete-ring__mark, .complete-ring__label { opacity: 1; transform: none; } }",
].join("\n");

export function CompleteRing({ taskName }: CompleteRingProps) {
  return (
    <>
      <style>{styles}</style>
      <div
        aria-label={taskName + "\u306e\u5b8c\u4e86\u6f14\u51fa\u3001\u9759\u304b\u306a\u30ea\u30f3\u30b0"}
        className="complete-ring"
        role="img"
      >
        <div aria-hidden="true" className="complete-ring__wave" />
        <div aria-hidden="true" className="complete-ring__mark">
          &#10003;
        </div>
        <p aria-hidden="true" className="complete-ring__label">
          {completionLabel}
        </p>
      </div>
    </>
  );
}
