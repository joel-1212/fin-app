export const completionLines = [
  "ぜんぶ終わりました",
  "おつかれさま",
  "きょうはここまでにしよー",
  // 評価する側に立つ言い方は、下から見上げられているようで居心地が悪い。
  // 隣にいるクジラが漏らしたひとことくらいの距離にする。
  "つぎはなにしよー",
  "きょうのリストが、きれいになりました",
  "ひとつずつ、ちゃんと終わりました",
  "次のことは、また思いついたときに",
] as const;

/** Returns a stable completion message for a caller-provided numeric seed. */
export function pickCompletionLine(seed: number): (typeof completionLines)[number] {
  const wholeSeed = Number.isFinite(seed) ? Math.trunc(seed) : 0;
  const index = ((wholeSeed % completionLines.length) + completionLines.length) % completionLines.length;
  return completionLines[index];
}
