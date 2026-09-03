import type { PersistedTask, PersistedTaskState } from "./task-state";

function normalizedNow(now: number): number {
  return Number.isFinite(now) && now >= 0 ? Math.floor(now) : 0;
}

/** The source of truth for displayed remaining time is persisted task facts plus the current clock. */
export function selectTaskRemainingMs(task: PersistedTask, now: number): number {
  switch (task.status) {
    case "running":
      return task.deadlineAt === null ? 0 : Math.max(0, task.deadlineAt - normalizedNow(now));
    case "paused":
      return task.remainingMsAtPause ?? 0;
    case "idle":
      return task.estimateMs;
    // 見積もりの時間はもう使い切っている。延長すれば running に戻り、その分がここに出る。
    case "elapsed":
    case "completed":
      return 0;
  }
}

/**
 * 明日以降に置いたタスクは今日の残り時間に入れない（今日の「終わる時刻」を汚さない）。
 * 判定式の正本は lib/task-state.ts の isPlannedAfterToday。実行時 import を足すと
 * node --test がこのファイルを直接読むときに拡張子解決で壊れるため、式だけ写している。
 * 両者の一致は task-time.test.mjs が突き合わせで検証する。
 */
function isPlannedAfterToday(task: PersistedTask, now: number): boolean {
  if (task.plannedFor === undefined) return false;
  const date = new Date(normalizedNow(now));
  const today = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  return task.plannedFor > today;
}

export function selectTotalRemainingMs(state: PersistedTaskState, now: number): number {
  return state.tasks.reduce(
    (total, task) => (isPlannedAfterToday(task, now) ? total : total + selectTaskRemainingMs(task, now)),
    0,
  );
}

export function selectOverallFinishAt(state: PersistedTaskState, now: number): number {
  return normalizedNow(now) + selectTotalRemainingMs(state, now);
}

export function selectTaskElapsedMs(task: PersistedTask, now: number): number {
  if (task.status !== "running" || task.runStartedAt === null) return task.accumulatedActiveMs;
  return task.accumulatedActiveMs + Math.max(0, normalizedNow(now) - task.runStartedAt);
}

export function formatClockTime(timestamp: number): string {
  const date = new Date(timestamp);
  return `${date.getHours()}:${String(date.getMinutes()).padStart(2, "0")}`;
}

/** Formats in the device's local time zone without inventing a 24:xx clock value. */
export function formatFinishAt(finishAt: number, now: number): string {
  const finish = new Date(finishAt);
  const current = new Date(now);
  const finishDay = new Date(finish.getFullYear(), finish.getMonth(), finish.getDate());
  const currentDay = new Date(current.getFullYear(), current.getMonth(), current.getDate());
  const calendarDayDifference = Math.round((finishDay.getTime() - currentDay.getTime()) / 86_400_000);
  const time = formatClockTime(finishAt);

  if (calendarDayDifference <= 0) return time;
  if (calendarDayDifference === 1) return `翌日 ${time}`;
  return `${finish.getMonth() + 1}月${finish.getDate()}日 ${time}`;
}
