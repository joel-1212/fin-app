"use client";

/**
 * レビュー依頼の発火。**いつ出すかは `lib/review-prompt.mjs` が決める**ので、ここは出すだけ。
 *
 * 保存を `PersistedTaskState` に足していない理由:
 * あの型は複数タブのマージ（`mergeTaskStates`）とスキーマ版の判定を通る。
 * レビューを聞いた記録はマージする価値が無く、そこに足すと**別タブの同期を壊す危険のほうが大きい**。
 * `lib/task-history.ts` の除外リストと同じく、**自分専用のキー**に置く。
 *
 * 罠対策:
 * - ネイティブ以外では何もしない（ブラウザに App Store のシートは無い）
 * - 依頼を出したことは**成否に関わらず記録する**。iOS は年3回を超えると
 *   **何も出さずに成功で返す**ので、「出なかったから記録しない」にすると毎日呼び続けることになる
 * - 完了の瞬間は、初回描画と区別する。**前回の完了数を覚えていない状態では出さない**
 *   （起動しただけで「いま終わらせた」と誤判定すると、積み残しの画面で聞くことになる）
 */
import { useEffect, useRef } from "react";
import { Capacitor } from "@capacitor/core";

import { shouldAskReview, recordAsk } from "@/lib/review-prompt.mjs";
import type { PersistedTask } from "@/lib/task-state";

export const REVIEW_ASKS_STORAGE_KEY = "fin.review-asks";

/** 依頼を出すまでの間。完了の演出と重ねると、何のダイアログか分からなくなる */
const DELAY_MS = 1800;

function readAsks(): string[] {
  try {
    const raw = window.localStorage.getItem(REVIEW_ASKS_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((day): day is string => typeof day === "string" && /^\d{4}-\d{2}-\d{2}$/.test(day));
  } catch {
    return [];
  }
}

function writeAsks(asks: string[]): void {
  try {
    window.localStorage.setItem(REVIEW_ASKS_STORAGE_KEY, JSON.stringify(asks));
  } catch {
    /* 保存できなくても画面は動かす */
  }
}

function todayKey(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function useReviewPrompt(tasks: PersistedTask[], ready: boolean): void {
  /** 前回の完了数。null は「まだ何も知らない＝起動直後」 */
  const lastCompleted = useRef<number | null>(null);
  const askedThisSession = useRef(false);

  useEffect(() => {
    if (!ready) return;

    const completed = tasks.filter((task) => task.status === "completed").length;
    const previous = lastCompleted.current;
    lastCompleted.current = completed;

    // 起動直後は比較する相手がいない。ここで出すと積み残しの画面で聞くことになる
    if (previous === null) return;
    if (completed <= previous) return;
    if (askedThisSession.current) return;
    if (!Capacitor.isNativePlatform()) return;

    const today = todayKey();
    const reviewAsks = readAsks();
    if (!shouldAskReview({ tasks, justCompleted: true, today, reviewAsks })) return;

    askedThisSession.current = true;
    const timer = setTimeout(async () => {
      // 出せたかどうかに関わらず記録する（iOS は上限超過でも成功で返すため）
      writeAsks(recordAsk(reviewAsks, today));
      try {
        const { InAppReview } = await import("@capacitor-community/in-app-review");
        await InAppReview.requestReview();
      } catch {
        // 出せなくても何も見せない。ここで失敗を伝える相手はいない
      }
    }, DELAY_MS);

    return () => clearTimeout(timer);
  }, [tasks, ready]);
}
