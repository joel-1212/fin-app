import assert from "node:assert/strict";
import test from "node:test";
import { mergeTaskStates } from "./task-merge.ts";
import { taskStateReducer } from "./task-state.ts";

function task(id, overrides = {}) {
  return {
    id,
    title: id,
    icon: "checklist",
    estimateMs: 600_000,
    subtasks: [],
    order: 0,
    status: "idle",
    createdAt: 1_000,
    startedAt: null,
    runStartedAt: null,
    deadlineAt: null,
    remainingMsAtPause: null,
    accumulatedActiveMs: 0,
    completedAt: null,
    completionReason: null,
    ...overrides,
  };
}

function state(savedAt, tasks, activeTaskId = null, deletions) {
  return { schemaVersion: 2, savedAt, tasks, activeTaskId, ...(deletions ? { deletions } : {}) };
}

test("両方のタブで足したタスクが、どちらも残る", () => {
  const shared = task("shared", { order: 0, createdAt: 500 });
  // 相手の savedAt の方が新しいが、相手は "mine" を土台に持っていない。
  // 時刻の比較では区別できないので、消した記録がない限り残す。
  const local = state(1_200, [shared, task("mine", { order: 1, createdAt: 1_100 })]);
  const incoming = state(1_300, [shared, task("theirs", { order: 2, createdAt: 1_250 })]);

  const merged = mergeTaskStates(local, incoming);

  assert.deepEqual(
    merged.state.tasks.map((t) => t.id),
    ["shared", "mine", "theirs"],
  );
  // ローカル分は相手が知らないので、書き戻さないと相手のタブから消えたままになる。
  assert.equal(merged.changedFromIncoming, true);
  assert.ok(merged.state.savedAt > incoming.savedAt);
});

test("相手が消したタスクは復活しない", () => {
  const local = state(1_000, [task("old", { createdAt: 100 }), task("kept", { order: 1, createdAt: 200 })]);
  const incoming = state(2_000, [task("kept", { order: 1, createdAt: 200 })], null, [
    { id: "old", deletedAt: 1_900 },
  ]);

  const merged = mergeTaskStates(local, incoming);

  assert.deepEqual(
    merged.state.tasks.map((t) => t.id),
    ["kept"],
  );
  assert.equal(merged.changedFromIncoming, false);
  assert.equal(merged.state.savedAt, incoming.savedAt);
});

test("こちらが消したタスクは、相手の古い保存が届いても復活しない", () => {
  const local = state(3_000, [task("kept", { createdAt: 100 })], null, [{ id: "gone", deletedAt: 2_900 }]);
  const incoming = state(2_000, [task("kept", { createdAt: 100 }), task("gone", { order: 1, createdAt: 200 })]);

  const merged = mergeTaskStates(local, incoming);

  assert.deepEqual(
    merged.state.tasks.map((t) => t.id),
    ["kept"],
  );
});

test("履歴の一括削除は、墓標ごと相手に伝わる", () => {
  const completed = task("done", {
    createdAt: 100,
    status: "completed",
    startedAt: 100,
    completedAt: 500,
    completionReason: "manual",
  });
  const before = state(1_000, [completed, task("kept", { order: 1, createdAt: 200 })]);

  const cleared = taskStateReducer(before, { type: "clearHistory", now: 2_000 });
  assert.deepEqual(
    cleared.tasks.map((t) => t.id),
    ["kept"],
  );
  assert.deepEqual(cleared.deletions, [{ id: "done", deletedAt: 2_000 }]);

  // 一括削除を知らない古いタブの状態が届いても、消した記録が勝つ。
  const merged = mergeTaskStates(cleared, before);
  assert.deepEqual(
    merged.state.tasks.map((t) => t.id),
    ["kept"],
  );
});

test("個別削除も墓標を残し、古い墓標は期限で落ちる", () => {
  const stale = { id: "ancient", deletedAt: 1_000 };
  const before = state(10_000, [task("a", { createdAt: 100 }), task("b", { order: 1, createdAt: 200 })], null, [stale]);

  const now = 1_000 + 7 * 24 * 60 * 60_000 + 1;
  const deleted = taskStateReducer(before, { type: "delete", taskId: "a", now });

  assert.deepEqual(
    deleted.tasks.map((t) => t.id),
    ["b"],
  );
  assert.deepEqual(deleted.deletions, [{ id: "a", deletedAt: now }]);
});

test("savedAt が古い到着でも取り込む（無視すると次の保存で相手の変更が消える）", () => {
  const shared = task("shared", { createdAt: 100 });
  const local = state(3_000, [shared]);
  const incoming = state(2_000, [shared, task("theirs", { order: 1, createdAt: 2_500 })]);

  const merged = mergeTaskStates(local, incoming);

  assert.deepEqual(
    merged.state.tasks.map((t) => t.id),
    ["shared", "theirs"],
  );
});

test("両方が知っているタスクの中身は、保存が新しい側を採る", () => {
  const local = state(1_000, [task("a", { title: "古い題", createdAt: 100 })]);
  const incoming = state(2_000, [task("a", { title: "新しい題", createdAt: 100 })]);

  assert.equal(mergeTaskStates(local, incoming).state.tasks[0].title, "新しい題");
  assert.equal(mergeTaskStates(incoming, local).state.tasks[0].title, "新しい題");
});

test("実行中の指し先が消えていれば null に落ちる", () => {
  const local = state(1_000, [task("gone", { createdAt: 100 })], "gone");
  const incoming = state(2_000, [], null, [{ id: "gone", deletedAt: 1_900 }]);

  const merged = mergeTaskStates(local, incoming);

  assert.deepEqual(merged.state.tasks, []);
  assert.equal(merged.state.activeTaskId, null);
});

test("残っているタスクを指していれば実行中の指し先は保たれる", () => {
  const running = task("running", { createdAt: 100, status: "running" });
  const local = state(2_500, [running, task("mine", { order: 1, createdAt: 2_400 })], "running");
  const incoming = state(2_000, [running], "running");

  const merged = mergeTaskStates(local, incoming);

  assert.equal(merged.state.activeTaskId, "running");
  assert.equal(merged.changedFromIncoming, true);
});
