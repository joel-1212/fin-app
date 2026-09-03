import assert from "node:assert/strict";
import test from "node:test";
import {
  createEmptyTaskState,
  isPlannedAfterToday,
  localDateString,
  migrateTaskState,
  nextLocalDateString,
  selectTodayIncompleteTasks,
  selectTomorrowTasks,
  taskStateReducer,
  validateTaskState,
} from "./task-state.ts";

function stateWithTask() {
  let state = createEmptyTaskState(0);
  state = taskStateReducer(state, {
    type: "add",
    id: "task",
    input: { title: "短いタスク", icon: "timer", estimateMs: 10_000 },
    now: 1,
  });
  return state;
}

test("editing keeps the task identity and insertion order while replacing its editable fields", () => {
  const state = taskStateReducer(stateWithTask(), {
    type: "edit",
    taskId: "task",
    input: { title: "編集したタスク", icon: "description", estimateMs: 20_000, subtasks: ["準備", "確認"] },
    now: 2_000,
  });

  assert.equal(state.tasks.length, 1);
  assert.equal(state.tasks[0].id, "task");
  assert.equal(state.tasks[0].title, "編集したタスク");
  assert.equal(state.tasks[0].icon, "description");
  assert.equal(state.tasks[0].estimateMs, 20_000);
  assert.deepEqual(state.tasks[0].subtasks, ["準備", "確認"]);
  assert.equal(state.tasks[0].order, 0);
  assert.equal(state.tasks[0].status, "idle");
});

test("editing a running task carries elapsed work into a fresh absolute deadline", () => {
  let state = taskStateReducer(stateWithTask(), { type: "start", taskId: "task", now: 1_000 });
  state = taskStateReducer(state, {
    type: "edit",
    taskId: "task",
    input: { title: "延長したタスク", icon: "timer", estimateMs: 20_000 },
    now: 4_000,
  });

  assert.equal(state.tasks[0].title, "延長したタスク");
  assert.equal(state.tasks[0].accumulatedActiveMs, 3_000);
  assert.equal(state.tasks[0].runStartedAt, 4_000);
  assert.equal(state.tasks[0].deadlineAt, 21_000);
  assert.equal(state.activeTaskId, "task");
});

test("deleting the running task removes it and clears the active-task invariant", () => {
  let state = taskStateReducer(stateWithTask(), { type: "start", taskId: "task", now: 1_000 });
  state = taskStateReducer(state, { type: "delete", taskId: "task", now: 2_000 });

  assert.deepEqual(state.tasks, []);
  assert.equal(state.activeTaskId, null);
});

test("pause freezes the deadline-derived remaining time and resume creates a fresh deadline", () => {
  let state = taskStateReducer(stateWithTask(), { type: "start", taskId: "task", now: 1_000 });
  state = taskStateReducer(state, { type: "pause", taskId: "task", now: 4_000 });

  assert.equal(state.tasks[0].status, "paused");
  assert.equal(state.tasks[0].remainingMsAtPause, 7_000);
  assert.equal(state.tasks[0].accumulatedActiveMs, 3_000);
  assert.equal(state.tasks[0].deadlineAt, null);

  state = taskStateReducer(state, { type: "resume", taskId: "task", now: 20_000 });
  assert.equal(state.tasks[0].status, "running");
  assert.equal(state.tasks[0].deadlineAt, 27_000);
  assert.equal(state.tasks[0].runStartedAt, 20_000);
});

test("deadline reconciliation stops the clock at the deadline and waits for the person", () => {
  let state = taskStateReducer(stateWithTask(), { type: "start", taskId: "task", now: 1_000 });
  state = taskStateReducer(state, { type: "reconcile", now: 11_000 });
  const afterElapsed = state.tasks[0];

  assert.equal(afterElapsed.status, "elapsed");
  assert.equal(afterElapsed.completedAt, null);
  assert.equal(afterElapsed.completionReason, null);
  assert.equal(afterElapsed.accumulatedActiveMs, 10_000);

  // かつてここは「自動完了済みなので手動完了は no-op」を確かめていた。
  // いま完了させられるのは本人だけなので、この操作は通らなければならない。
  const afterManual = taskStateReducer(state, { type: "complete", taskId: "task", now: 11_000, reason: "manual" });
  assert.equal(afterManual.tasks[0].status, "completed");
  assert.equal(afterManual.tasks[0].completionReason, "manual");
});

test("editing a paused task's estimate below the elapsed time leaves nothing left to run, without finishing it", () => {
  let state = createEmptyTaskState(0);
  state = taskStateReducer(state, {
    type: "add",
    id: "task",
    input: { title: "30分のタスク", icon: "timer", estimateMs: 30 * 60_000 },
    now: 1,
  });
  state = taskStateReducer(state, { type: "start", taskId: "task", now: 0 });
  state = taskStateReducer(state, { type: "pause", taskId: "task", now: 10 * 60_000 });

  assert.equal(state.tasks[0].status, "paused");
  assert.equal(state.tasks[0].accumulatedActiveMs, 10 * 60_000);

  state = taskStateReducer(state, {
    type: "edit",
    taskId: "task",
    input: { title: "30分のタスク", icon: "timer", estimateMs: 5 * 60_000 },
    now: 11 * 60_000,
  });

  // 見積もりを実測より短くしても、勝手に完了はしない。走らせる余地が 0 になるだけ。
  assert.equal(state.tasks[0].status, "paused");
  assert.equal(state.tasks[0].completionReason, null);
  assert.equal(state.tasks[0].completedAt, null);
  assert.equal(state.tasks[0].remainingMsAtPause, 0);
  assert.equal(state.tasks[0].runStartedAt, null);
  assert.equal(state.tasks[0].deadlineAt, null);
  assert.equal(state.activeTaskId, null);

  // 再開しても走る時間は残っていない。次の照合で elapsed になり、終わりの宣言を待つ。
  let afterResume = taskStateReducer(state, { type: "resume", taskId: "task", now: 12 * 60_000 });
  afterResume = taskStateReducer(afterResume, { type: "reconcile", now: 12 * 60_000 });
  assert.equal(afterResume.tasks[0].status, "elapsed");
  assert.equal(afterResume.activeTaskId, "task");
});

test("cancelling a running task returns it to idle with elapsed time discarded", () => {
  let state = taskStateReducer(stateWithTask(), { type: "start", taskId: "task", now: 1_000 });
  state = taskStateReducer(state, { type: "cancel", taskId: "task", now: 6_000 });

  assert.equal(state.tasks[0].status, "idle");
  assert.equal(state.tasks[0].accumulatedActiveMs, 0);
  assert.equal(state.tasks[0].startedAt, null);
  assert.equal(state.tasks[0].runStartedAt, null);
  assert.equal(state.tasks[0].deadlineAt, null);
  assert.equal(state.tasks[0].remainingMsAtPause, null);
  assert.equal(state.tasks[0].completedAt, null);
  assert.equal(state.tasks[0].completionReason, null);
  assert.equal(state.activeTaskId, null);
});

test("cancelling a completed task is a no-op", () => {
  let state = taskStateReducer(stateWithTask(), { type: "start", taskId: "task", now: 1_000 });
  state = taskStateReducer(state, { type: "complete", taskId: "task", now: 5_000, reason: "manual" });
  const completed = state;

  state = taskStateReducer(state, { type: "cancel", taskId: "task", now: 9_000 });

  assert.equal(state, completed);
  assert.equal(state.tasks[0].status, "completed");
});

test("cancelling one task leaves the other tasks' order and fields untouched", () => {
  let state = stateWithTask();
  state = taskStateReducer(state, {
    type: "add",
    id: "other",
    input: { title: "別のタスク", icon: "star", estimateMs: 5_000 },
    now: 2,
  });
  state = taskStateReducer(state, { type: "start", taskId: "task", now: 1_000 });

  const otherBefore = state.tasks.find((task) => task.id === "other");
  state = taskStateReducer(state, { type: "cancel", taskId: "task", now: 4_000 });

  assert.deepEqual(state.tasks.map((task) => task.id), ["task", "other"]);
  const otherAfter = state.tasks.find((task) => task.id === "other");
  assert.deepEqual(otherAfter, otherBefore);
});

function stateWithHistory() {
  let state = createEmptyTaskState(0);
  for (const [id, completedAt] of [["old", 1_000], ["recent", 5_000]]) {
    state = taskStateReducer(state, { type: "add", id, input: { title: id, icon: "timer", estimateMs: 10_000 }, now: 1 });
    state = taskStateReducer(state, { type: "start", taskId: id, now: completedAt - 100 });
    state = taskStateReducer(state, { type: "complete", taskId: id, now: completedAt, reason: "manual" });
  }
  state = taskStateReducer(state, { type: "add", id: "todo", input: { title: "残り", icon: "timer", estimateMs: 10_000 }, now: 6_000 });
  return state;
}

test("clearing history removes every completed record but leaves unfinished tasks alone", () => {
  const state = taskStateReducer(stateWithHistory(), { type: "clearHistory", now: 7_000 });

  assert.deepEqual(state.tasks.map((task) => task.id), ["todo"]);
  assert.equal(state.savedAt, 7_000);
});

test("clearing history before a cutoff keeps records completed at or after it", () => {
  const state = taskStateReducer(stateWithHistory(), { type: "clearHistory", completedBefore: 5_000, now: 7_000 });

  assert.deepEqual(state.tasks.map((task) => task.id).sort(), ["recent", "todo"]);
});

test("clearing history with nothing to remove returns the same state", () => {
  const before = stateWithTask();
  const after = taskStateReducer(before, { type: "clearHistory", now: 9_000 });

  assert.equal(after, before);
});

test("an elapsed task is a valid persisted shape and keeps the active slot", () => {
  const state = {
    schemaVersion: 2,
    savedAt: 10,
    activeTaskId: "task",
    tasks: [{
      id: "task", title: "待っているタスク", icon: "timer", estimateMs: 10_000, subtasks: [], order: 0,
      status: "elapsed", createdAt: 1, startedAt: 2, runStartedAt: null, deadlineAt: null,
      remainingMsAtPause: null, accumulatedActiveMs: 10_000, completedAt: null, completionReason: null,
    }],
  };

  assert.equal(validateTaskState(state), true);
});

test("an elapsed task that does not hold the active slot is rejected", () => {
  const state = {
    schemaVersion: 2,
    savedAt: 10,
    activeTaskId: null,
    tasks: [{
      id: "task", title: "待っているタスク", icon: "timer", estimateMs: 10_000, subtasks: [], order: 0,
      status: "elapsed", createdAt: 1, startedAt: 2, runStartedAt: null, deadlineAt: null,
      remainingMsAtPause: null, accumulatedActiveMs: 10_000, completedAt: null, completionReason: null,
    }],
  };

  assert.equal(validateTaskState(state), false);
});

test("version 1 data is adopted as version 2 without changing any task", () => {
  const v1 = {
    schemaVersion: 1,
    savedAt: 10,
    activeTaskId: null,
    tasks: [{
      id: "task", title: "古いデータ", icon: "timer", estimateMs: 10_000, subtasks: [], order: 0,
      status: "idle", createdAt: 1, startedAt: null, runStartedAt: null, deadlineAt: null,
      remainingMsAtPause: null, accumulatedActiveMs: 0, completedAt: null, completionReason: null,
    }],
  };

  const result = migrateTaskState(v1);

  assert.equal(result.ok, true);
  assert.equal(result.state.schemaVersion, 2);
  assert.deepEqual(result.state.tasks, v1.tasks);
});

test("data from a newer schema is refused rather than misread", () => {
  const result = migrateTaskState({ schemaVersion: 3, savedAt: 1, activeTaskId: null, tasks: [] });

  assert.equal(result.ok, false);
  assert.equal(result.reason, "unsupported-schema");
});

function runningTask(estimateMs = 10_000) {
  let state = createEmptyTaskState(0);
  state = taskStateReducer(state, {
    type: "add", id: "task", input: { title: "走らせるタスク", icon: "timer", estimateMs }, now: 1,
  });
  return taskStateReducer(state, { type: "start", taskId: "task", now: 1_000 });
}

test("reaching the estimate does not finish the task; the person decides that", () => {
  const state = taskStateReducer(runningTask(), { type: "reconcile", now: 11_000 });

  assert.equal(state.tasks[0].status, "elapsed");
  assert.equal(state.tasks[0].completedAt, null);
  assert.equal(state.tasks[0].completionReason, null);
});

test("an elapsed task keeps the active slot so nothing else can start behind it", () => {
  const state = taskStateReducer(runningTask(), { type: "reconcile", now: 11_000 });

  assert.equal(state.activeTaskId, "task");
});

test("time spent after the estimate ran out is not credited as work", () => {
  const state = taskStateReducer(runningTask(), { type: "reconcile", now: 11_000 + 3_600_000 });

  assert.equal(state.tasks[0].accumulatedActiveMs, 10_000);
});

test("completing an elapsed task records it as the person's own decision", () => {
  let state = taskStateReducer(runningTask(), { type: "reconcile", now: 11_000 });
  state = taskStateReducer(state, { type: "complete", taskId: "task", now: 12_000, reason: "manual" });

  assert.equal(state.tasks[0].status, "completed");
  assert.equal(state.tasks[0].completionReason, "manual");
  assert.equal(state.tasks[0].completedAt, 12_000);
  assert.equal(state.activeTaskId, null);
});

test("abandoning an elapsed task returns it to the list untouched", () => {
  let state = taskStateReducer(runningTask(), { type: "reconcile", now: 11_000 });
  state = taskStateReducer(state, { type: "cancel", taskId: "task", now: 12_000 });

  assert.equal(state.tasks[0].status, "idle");
  assert.equal(state.tasks[0].accumulatedActiveMs, 0);
  assert.equal(state.activeTaskId, null);
});

test("extending an elapsed task puts it back to work without rewriting the estimate", () => {
  let state = taskStateReducer(runningTask(10_000), { type: "reconcile", now: 11_000 });
  state = taskStateReducer(state, { type: "extend", taskId: "task", additionalMs: 5_000, now: 11_000 });

  assert.equal(state.tasks[0].status, "running");
  assert.equal(state.tasks[0].deadlineAt, 16_000);
  assert.equal(state.tasks[0].estimateMs, 10_000);
  assert.equal(state.activeTaskId, "task");
});

test("only an elapsed task can be extended", () => {
  const running = runningTask(10_000);
  const unchanged = taskStateReducer(running, { type: "extend", taskId: "task", additionalMs: 5_000, now: 2_000 });

  assert.equal(unchanged, running);
});

test("a non-positive extension is refused", () => {
  const elapsed = taskStateReducer(runningTask(10_000), { type: "reconcile", now: 11_000 });
  const unchanged = taskStateReducer(elapsed, { type: "extend", taskId: "task", additionalMs: 0, now: 11_000 });

  assert.equal(unchanged, elapsed);
});

test("actual time is recorded as it happened, even past the estimate", () => {
  // 10 秒の見積もりを 1_000 に開始 → 11_000 で時間切れ → 20 秒延長して 26_000 に完了。
  // 実測 25 秒（10 + 15）を、見積もり 10 秒で丸めずに残す。
  let state = runningTask(10_000);
  state = taskStateReducer(state, { type: "reconcile", now: 11_000 });
  state = taskStateReducer(state, { type: "extend", taskId: "task", additionalMs: 20_000, now: 11_000 });
  state = taskStateReducer(state, { type: "complete", taskId: "task", now: 26_000, reason: "manual" });

  assert.equal(state.tasks[0].estimateMs, 10_000);
  assert.equal(state.tasks[0].accumulatedActiveMs, 25_000);
});

test("pausing past the estimate keeps the real elapsed time", () => {
  let state = runningTask(10_000);
  state = taskStateReducer(state, { type: "reconcile", now: 11_000 });
  state = taskStateReducer(state, { type: "extend", taskId: "task", additionalMs: 20_000, now: 11_000 });
  state = taskStateReducer(state, { type: "pause", taskId: "task", now: 21_000 });

  assert.equal(state.tasks[0].accumulatedActiveMs, 20_000);
});

test("a task that was never started cannot be marked finished", () => {
  let state = createEmptyTaskState(0);
  state = taskStateReducer(state, {
    type: "add", id: "task", input: { title: "手つかずのタスク", icon: "timer", estimateMs: 10_000 }, now: 1,
  });

  const unchanged = taskStateReducer(state, { type: "complete", taskId: "task", now: 2_000, reason: "manual" });

  assert.equal(unchanged, state);
});

// ---- 明日タブ（plannedFor）。固定日時で検証し、実時間は待たない ----

const NIGHT = new Date(2026, 7, 19, 23, 30).getTime(); // 2026-08-19 23:30 ローカル
const AFTER_MIDNIGHT = new Date(2026, 7, 20, 0, 5).getTime(); // 2026-08-20 00:05 ローカル

function stateWithTodayAndTomorrow() {
  let state = createEmptyTaskState(NIGHT);
  state = taskStateReducer(state, {
    type: "add", id: "today-task",
    input: { title: "今日のぶん", icon: "timer", estimateMs: 10 * 60_000 },
    now: NIGHT,
  });
  state = taskStateReducer(state, {
    type: "add", id: "tomorrow-task",
    input: { title: "明日のぶん", icon: "mail", estimateMs: 20 * 60_000, plannedFor: nextLocalDateString(NIGHT) },
    now: NIGHT,
  });
  return state;
}

test("localDateString / nextLocalDateString はローカルの暦日で日をまたぐ", () => {
  assert.equal(localDateString(NIGHT), "2026-08-19");
  assert.equal(nextLocalDateString(NIGHT), "2026-08-20");
  assert.equal(localDateString(AFTER_MIDNIGHT), "2026-08-20");
  // 月またぎもカレンダーどおり。
  assert.equal(nextLocalDateString(new Date(2026, 7, 31, 12, 0).getTime()), "2026-09-01");
});

test("明日に置いたタスクだけが plannedFor を持ち、今日/明日の選択にきれいに分かれる", () => {
  const state = stateWithTodayAndTomorrow();

  assert.equal(state.tasks.find((task) => task.id === "today-task").plannedFor, undefined);
  assert.equal(state.tasks.find((task) => task.id === "tomorrow-task").plannedFor, "2026-08-20");
  assert.ok(validateTaskState(state));

  assert.deepEqual(selectTodayIncompleteTasks(state, NIGHT).map((task) => task.id), ["today-task"]);
  assert.deepEqual(selectTomorrowTasks(state, NIGHT).map((task) => task.id), ["tomorrow-task"]);
});

test("不正な形式の plannedFor は捨てて、今日のタスクとして足す", () => {
  let state = createEmptyTaskState(NIGHT);
  state = taskStateReducer(state, {
    type: "add", id: "task",
    input: { title: "形式ちがい", icon: "timer", estimateMs: 60_000, plannedFor: "あした" },
    now: NIGHT,
  });

  assert.equal(state.tasks[0].plannedFor, undefined);
});

test("明日のタスクは今日のうちは start できない", () => {
  const state = stateWithTodayAndTomorrow();
  const unchanged = taskStateReducer(state, { type: "start", taskId: "tomorrow-task", now: NIGHT });

  assert.equal(unchanged, state);
});

test("日付が変わると reconcile が明日→今日へ繰り上げる。印を外すだけで状態は idle のまま", () => {
  const state = stateWithTodayAndTomorrow();

  // まだ今日のうちは何も変えない（同じ state を返す＝保存もされない）。
  assert.equal(taskStateReducer(state, { type: "reconcile", now: NIGHT }), state);

  const promoted = taskStateReducer(state, { type: "reconcile", now: AFTER_MIDNIGHT });
  const task = promoted.tasks.find((candidate) => candidate.id === "tomorrow-task");

  assert.equal(task.plannedFor, undefined);
  // 繰り上がりは静かに起きる。開始も通知条件（running/deadline）も作らない。
  assert.equal(task.status, "idle");
  assert.equal(task.startedAt, null);
  assert.equal(task.deadlineAt, null);
  assert.equal(promoted.activeTaskId, null);
  assert.deepEqual(selectTodayIncompleteTasks(promoted, AFTER_MIDNIGHT).map((candidate) => candidate.id), ["today-task", "tomorrow-task"]);
  assert.deepEqual(selectTomorrowTasks(promoted, AFTER_MIDNIGHT), []);
  assert.ok(validateTaskState(promoted));
});

test("繰り上がったタスクは start できるようになる", () => {
  let state = stateWithTodayAndTomorrow();
  state = taskStateReducer(state, { type: "reconcile", now: AFTER_MIDNIGHT });
  state = taskStateReducer(state, { type: "start", taskId: "tomorrow-task", now: AFTER_MIDNIGHT });

  assert.equal(state.tasks.find((task) => task.id === "tomorrow-task").status, "running");
});

test("isPlannedAfterToday は日付の文字列比較で、今日以前は明日扱いしない", () => {
  assert.equal(isPlannedAfterToday({ plannedFor: "2026-08-20" }, NIGHT), true);
  assert.equal(isPlannedAfterToday({ plannedFor: "2026-08-20" }, AFTER_MIDNIGHT), false);
  assert.equal(isPlannedAfterToday({ plannedFor: "2026-08-19" }, NIGHT), false);
  assert.equal(isPlannedAfterToday({}, NIGHT), false);
});

test("validateTaskState: plannedFor が無い既存データは後方互換で有効、壊れた形式は無効", () => {
  const base = stateWithTodayAndTomorrow();
  const withoutField = {
    ...base,
    tasks: base.tasks.map(({ plannedFor: _ignored, ...task }) => task),
  };
  assert.ok(validateTaskState(withoutField));

  const broken = {
    ...base,
    tasks: base.tasks.map((task) => (task.id === "tomorrow-task" ? { ...task, plannedFor: "20260820" } : task)),
  };
  assert.equal(validateTaskState(broken), false);
});

test("編集しても置いてある日は動かない", () => {
  let state = stateWithTodayAndTomorrow();
  state = taskStateReducer(state, {
    type: "edit", taskId: "tomorrow-task",
    input: { title: "明日のぶん（編集後）", icon: "description", estimateMs: 30 * 60_000 },
    now: NIGHT,
  });

  assert.equal(state.tasks.find((task) => task.id === "tomorrow-task").plannedFor, "2026-08-20");
});
