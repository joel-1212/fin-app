import assert from "node:assert/strict";
import test from "node:test";
import {
  formatFinishAt,
  selectOverallFinishAt,
  selectTaskRemainingMs,
  selectTotalRemainingMs,
} from "./task-time.ts";
import { isPlannedAfterToday } from "./task-state.ts";

const baseState = {
  schemaVersion: 1,
  savedAt: 1,
  activeTaskId: "running",
  tasks: [
    {
      id: "running", title: "実行中", icon: "timer", estimateMs: 60_000, subtasks: [], order: 0,
      status: "running", createdAt: 1, startedAt: 1, runStartedAt: 1, deadlineAt: 61_000,
      remainingMsAtPause: null, accumulatedActiveMs: 0, completedAt: null, completionReason: null,
    },
    {
      id: "paused", title: "一時停止", icon: "timer", estimateMs: 60_000, subtasks: [], order: 1,
      status: "paused", createdAt: 1, startedAt: 1, runStartedAt: null, deadlineAt: null,
      remainingMsAtPause: 20_000, accumulatedActiveMs: 40_000, completedAt: null, completionReason: null,
    },
    {
      id: "idle", title: "未開始", icon: "timer", estimateMs: 30_000, subtasks: [], order: 2,
      status: "idle", createdAt: 1, startedAt: null, runStartedAt: null, deadlineAt: null,
      remainingMsAtPause: null, accumulatedActiveMs: 0, completedAt: null, completionReason: null,
    },
    {
      id: "complete", title: "完了", icon: "timer", estimateMs: 30_000, subtasks: [], order: 3,
      status: "completed", createdAt: 1, startedAt: 1, runStartedAt: null, deadlineAt: null,
      remainingMsAtPause: null, accumulatedActiveMs: 10_000, completedAt: 11_000, completionReason: "manual",
    },
  ],
};

test("remaining time is derived from the absolute deadline and clamps at zero", () => {
  const running = baseState.tasks[0];
  assert.equal(selectTaskRemainingMs(running, 31_000), 30_000);
  assert.equal(selectTaskRemainingMs(running, 99_000), 0);
});

test("overall finish totals running, paused, and idle remaining time from the current clock", () => {
  assert.equal(selectOverallFinishAt(baseState, 31_000), 111_000);
});

test("finish labels include the next day instead of wrapping past midnight", () => {
  const now = new Date(2026, 7, 3, 23, 50).getTime();
  const finish = new Date(2026, 7, 4, 0, 20).getTime();
  assert.equal(formatFinishAt(finish, now), "翌日 0:20");
});

// ---- 明日に置いたタスクは今日の合計に入れない（F3 の要） ----

const TONIGHT = new Date(2026, 7, 19, 23, 0).getTime(); // 2026-08-19 23:00 ローカル
const NEXT_MORNING = new Date(2026, 7, 20, 8, 0).getTime(); // 2026-08-20 08:00 ローカル

const stateWithTomorrow = {
  schemaVersion: 2,
  savedAt: 1,
  activeTaskId: null,
  tasks: [
    {
      id: "today", title: "今日のぶん", icon: "timer", estimateMs: 30 * 60_000, subtasks: [], order: 0,
      status: "idle", createdAt: 1, startedAt: null, runStartedAt: null, deadlineAt: null,
      remainingMsAtPause: null, accumulatedActiveMs: 0, completedAt: null, completionReason: null,
    },
    {
      id: "tomorrow", title: "明日のぶん", icon: "mail", estimateMs: 60 * 60_000, subtasks: [], order: 1,
      plannedFor: "2026-08-20",
      status: "idle", createdAt: 1, startedAt: null, runStartedAt: null, deadlineAt: null,
      remainingMsAtPause: null, accumulatedActiveMs: 0, completedAt: null, completionReason: null,
    },
  ],
};

test("明日に置いたタスクは今日の残り時間と終わる時刻に入らない", () => {
  assert.equal(selectTotalRemainingMs(stateWithTomorrow, TONIGHT), 30 * 60_000);
  assert.equal(selectOverallFinishAt(stateWithTomorrow, TONIGHT), TONIGHT + 30 * 60_000);
});

test("日付が変わればそのタスクも合計に入る", () => {
  assert.equal(selectTotalRemainingMs(stateWithTomorrow, NEXT_MORNING), 90 * 60_000);
});

test("task-time 内の写しの判定式は task-state の isPlannedAfterToday と一致する", () => {
  // 境界の両側で突き合わせる。ここが割れたら、どちらかの式が腐っている。
  const tomorrowTask = stateWithTomorrow.tasks[1];
  assert.equal(isPlannedAfterToday(tomorrowTask, TONIGHT), true);
  assert.equal(selectTotalRemainingMs(stateWithTomorrow, TONIGHT) < 90 * 60_000, true);
  assert.equal(isPlannedAfterToday(tomorrowTask, NEXT_MORNING), false);
  assert.equal(selectTotalRemainingMs(stateWithTomorrow, NEXT_MORNING), 90 * 60_000);
});
