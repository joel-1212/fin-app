/**
 * アプリ内レビュー依頼を出すかどうか。**いつ出すか**だけを決める（表示は `app/use-review.ts`）。
 *
 * なぜ要るか（2026-08-18 の実測）:
 * 公開5日目に測ったら `タスク管理` `ADHD` `todo` はいずれも**圏外**で、拾えたのは `先延ばし` 126位だけ。
 * App Store の順位は評価数の影響が大きく、**レビュー0件のままでは棚に並ばない**。
 * 声かけで人を連れてきてもレビューは自然には付かないので、アプリの中に導線を置く。
 * ぽてまる（`../step-pet/lib/review-prompt.mjs`）と同じ型で、未来メーターにも同時に入れた。
 *
 * 設計の縛り（このアプリの核と衝突させない）:
 * - **終わらせた直後にだけ出す。** 積み残しの画面を見ているときには絶対に出さない。
 *   Fin が向き合っているのは先延ばしで詰まっている人なので、詰まっている最中に評価を求めない
 * - **初日には出さない。** 何日か使った人にだけ聞く
 * - **押し売りしない。** iOS の `SKStoreReviewController` は年3回までしか実際には出ないので、
 *   こちらでも同じ上限を持ち、無駄撃ちしない
 */

/** 生涯の依頼回数の上限。iOS 側の年3回に合わせる */
export const MAX_ASKS = 3;
/** 前回の依頼から空ける日数 */
export const COOLDOWN_DAYS = 90;
/** タスクを終わらせた日が通算これだけある人にだけ聞く */
export const MIN_COMPLETED_DAYS = 3;

function daysBetween(a, b) {
  const t1 = Date.parse(`${a}T00:00:00Z`);
  const t2 = Date.parse(`${b}T00:00:00Z`);
  if (Number.isNaN(t1) || Number.isNaN(t2)) return Infinity;
  return Math.round((t2 - t1) / 86400000);
}

/** epoch ミリ秒 → その端末での YYYY-MM-DD。UTC で切ると日本では朝9時前が前日になる */
function localDayKey(ms) {
  const date = new Date(ms);
  if (Number.isNaN(date.getTime())) return null;
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * タスクを終わらせた日が通算で何日あるか。
 * **件数ではなく日数**で数える（1日に10個片づけた人と、3日続けた人は違う）。
 */
export function completedDays(tasks) {
  if (!Array.isArray(tasks)) return 0;
  const days = new Set();
  for (const task of tasks) {
    if (task?.status !== 'completed') continue;
    if (typeof task.completedAt !== 'number' || !Number.isFinite(task.completedAt)) continue;
    const day = localDayKey(task.completedAt);
    if (day) days.add(day);
  }
  return days.size;
}

/**
 * 今このタイミングでレビューを聞いてよいか。
 *
 * @param {object} o
 * @param {Array<{status?: string, completedAt?: number|null}>} o.tasks
 * @param {boolean} o.justCompleted  いまタスクを終わらせた直後か
 * @param {string} o.today           YYYY-MM-DD
 * @param {string[]} [o.reviewAsks]  これまでに聞いた日（古い順）
 */
export function shouldAskReview(o) {
  const tasks = Array.isArray(o?.tasks) ? o.tasks : [];
  const asks = Array.isArray(o?.reviewAsks) ? o.reviewAsks : [];

  // 終わらせた直後だけ。ここがこのアプリで一番大事な線
  if (!o?.justCompleted) return false;
  if (tasks.length === 0) return false;
  // 同じ日に2回聞かない
  if (asks.includes(o.today)) return false;
  if (asks.length >= MAX_ASKS) return false;

  const last = asks.length ? asks[asks.length - 1] : null;
  if (last && daysBetween(last, o.today) < COOLDOWN_DAYS) return false;

  return completedDays(tasks) >= MIN_COMPLETED_DAYS;
}

/** 聞いたことを記録する。上限を超えても配列は伸ばさない */
export function recordAsk(reviewAsks, today) {
  const asks = Array.isArray(reviewAsks) ? reviewAsks : [];
  if (asks.includes(today) || asks.length >= MAX_ASKS) return asks;
  return [...asks, today];
}
