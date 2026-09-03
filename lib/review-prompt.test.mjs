import test from 'node:test';
import assert from 'node:assert/strict';

import {
  MAX_ASKS,
  COOLDOWN_DAYS,
  MIN_COMPLETED_DAYS,
  completedDays,
  shouldAskReview,
  recordAsk,
} from './review-prompt.mjs';

/** completedAt は epoch ミリ秒。日付の境目は端末のローカル時刻で切る */
const at = (day, hour = 12) => new Date(`${day}T${String(hour).padStart(2, '0')}:00:00`).getTime();
const done = (day, hour) => ({ id: day + hour, status: 'completed', completedAt: at(day, hour) });

const ok = () => ({
  tasks: [done('2026-08-16', 9), done('2026-08-17', 9), done('2026-08-18', 9)],
  justCompleted: true,
  today: '2026-08-18',
  reviewAsks: [],
});

test('条件がそろえば聞く', () => {
  assert.equal(shouldAskReview(ok()), true);
});

test('タスクを終わらせた直後以外は聞かない', () => {
  assert.equal(shouldAskReview({ ...ok(), justCompleted: false }), false);
});

test('終わらせたタスクが無ければ聞かない', () => {
  assert.equal(shouldAskReview({ ...ok(), tasks: [], justCompleted: true }), false);
});

test(`終わらせた日が通算 ${MIN_COMPLETED_DAYS} 日に届くまで聞かない（初日には出さない）`, () => {
  const below = { ...ok(), tasks: [done('2026-08-17', 9), done('2026-08-18', 9)] };
  assert.equal(completedDays(below.tasks), 2);
  assert.equal(shouldAskReview(below), false);
  assert.equal(shouldAskReview(ok()), true);
});

test('同じ日に何個終わらせても1日として数える', () => {
  const tasks = [done('2026-08-18', 9), done('2026-08-18', 14), done('2026-08-18', 20)];
  assert.equal(completedDays(tasks), 1);
  assert.equal(shouldAskReview({ ...ok(), tasks }), false);
});

test('まだ終わっていないタスクは数えない', () => {
  const tasks = [
    { id: 'a', status: 'running', completedAt: null },
    { id: 'b', status: 'paused', completedAt: null },
    done('2026-08-18', 9),
  ];
  assert.equal(completedDays(tasks), 1);
});

test('同じ日に2回聞かない', () => {
  assert.equal(shouldAskReview({ ...ok(), reviewAsks: ['2026-08-18'] }), false);
});

test(`生涯 ${MAX_ASKS} 回まで（iOS 側の年3回に合わせる）`, () => {
  const asks = ['2025-01-01', '2025-06-01', '2026-01-01'];
  assert.equal(asks.length, MAX_ASKS);
  assert.equal(shouldAskReview({ ...ok(), reviewAsks: asks }), false);
});

test(`前回から ${COOLDOWN_DAYS} 日空くまで聞かない`, () => {
  assert.equal(shouldAskReview({ ...ok(), reviewAsks: ['2026-05-22'] }), false); // 88日前
  assert.equal(shouldAskReview({ ...ok(), reviewAsks: ['2026-05-20'] }), true); // 90日前
});

test('聞いたことを記録する。上限を超えたら伸びない', () => {
  assert.deepEqual(recordAsk([], '2026-08-18'), ['2026-08-18']);
  assert.deepEqual(recordAsk(['2026-08-18'], '2026-08-18'), ['2026-08-18']);
  const full = ['2025-01-01', '2025-06-01', '2026-01-01'];
  assert.deepEqual(recordAsk(full, '2026-08-18'), full);
});

test('壊れた入力でも落ちない', () => {
  assert.equal(completedDays(null), 0);
  assert.equal(completedDays([{ status: 'completed', completedAt: null }]), 0);
  assert.equal(completedDays([{ status: 'completed', completedAt: Number.NaN }]), 0);
  assert.equal(shouldAskReview({ tasks: null, justCompleted: true, today: '2026-08-18' }), false);
  assert.deepEqual(recordAsk(null, '2026-08-18'), ['2026-08-18']);
});
