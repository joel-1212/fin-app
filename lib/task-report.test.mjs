import assert from "node:assert/strict";
import test from "node:test";
import {
  selectEstimateAdvice,
  selectHistoryByDay,
  selectTaskReport,
  selectTodaySummary,
} from "./task-report.ts";
import { createEmptyTaskState, taskStateReducer } from "./task-state.ts";

const minute = 60_000;

test("groups manual and elapsed completions by estimate duration and averages their active time", () => {
  const report = selectTaskReport({
    tasks: [
      { status: "completed", estimateMs: 10 * minute, accumulatedActiveMs: 25 * minute, completedAt: 100, completionReason: "manual" },
      { status: "completed", estimateMs: 10 * minute, accumulatedActiveMs: 10 * minute, completedAt: 200, completionReason: "elapsed" },
      { status: "completed", estimateMs: 5 * minute, accumulatedActiveMs: 4 * minute, completedAt: 300, completionReason: "manual" },
      { status: "paused", estimateMs: 10 * minute, accumulatedActiveMs: 4 * minute, completedAt: null, completionReason: null },
    ],
  });

  assert.equal(report.totalCompletedTaskCount, 3);
  assert.deepEqual(report.rows, [
    {
      estimateMinutes: 5,
      count: 1,
      averageActualMs: 4 * minute,
      averageDifferenceMs: -1 * minute,
    },
    {
      estimateMinutes: 10,
      count: 2,
      averageActualMs: 17.5 * minute,
      averageDifferenceMs: 7.5 * minute,
    },
  ]);
});

test("returns an honest empty report when no completed history exists", () => {
  assert.deepEqual(selectTaskReport({ tasks: [] }), { totalCompletedTaskCount: 0, rows: [] });
});

test("uses reducer-completed history and excludes the paused interval from actual time", () => {
  let state = createEmptyTaskState(0);
  state = taskStateReducer(state, {
    type: "add",
    id: "ten-minute",
    input: { title: "ten", icon: "timer", estimateMs: 10 * minute },
    now: 0,
  });
  state = taskStateReducer(state, {
    type: "add",
    id: "fifteen-minute",
    input: { title: "fifteen", icon: "timer", estimateMs: 15 * minute },
    now: 1,
  });

  state = taskStateReducer(state, { type: "start", taskId: "ten-minute", now: 0 });
  state = taskStateReducer(state, { type: "pause", taskId: "ten-minute", now: 2 * minute });
  state = taskStateReducer(state, { type: "resume", taskId: "ten-minute", now: 10 * minute });
  state = taskStateReducer(state, { type: "complete", taskId: "ten-minute", now: 12 * minute, reason: "manual" });

  state = taskStateReducer(state, { type: "start", taskId: "fifteen-minute", now: 12 * minute + 1 });
  state = taskStateReducer(state, { type: "completeElapsed", taskId: "fifteen-minute", now: 27 * minute + 1 });

  assert.deepEqual(selectTaskReport(state), {
    totalCompletedTaskCount: 2,
    rows: [
      { estimateMinutes: 10, count: 1, averageActualMs: 4 * minute, averageDifferenceMs: -6 * minute },
      { estimateMinutes: 15, count: 1, averageActualMs: 15 * minute, averageDifferenceMs: 0 },
    ],
  });
});

// --- 今日のまとめ / 見積もりの提案 / 日ごとの履歴 ---

function completed(overrides) {
  return {
    id: "t",
    title: "タスク",
    icon: "checklist",
    status: "completed",
    estimateMs: 10 * minute,
    accumulatedActiveMs: 10 * minute,
    completionReason: "manual",
    ...overrides,
  };
}

/** ローカル時刻で組み立てる。日境界の判定はローカル暦で行うため。 */
function at(year, month, day, hour, min) {
  return new Date(year, month - 1, day, hour, min).getTime();
}

test("today's summary splits on the local calendar day, not on elapsed hours", () => {
  const now = at(2026, 8, 3, 12, 0);
  const summary = selectTodaySummary(
    {
      tasks: [
        completed({ id: "a", completedAt: at(2026, 8, 3, 0, 1), accumulatedActiveMs: 5 * minute }),
        completed({ id: "b", completedAt: at(2026, 8, 3, 23, 59), accumulatedActiveMs: 7 * minute }),
        completed({ id: "c", completedAt: at(2026, 8, 2, 23, 59), accumulatedActiveMs: 9 * minute }),
      ],
    },
    now,
  );

  assert.equal(summary.completedCount, 2);
  assert.equal(summary.totalActiveMs, 12 * minute);
});

test("achievement rate counts unfinished tasks in the denominator and survives an empty day", () => {
  const now = at(2026, 8, 3, 12, 0);
  const summary = selectTodaySummary(
    {
      tasks: [
        completed({ id: "a", completedAt: at(2026, 8, 3, 9, 0) }),
        completed({ id: "b", completedAt: at(2026, 8, 3, 10, 0) }),
        { ...completed({ id: "c" }), status: "idle", completedAt: null, completionReason: null },
        { ...completed({ id: "d" }), status: "paused", completedAt: null, completionReason: null },
      ],
    },
    now,
  );

  assert.equal(summary.plannedCount, 4);
  assert.equal(summary.achievementRate, 0.5);
  assert.deepEqual(selectTodaySummary({ tasks: [] }, now), {
    achievementRate: 0,
    completedCount: 0,
    plannedCount: 0,
    totalActiveMs: 0,
  });
});

test("estimate advice stays quiet below the ratio and the absolute floor", () => {
  // 19% の超過。割合の閾値に届かないので黙る。
  const nearMiss = selectEstimateAdvice({
    tasks: [
      completed({ id: "a", title: "郵便", estimateMs: 100 * minute, accumulatedActiveMs: 119 * minute, completedAt: 1 }),
      completed({ id: "b", title: "郵便", estimateMs: 100 * minute, accumulatedActiveMs: 119 * minute, completedAt: 2 }),
    ],
  });
  assert.deepEqual(nearMiss, []);

  // 割合は 50% でも、ズレが 3 分未満なら黙る。
  const tinyDrift = selectEstimateAdvice({
    tasks: [
      completed({ id: "a", title: "水やり", estimateMs: 5 * minute, accumulatedActiveMs: 7 * minute, completedAt: 1 }),
      completed({ id: "b", title: "水やり", estimateMs: 5 * minute, accumulatedActiveMs: 7 * minute, completedAt: 2 }),
    ],
  });
  assert.deepEqual(tinyDrift, []);

  // 一度きりでは傾向として扱わない。
  const single = selectEstimateAdvice({
    tasks: [completed({ id: "a", title: "掃除", estimateMs: 10 * minute, accumulatedActiveMs: 30 * minute, completedAt: 1 })],
  });
  assert.deepEqual(single, []);
});

test("estimate advice rounds overruns up and underruns to the nearest five minutes", () => {
  const over = selectEstimateAdvice({
    tasks: [
      completed({ id: "a", title: "資料", estimateMs: 20 * minute, accumulatedActiveMs: 26 * minute, completedAt: 1 }),
      completed({ id: "b", title: "資料", estimateMs: 20 * minute, accumulatedActiveMs: 26 * minute, completedAt: 2 }),
    ],
  });
  assert.equal(over.length, 1);
  assert.equal(over[0].overrun, true);
  assert.equal(over[0].suggestedMs, 30 * minute);

  const under = selectEstimateAdvice({
    tasks: [
      completed({ id: "a", title: "洗濯", estimateMs: 30 * minute, accumulatedActiveMs: 21 * minute, completedAt: 1 }),
      completed({ id: "b", title: "洗濯", estimateMs: 30 * minute, accumulatedActiveMs: 21 * minute, completedAt: 2 }),
    ],
  });
  assert.equal(under.length, 1);
  assert.equal(under[0].overrun, false);
  assert.equal(under[0].suggestedMs, 20 * minute);
});

test("history groups by local day, newest first", () => {
  const history = selectHistoryByDay({
    tasks: [
      completed({ id: "a", completedAt: at(2026, 8, 1, 9, 0), accumulatedActiveMs: 5 * minute }),
      completed({ id: "b", completedAt: at(2026, 8, 3, 9, 0), accumulatedActiveMs: 6 * minute }),
      completed({ id: "c", completedAt: at(2026, 8, 3, 10, 0), accumulatedActiveMs: 4 * minute }),
    ],
  });

  assert.deepEqual(history.map((day) => day.day), ["2026-08-03", "2026-08-01"]);
  assert.equal(history[0].tasks.length, 2);
  assert.equal(history[0].totalActiveMs, 10 * minute);
});
