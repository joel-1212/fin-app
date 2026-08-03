import { pickCompletionLine } from "@/lib/completion-copy";

// 16×11 のドット絵を 4 コマ。潮を吹いているクジラで、アプリ名 Fin（＝ひれ）に掛けている。
// 潮が少しずつ大きくなり、それに合わせて尾びれが上下する 1 周 2.4 秒のループ。
// rect を直接並べるとコードから絵が読めなくなるので、文字グリッドで持つ。
// '#' が体、'*' がアクセント（潮・背びれ・口）、'o' が目（背景色で抜く）。
const FRAMES = [
  // 潮なし・尾びれは中立
  [
    "................",
    "................",
    "........*.......",
    ".......***......",
    ".......######...",
    ".##..#########..",
    ".##############.",
    "..###########o#.",
    ".##############.",
    ".##..#######**..",
    "......#######...",
  ],
  // 潮がわずかに立ち上がり、尾びれは上へ
  [
    "................",
    "................",
    "........*..*....",
    ".......***......",
    ".##....######...",
    ".###.#########..",
    "..#############.",
    "..###########o#.",
    "..#############.",
    ".....#######**..",
    "......#######...",
  ],
  // 潮が伸びる・尾びれは中立
  [
    "................",
    "...........*....",
    "........*..*....",
    ".......***......",
    ".......######...",
    ".##..#########..",
    ".##############.",
    "..###########o#.",
    ".##############.",
    ".##..#######**..",
    "......#######...",
  ],
  // 潮が散る・尾びれは下へ
  [
    "...........*....",
    "..........*.*...",
    "........*..*....",
    ".......***......",
    ".......######...",
    ".....#########..",
    "..#############.",
    "..###########o#.",
    ".##############.",
    ".###.#######**..",
    ".##...#######...",
  ],
];

const PIXEL_FILL: Record<string, string> = {
  "#": "var(--fg)",
  "*": "var(--accent)",
  o: "var(--bg)",
};

/** 横に連続する同色ドットを 1 つの rect にまとめる（モジュール読み込み時に一度だけ）。 */
const FRAME_RUNS = FRAMES.map((frame) =>
  frame.flatMap((row, y) => {
    const runs: { fill: string; width: number; x: number; y: number }[] = [];
    let x = 0;
    while (x < row.length) {
      const fill = PIXEL_FILL[row[x]];
      if (!fill) {
        x += 1;
        continue;
      }
      let width = 1;
      while (row[x + width] === row[x]) width += 1;
      runs.push({ fill, width, x, y });
      x += width;
    }
    return runs;
  }),
);

const FRAME_DURATION_MS = 600;
const CYCLE_MS = FRAME_DURATION_MS * FRAMES.length;

const styles = [
  ".all-done-card { align-items: flex-start; display: flex; flex-direction: column; margin-top: 18px; max-width: 430px; }",
  ".all-done-card__line { animation: all-done-card-arrive 760ms cubic-bezier(.22, 1, .36, 1) both; color: var(--fg); font-size: clamp(1.5rem, 5.4vw, 2rem); font-weight: 600; letter-spacing: .035em; line-height: 1.45; margin: 0; }",
  ".all-done-card__wordmark { animation: all-done-card-arrive 760ms 80ms cubic-bezier(.22, 1, .36, 1) both; color: var(--fg-42); font-size: clamp(1.125rem, 3vw, 1.375rem); font-weight: 600; letter-spacing: .18em; line-height: 1; margin: 18px 0 0 2px; }",
  // 浮き沈みは svg 側、コマ送りは中の g 側。役割を分けておくと片方だけ止められる。
  `.all-done-card__art { animation: all-done-card-arrive 760ms 170ms cubic-bezier(.22, 1, .36, 1) both, all-done-card-swim 4.8s 930ms ease-in-out infinite; display: block; height: 88px; margin: 22px 0 0 2px; overflow: visible; width: 128px; }`,
  `.all-done-card__frame { animation: all-done-card-flip ${CYCLE_MS}ms linear infinite; opacity: 0; }`,
  // 負の delay は「その分だけ先に進んだ状態で始める」ので、素直に -index 分ずらすと
  // コマが逆順（潮が縮んでいく向き）に流れる。1 周ぶんから引いて正順に戻す。
  ...FRAMES.map(
    (_, index) =>
      `.all-done-card__frame--${index} { animation-delay: -${((FRAMES.length - index) * FRAME_DURATION_MS) / 1000}s; }`,
  ),
  "@keyframes all-done-card-arrive { 0% { opacity: 0; transform: translateY(7px); } 100% { opacity: 1; transform: translateY(0); } }",
  "@keyframes all-done-card-swim { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }",
  `@keyframes all-done-card-flip { 0%, ${100 / FRAMES.length - 0.1}% { opacity: 1; } ${100 / FRAMES.length}%, 100% { opacity: 0; } }`,
  // 動きを減らす設定では、潮がいちばん見えるコマで静止させる。
  "@media (prefers-reduced-motion: reduce) { .all-done-card__art, .all-done-card__line, .all-done-card__wordmark, .all-done-card__frame { animation: none; } .all-done-card__frame--2 { opacity: 1; } }",
].join("\n");

export function AllDoneCard({ seed }: { seed: number }) {
  return (
    <>
      <style>{styles}</style>
      <div className="all-done-card">
        <p className="all-done-card__line">{pickCompletionLine(seed)}</p>
        <p aria-label="Fin" className="all-done-card__wordmark">
          Fin
        </p>
        <svg
          aria-label="潮を吹いている、ドット絵のクジラ"
          className="all-done-card__art"
          role="img"
          viewBox="0 0 16 11"
        >
          {FRAME_RUNS.map((runs, index) => (
            <g className={`all-done-card__frame all-done-card__frame--${index}`} key={index}>
              {runs.map((pixel) => (
                <rect
                  key={`${pixel.x}-${pixel.y}`}
                  fill={pixel.fill}
                  height="1"
                  width={pixel.width}
                  x={pixel.x}
                  y={pixel.y}
                />
              ))}
            </g>
          ))}
        </svg>
      </div>
    </>
  );
}
