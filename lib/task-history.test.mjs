import assert from "node:assert/strict";
import test from "node:test";
import { selectTaskNameSuggestions } from "./task-history.ts";

let nextId = 0;

function makeTask(overrides) {
  nextId += 1;
  return {
    id: `t${nextId}`,
    title: "",
    icon: "checklist",
    estimateMs: 10 * 60_000,
    subtasks: [],
    order: nextId,
    status: "idle",
    createdAt: 0,
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

function makeState(tasks) {
  return { schemaVersion: 1, savedAt: 0, tasks, activeTaskId: null };
}

test("同じ名前が複数回使われていても1件だけ返る", () => {
  const state = makeState([
    makeTask({ title: "筋トレ", createdAt: 10 }),
    makeTask({ title: "筋トレ", createdAt: 20 }),
    makeTask({ title: "筋トレ", createdAt: 30 }),
  ]);

  assert.deepEqual(selectTaskNameSuggestions(state), ["筋トレ"]);
});

test("completedAtがあればcreatedAtより優先して新しさを判定する", () => {
  const state = makeState([
    // createdAtは新しいがcompletedAtがない（未完了）タスク
    makeTask({ title: "洗濯を回す", createdAt: 100, completedAt: null }),
    // createdAtは古いがcompletedAtが最も新しいタスク
    makeTask({ title: "週報を書く", createdAt: 10, completedAt: 200 }),
  ]);

  assert.deepEqual(selectTaskNameSuggestions(state), ["週報を書く", "洗濯を回す"]);
});

test("新しさの順に並ぶ", () => {
  const state = makeState([
    makeTask({ title: "郵便を出す", createdAt: 10 }),
    makeTask({ title: "洗濯を回す", createdAt: 30 }),
    makeTask({ title: "週報を書く", createdAt: 20 }),
  ]);

  assert.deepEqual(selectTaskNameSuggestions(state), ["洗濯を回す", "週報を書く", "郵便を出す"]);
});

test("大文字小文字違いは同一視し、最新の表記を返す", () => {
  const state = makeState([
    makeTask({ title: "abc", createdAt: 10 }),
    makeTask({ title: "ABC", createdAt: 20 }),
  ]);

  const result = selectTaskNameSuggestions(state);
  assert.deepEqual(result, ["ABC"]);
});

test("大文字小文字を無視してqueryに一致するものを返す", () => {
  const state = makeState([
    makeTask({ title: "Push Ups", createdAt: 10 }),
    makeTask({ title: "洗濯を回す", createdAt: 20 }),
  ]);

  assert.deepEqual(selectTaskNameSuggestions(state, { query: "push" }), ["Push Ups"]);
});

test("queryは部分一致で絞り込む", () => {
  const state = makeState([
    makeTask({ title: "筋トレ", createdAt: 10 }),
    makeTask({ title: "洗濯を回す", createdAt: 20 }),
    makeTask({ title: "週報を書く", createdAt: 30 }),
  ]);

  assert.deepEqual(selectTaskNameSuggestions(state, { query: "を" }), ["週報を書く", "洗濯を回す"]);
});

test("queryが空文字なら絞り込まず最新順を返す", () => {
  const state = makeState([
    makeTask({ title: "筋トレ", createdAt: 10 }),
    makeTask({ title: "洗濯を回す", createdAt: 20 }),
  ]);

  assert.deepEqual(selectTaskNameSuggestions(state, { query: "" }), ["洗濯を回す", "筋トレ"]);
});

test("queryと完全一致するタイトルは除外する", () => {
  const state = makeState([
    makeTask({ title: "筋トレ", createdAt: 10 }),
    makeTask({ title: "筋トレする", createdAt: 20 }),
  ]);

  assert.deepEqual(selectTaskNameSuggestions(state, { query: "筋トレ" }), ["筋トレする"]);
});

test("queryと大文字小文字違いで完全一致するタイトルも除外する", () => {
  const state = makeState([makeTask({ title: "ABC", createdAt: 10 })]);

  assert.deepEqual(selectTaskNameSuggestions(state, { query: "abc" }), []);
});

test("limitで件数を制限し、デフォルトは6件", () => {
  const state = makeState(
    Array.from({ length: 10 }, (_, index) => makeTask({ title: `タスク${index}`, createdAt: index })),
  );

  assert.equal(selectTaskNameSuggestions(state).length, 6);
  assert.equal(selectTaskNameSuggestions(state, { limit: 3 }).length, 3);
  // limitはデフォルトのまま最新順で先頭から切る
  assert.deepEqual(selectTaskNameSuggestions(state, { limit: 2 }), ["タスク9", "タスク8"]);
});

test("タイトルが空白のみのタスクは無視する", () => {
  const state = makeState([makeTask({ title: "   ", createdAt: 10 }), makeTask({ title: "筋トレ", createdAt: 20 })]);

  assert.deepEqual(selectTaskNameSuggestions(state), ["筋トレ"]);
});
