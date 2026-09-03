// 値の import は避けて型だけにしてある。テストは node --test で .ts を直接読むので、
// 実行時 import があると拡張子まで書く羽目になり、ビルド設定に手を入れることになる。
import type { PersistedTask, PersistedTaskState, TaskDeletion } from "./task-state";

export type TaskMergeResult = {
  state: PersistedTaskState;
  /** マージ結果が受信状態と違う＝こちらから書き戻さないと相手が知らないままになる。 */
  changedFromIncoming: boolean;
};

/**
 * 別タブの保存を取り込む。
 *
 * 以前は `savedAt` の新しい側で丸ごと置き換えていた。片方のタブで足したタスクが、
 * もう片方の保存が届いた瞬間に消える。逆に `savedAt` が古い到着は捨てていたので、
 * 相手の変更は次のローカル編集で上書きされていた。どちらも黙って起きる。
 *
 * 突き合わせはタスク単位。片側にしかない id が「まだ相手が知らない新規」なのか
 * 「相手が消した」なのかは、時刻の比較では判らない —— タブは古い読み取りを土台に
 * 後から保存できるので、`createdAt` と相手の `savedAt` を比べても外れる。
 * 判るのは消した本人だけなので、削除は `deletions`（墓標）として持ち回る。
 * 墓標がない削除は「新規」と区別できないため残す側に倒す。データを消すより安全。
 */
export function mergeTaskStates(local: PersistedTaskState, incoming: PersistedTaskState): TaskMergeResult {
  const incomingIsNewer = incoming.savedAt >= local.savedAt;
  const localById = new Map(local.tasks.map((task) => [task.id, task]));
  const incomingById = new Map(incoming.tasks.map((task) => [task.id, task]));
  const deletedByLocal = new Set((local.deletions ?? []).map((deletion) => deletion.id));
  const deletedByIncoming = new Set((incoming.deletions ?? []).map((deletion) => deletion.id));
  const merged: PersistedTask[] = [];

  for (const task of local.tasks) {
    const counterpart = incomingById.get(task.id);
    if (counterpart) {
      // 両方が知っているタスク。中身の勝ち負けは、保存が新しい側に委ねる。
      merged.push(incomingIsNewer ? counterpart : task);
      continue;
    }
    if (!deletedByIncoming.has(task.id)) merged.push(task);
  }

  for (const task of incoming.tasks) {
    if (localById.has(task.id)) continue;
    if (!deletedByLocal.has(task.id)) merged.push(task);
  }

  merged.sort((a, b) => a.order - b.order || a.createdAt - b.createdAt);

  const preferredActiveId = incomingIsNewer ? incoming.activeTaskId : local.activeTaskId;
  const fallbackActiveId = incomingIsNewer ? local.activeTaskId : incoming.activeTaskId;
  const activeTaskId =
    merged.some((task) => task.id === preferredActiveId) ? preferredActiveId
    : merged.some((task) => task.id === fallbackActiveId) ? fallbackActiveId
    : null;

  const savedAt = Math.max(local.savedAt, incoming.savedAt);
  const deletions = mergeDeletions(local.deletions, incoming.deletions);
  const changedFromIncoming =
    activeTaskId !== incoming.activeTaskId ||
    merged.length !== incoming.tasks.length ||
    merged.some((task, index) => task !== incoming.tasks[index]) ||
    deletions.length !== (incoming.deletions?.length ?? 0);

  return {
    changedFromIncoming,
    state: {
      schemaVersion: incoming.schemaVersion,
      // 書き戻しが要るときだけ時刻を進める。進めないと保存側の差分検出が働かない。
      savedAt: changedFromIncoming ? savedAt + 1 : incoming.savedAt,
      tasks: merged,
      activeTaskId,
      ...(deletions.length > 0 ? { deletions } : {}),
    },
  };
}

/**
 * 墓標は足し合わせるだけで、ここでは期限切れを落とさない。
 * 落とす役は削除を記録する側（reducer）にひとつだけ置く。両側で落とすと、
 * 「片方がもう捨てた墓標」をもう片方が持ち回り、消したはずのタスクが復活する。
 */
function mergeDeletions(local: TaskDeletion[] | undefined, incoming: TaskDeletion[] | undefined): TaskDeletion[] {
  const byId = new Map<string, TaskDeletion>();
  for (const deletion of [...(local ?? []), ...(incoming ?? [])]) {
    const existing = byId.get(deletion.id);
    if (!existing || existing.deletedAt < deletion.deletedAt) byId.set(deletion.id, deletion);
  }
  return [...byId.values()].sort((a, b) => a.deletedAt - b.deletedAt);
}
