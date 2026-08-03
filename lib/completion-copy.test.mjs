import assert from "node:assert/strict";
import test from "node:test";
import { completionLines, pickCompletionLine } from "./completion-copy.ts";

test("picks the same completion line for the same seed", () => {
  assert.equal(pickCompletionLine(19), pickCompletionLine(19));
});

test("wraps seeds that are larger than the completion line list", () => {
  // 文言の増減で落ちないよう、添字は必ず現在の長さから決める。
  const last = completionLines.length - 1;
  assert.equal(pickCompletionLine(completionLines.length + 3), completionLines[3]);
  assert.equal(pickCompletionLine(completionLines.length * 12 + last), completionLines[last]);
});

test("provides only non-empty completion lines", () => {
  for (const line of completionLines) {
    assert.ok(line.trim().length > 0);
  }
});
