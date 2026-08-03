import assert from "node:assert/strict";
import test from "node:test";
import { createEmptyTaskState, taskStateReducer } from "./task-state.ts";

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

test("deadline reconciliation completes once at the deadline even if it races with manual completion", () => {
  let state = taskStateReducer(stateWithTask(), { type: "start", taskId: "task", now: 1_000 });
  state = taskStateReducer(state, { type: "reconcile", now: 11_000 });
  const afterElapsed = state.tasks[0];

  assert.equal(afterElapsed.status, "completed");
  assert.equal(afterElapsed.completedAt, 11_000);
  assert.equal(afterElapsed.completionReason, "elapsed");
  assert.equal(afterElapsed.accumulatedActiveMs, 10_000);

  const afterManualRace = taskStateReducer(state, { type: "complete", taskId: "task", now: 11_000, reason: "manual" });
  assert.equal(afterManualRace, state);
});

test("editing a paused task's estimate below the elapsed time completes it immediately instead of self-completing on resume", () => {
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

  assert.equal(state.tasks[0].status, "completed");
  assert.equal(state.tasks[0].completionReason, "elapsed");
  assert.equal(state.tasks[0].completedAt, 11 * 60_000);
  assert.equal(state.tasks[0].remainingMsAtPause, null);
  assert.equal(state.tasks[0].runStartedAt, null);
  assert.equal(state.tasks[0].deadlineAt, null);
  assert.equal(state.activeTaskId, null);

  const afterResume = taskStateReducer(state, { type: "resume", taskId: "task", now: 12 * 60_000 });
  assert.equal(afterResume, state);
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
