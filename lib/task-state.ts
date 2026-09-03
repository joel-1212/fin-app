export const TASK_STATE_SCHEMA_VERSION = 2 as const;

/** elapsed = 見積もりの時間に達したが、本人がまだ終わりを宣言していない。計時は止まっている。 */
export type TaskStatus = "idle" | "running" | "elapsed" | "paused" | "completed";
export type CompletionReason = "manual" | "elapsed";

export type PersistedTask = {
  id: string;
  title: string;
  icon: string;
  estimateMs: number;
  subtasks: string[];
  /**
   * 置いてある日（ローカル日付 "YYYY-MM-DD"）。無いときは今日のぶん。
   * 版は上げず省略可能で足してある（deletions と同じ理由）。今日以前の日付が
   * 残っていても reconcile が印を外して今日へ繰り上げるので害はない。
   */
  plannedFor?: string;
  order: number;
  status: TaskStatus;
  createdAt: number;
  startedAt: number | null;
  runStartedAt: number | null;
  deadlineAt: number | null;
  remainingMsAtPause: number | null;
  accumulatedActiveMs: number;
  completedAt: number | null;
  completionReason: CompletionReason | null;
};

/** 消したという事実。複数タブのマージで「新規」と「相手が消した」を見分けるために要る。 */
export type TaskDeletion = { id: string; deletedAt: number };

/** 消した記録を持ち続ける期間。別タブが取り込むのに足りればよく、永久に持つ必要はない。 */
export const TASK_DELETION_RETENTION_MS = 7 * 24 * 60 * 60_000;

export type PersistedTaskState = {
  schemaVersion: typeof TASK_STATE_SCHEMA_VERSION;
  savedAt: number;
  tasks: PersistedTask[];
  activeTaskId: string | null;
  /**
   * 版は上げずに省略可能で足してある。上げると、古いタブが新しい保存を
   * 「読み込めないデータ」と判定し、その場で提示される復旧＝初期化に人を誘導してしまう。
   * この形なら、古いコードは黙って無視し、新しいコードだけが使う。
   */
  deletions?: TaskDeletion[];
};

export type TaskDraft = {
  title: string;
  icon: string;
  estimateMs: number;
  subtasks?: string[];
  /** 明日以降に置くときだけ入れる（ローカル日付 "YYYY-MM-DD"）。 */
  plannedFor?: string;
};

export type TaskStateAction =
  | { type: "hydrate"; state: PersistedTaskState }
  | { type: "add"; id: string; input: TaskDraft; now: number }
  | { type: "edit"; taskId: string; input: TaskDraft; now: number }
  | { type: "delete"; taskId: string; now: number }
  | { type: "start"; taskId: string; now: number }
  | { type: "pause"; taskId: string; now: number }
  | { type: "resume"; taskId: string; now: number }
  | { type: "complete"; taskId: string; now: number; reason: CompletionReason }
  | { type: "cancel"; taskId: string; now: number }
  | { type: "extend"; taskId: string; additionalMs: number; now: number }
  | { type: "clearHistory"; now: number; completedBefore?: number }
  | { type: "reconcile"; now: number };

export type TaskStateParseResult =
  | { ok: true; state: PersistedTaskState }
  | { ok: false; reason: "invalid" | "unsupported-schema" };

const taskStatuses: ReadonlySet<string> = new Set(["idle", "running", "elapsed", "paused", "completed"]);

const PLANNED_FOR_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** ローカルの暦日 "YYYY-MM-DD"。今日/明日の境界はすべてこの文字列の比較で判定する。 */
export function localDateString(timestamp: number): string {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/** 明日のローカル日付。「明日」タブに置くタスクの plannedFor に使う。 */
export function nextLocalDateString(timestamp: number): string {
  const date = new Date(timestamp);
  date.setDate(date.getDate() + 1);
  return localDateString(date.getTime());
}

/**
 * 明日以降に置いたタスクか。ゼロ埋めした ISO 日付は文字列比較で大小が揃う。
 * この式は lib/task-time.ts にも写しがある（実行時 import を足すと node --test の
 * 直接読み込みが壊れるため）。一致は task-time.test.mjs が突き合わせで検証する。
 */
export function isPlannedAfterToday(task: Pick<PersistedTask, "plannedFor">, now: number): boolean {
  return task.plannedFor !== undefined && task.plannedFor > localDateString(now);
}
const completionReasons: ReadonlySet<CompletionReason | null> = new Set(["manual", "elapsed", null]);

const seedTasks: ReadonlyArray<Pick<PersistedTask, "id" | "title" | "icon" | "estimateMs" | "subtasks" | "order">> = [
  { id: "a", icon: "mail", title: "\u90f5\u4fbf\u3092\u51fa\u3059", estimateMs: 10 * 60_000, subtasks: [], order: 0 },
  { id: "b", icon: "local_laundry_service", title: "\u6d17\u6fef\u3092\u56de\u3059", estimateMs: 15 * 60_000, subtasks: [], order: 1 },
  { id: "c", icon: "description", title: "\u9031\u5831\u3092\u66f8\u304f", estimateMs: 45 * 60_000, subtasks: [], order: 2 },
  { id: "d", icon: "menu_book", title: "\u8ad6\u6587\u30921\u672c\u8aad\u3080", estimateMs: 60 * 60_000, subtasks: [], order: 3 },
  { id: "e", icon: "cleaning_services", title: "\u673a\u306e\u4e0a\u3092\u7247\u3065\u3051\u308b", estimateMs: 30 * 60_000, subtasks: [], order: 4 },
  { id: "f", icon: "restaurant", title: "\u5915\u98ef\u3092\u3064\u304f\u308b", estimateMs: 40 * 60_000, subtasks: [], order: 5 },
];

function validTimestamp(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function validNullableTimestamp(value: unknown): value is number | null {
  return value === null || validTimestamp(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isTaskDeletion(value: unknown): value is TaskDeletion {
  if (!isRecord(value)) return false;
  return typeof value.id === "string" && value.id !== "" && validTimestamp(value.deletedAt);
}

function isPersistedTask(value: unknown): value is PersistedTask {
  if (!isRecord(value)) return false;

  return (
    typeof value.id === "string" && value.id.length > 0 &&
    typeof value.title === "string" &&
    typeof value.icon === "string" &&
    validTimestamp(value.estimateMs) &&
    Array.isArray(value.subtasks) && value.subtasks.every((subtask) => typeof subtask === "string") &&
    (value.plannedFor === undefined || (typeof value.plannedFor === "string" && PLANNED_FOR_PATTERN.test(value.plannedFor))) &&
    Number.isInteger(value.order) &&
    typeof value.status === "string" && taskStatuses.has(value.status) &&
    validTimestamp(value.createdAt) &&
    validNullableTimestamp(value.startedAt) &&
    validNullableTimestamp(value.runStartedAt) &&
    validNullableTimestamp(value.deadlineAt) &&
    validNullableTimestamp(value.remainingMsAtPause) &&
    validTimestamp(value.accumulatedActiveMs) &&
    validNullableTimestamp(value.completedAt) &&
    completionReasons.has(value.completionReason as CompletionReason)
  );
}

function hasValidTimingShape(task: PersistedTask): boolean {
  if (task.status === "idle") {
    return task.startedAt === null && task.runStartedAt === null && task.deadlineAt === null && task.remainingMsAtPause === null && task.accumulatedActiveMs === 0;
  }
  if (task.status === "running") {
    return task.startedAt !== null && task.runStartedAt !== null && task.deadlineAt !== null && task.remainingMsAtPause === null;
  }
  if (task.status === "paused") {
    return task.startedAt !== null && task.runStartedAt === null && task.deadlineAt === null && task.remainingMsAtPause !== null;
  }
  if (task.status === "elapsed") {
    // 期限で計時を止めた状態。paused と違い残り時間は持たない（もう無い）。
    return task.startedAt !== null && task.runStartedAt === null && task.deadlineAt === null && task.remainingMsAtPause === null;
  }
  return task.runStartedAt === null && task.deadlineAt === null && task.remainingMsAtPause === null;
}

/** Runtime validation never repairs persisted data: unreadable data must remain recoverable. */
export function validateTaskState(value: unknown): value is PersistedTaskState {
  if (!isRecord(value) || value.schemaVersion !== TASK_STATE_SCHEMA_VERSION || !validTimestamp(value.savedAt)) return false;
  if (!Array.isArray(value.tasks) || !value.tasks.every(isPersistedTask)) return false;
  if (value.activeTaskId !== null && typeof value.activeTaskId !== "string") return false;
  if (value.deletions !== undefined && (!Array.isArray(value.deletions) || !value.deletions.every(isTaskDeletion))) {
    return false;
  }

  const taskIds = new Set(value.tasks.map((task) => task.id));
  if (taskIds.size !== value.tasks.length) return false;

  const hasInvalidCompletion = value.tasks.some((task) =>
    task.status === "completed"
      ? task.completedAt === null || task.completionReason === null
      : task.completedAt !== null || task.completionReason !== null,
  );
  if (hasInvalidCompletion || value.tasks.some((task) => !hasValidTimingShape(task))) return false;

  // 「進行中の1件」は running だけでなく elapsed も含む。時間切れでも、まだその1件と
  // 向き合っている最中だから。ここを running だけにすると、確認待ちの裏で別タスクを
  // 始められてしまう。
  const inFlightTasks = value.tasks.filter((task) => task.status === "running" || task.status === "elapsed");
  if (inFlightTasks.length > 1) return false;
  if (inFlightTasks.length === 1 && value.activeTaskId !== inFlightTasks[0].id) return false;
  if (inFlightTasks.length === 0 && value.activeTaskId !== null) return false;
  return true;
}

/** The explicit migration boundary for future persisted task-state schemas. */
export function migrateTaskState(value: unknown): TaskStateParseResult {
  if (!isRecord(value)) return { ok: false, reason: "invalid" };
  if (typeof value.schemaVersion === "number" && value.schemaVersion > TASK_STATE_SCHEMA_VERSION) {
    return { ok: false, reason: "unsupported-schema" };
  }
  // v1 は v2 の部分集合。elapsed が増えただけで、既存タスクの形は1バイトも変わらない。
  // だから版を上げて同じ検証にかけるだけでよい。
  if (value.schemaVersion === 1) {
    const adopted = { ...value, schemaVersion: TASK_STATE_SCHEMA_VERSION };
    return validateTaskState(adopted) ? { ok: true, state: adopted } : { ok: false, reason: "invalid" };
  }
  if (value.schemaVersion === TASK_STATE_SCHEMA_VERSION && validateTaskState(value)) return { ok: true, state: value };
  return { ok: false, reason: "invalid" };
}

export function createEmptyTaskState(now: number): PersistedTaskState {
  return { schemaVersion: TASK_STATE_SCHEMA_VERSION, savedAt: normalizeTimestamp(now), tasks: [], activeTaskId: null };
}

export function createSeedTaskState(now: number): PersistedTaskState {
  const createdAt = normalizeTimestamp(now);
  return {
    schemaVersion: TASK_STATE_SCHEMA_VERSION,
    savedAt: createdAt,
    tasks: seedTasks.map((task) => ({
      ...task,
      subtasks: [...task.subtasks],
      status: "idle",
      createdAt,
      startedAt: null,
      runStartedAt: null,
      deadlineAt: null,
      remainingMsAtPause: null,
      accumulatedActiveMs: 0,
      completedAt: null,
      completionReason: null,
    })),
    activeTaskId: null,
  };
}

function normalizeTimestamp(value: number): number {
  return Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;
}

function nextSavedAt(state: PersistedTaskState, now: number): number {
  return Math.max(normalizeTimestamp(now), state.savedAt + 1);
}

function finalize(state: PersistedTaskState, tasks: PersistedTask[], activeTaskId: string | null, now: number) {
  return { ...state, savedAt: nextSavedAt(state, now), tasks, activeTaskId };
}

/** 消えた id を墓標として残し、古すぎるものは落とす。 */
function recordDeletions(
  state: PersistedTaskState,
  removedIds: string[],
  now: number,
): TaskDeletion[] | undefined {
  if (removedIds.length === 0) return state.deletions;
  const deletedAt = normalizeTimestamp(now);
  const cutoff = deletedAt - TASK_DELETION_RETENTION_MS;
  const removed = new Set(removedIds);
  const kept = (state.deletions ?? []).filter(
    (deletion) => deletion.deletedAt >= cutoff && !removed.has(deletion.id),
  );
  return [...kept, ...removedIds.map((id) => ({ id, deletedAt }))];
}

function activeIntervalMs(task: PersistedTask, now: number): number {
  return task.runStartedAt === null ? 0 : Math.max(0, now - task.runStartedAt);
}

/**
 * 見積もりの時間に達した。ここでは完了させない —— 終わりを決めるのは人であって
 * タイマーではない（README の約束）。計時だけ止めて、本人の宣言を待つ。
 *
 * 期限より後の時間は積まない。端末を置いていた時間まで実績にすると、
 * 「20分の見積もりに実測3時間」のような記録が混ざり、見積もりアドバイスの
 * 母数が壊れるため。
 */
function elapse(task: PersistedTask, deadlineAt: number): PersistedTask {
  const workedUntilDeadline = task.runStartedAt === null ? 0 : Math.max(0, deadlineAt - task.runStartedAt);
  return {
    ...task,
    status: "elapsed",
    runStartedAt: null,
    deadlineAt: null,
    remainingMsAtPause: null,
    accumulatedActiveMs: task.accumulatedActiveMs + workedUntilDeadline,
  };
}

function completeManually(task: PersistedTask, now: number): PersistedTask {
  // 実測に上限を置かない。見積もりを超えたなら超えたと残す —— ここで丸めていたために
  // 「見積もりを増やしましょう」の助言が一度も出せなかった。
  const accumulatedActiveMs = task.status === "running"
    ? task.accumulatedActiveMs + activeIntervalMs(task, now)
    : task.accumulatedActiveMs;

  return {
    ...task,
    status: "completed",
    runStartedAt: null,
    deadlineAt: null,
    remainingMsAtPause: null,
    accumulatedActiveMs,
    completedAt: now,
    completionReason: "manual",
  };
}

export function taskStateReducer(state: PersistedTaskState, action: TaskStateAction): PersistedTaskState {
  switch (action.type) {
    case "hydrate": {
      const result = migrateTaskState(action.state);
      return result.ok ? result.state : state;
    }
    case "add": {
      const title = action.input.title.trim();
      const icon = action.input.icon.trim();
      const estimateMs = Math.floor(action.input.estimateMs);
      if (!title || !icon || !validTimestamp(estimateMs) || state.tasks.some((task) => task.id === action.id)) return state;
      const plannedFor =
        action.input.plannedFor !== undefined && PLANNED_FOR_PATTERN.test(action.input.plannedFor)
          ? action.input.plannedFor
          : undefined;
      const task: PersistedTask = {
        id: action.id, title, icon, estimateMs,
        ...(plannedFor !== undefined ? { plannedFor } : {}),
        subtasks: (action.input.subtasks ?? []).map((subtask) => subtask.trim()).filter(Boolean),
        order: state.tasks.reduce((highest, current) => Math.max(highest, current.order), -1) + 1,
        status: "idle", createdAt: normalizeTimestamp(action.now), startedAt: null, runStartedAt: null, deadlineAt: null,
        remainingMsAtPause: null, accumulatedActiveMs: 0, completedAt: null, completionReason: null,
      };
      return finalize(state, [...state.tasks, task], state.activeTaskId, action.now);
    }
    case "edit": {
      const target = state.tasks.find((task) => task.id === action.taskId);
      const title = action.input.title.trim();
      const icon = action.input.icon.trim();
      const estimateMs = Math.floor(action.input.estimateMs);
      if (!target || !title || !icon || !validTimestamp(estimateMs)) return state;

      const now = normalizeTimestamp(action.now);
      if (target.status === "running" && target.deadlineAt !== null && target.deadlineAt <= now) {
        const tasks = state.tasks.map((task) => task.id === target.id ? elapse(task, target.deadlineAt!) : task);
        return finalize(state, tasks, state.activeTaskId, now);
      }

      const editedTask = {
        ...target,
        title,
        icon,
        estimateMs,
        subtasks: (action.input.subtasks ?? []).map((subtask) => subtask.trim()).filter(Boolean),
      };

      if (target.status === "running") {
        const elapsedMs = Math.min(estimateMs, target.accumulatedActiveMs + activeIntervalMs(target, now));
        const remainingMs = Math.max(0, estimateMs - elapsedMs);
        const replacement = remainingMs === 0
          ? elapse({ ...editedTask, accumulatedActiveMs: elapsedMs, runStartedAt: null }, now)
          : {
            ...editedTask,
            accumulatedActiveMs: elapsedMs,
            runStartedAt: now,
            deadlineAt: now + remainingMs,
            remainingMsAtPause: null,
          };
        const tasks = state.tasks.map((task) => task.id === target.id ? replacement : task);
        return finalize(state, tasks, state.activeTaskId, now);
      }

      if (target.status === "paused") {
        // paused は進行中の座を持たないので elapsed にはできない（elapsed は座を要求する）。
        // 残り0の一時停止として素直に持ち、終わりの宣言は本人に委ねる。
        const remainingMsAtPause = Math.max(0, estimateMs - target.accumulatedActiveMs);
        const tasks = state.tasks.map((task) => task.id === target.id ? { ...editedTask, remainingMsAtPause } : task);
        return finalize(state, tasks, state.activeTaskId, now);
      }

      const tasks = state.tasks.map((task) => task.id === target.id ? editedTask : task);
      return finalize(state, tasks, state.activeTaskId, now);
    }
    case "delete": {
      const target = state.tasks.find((task) => task.id === action.taskId);
      if (!target) return state;
      const tasks = state.tasks.filter((task) => task.id !== action.taskId);
      const deleted = finalize(state, tasks, state.activeTaskId === action.taskId ? null : state.activeTaskId, action.now);
      return { ...deleted, deletions: recordDeletions(state, [action.taskId], action.now) };
    }
    case "start": {
      const target = state.tasks.find((task) => task.id === action.taskId);
      if (!target || target.status !== "idle" || state.activeTaskId !== null) return state;
      // 明日のぶんはまだ始めない。日付が変わって reconcile が繰り上げてから始められる。
      if (isPlannedAfterToday(target, action.now)) return state;
      const now = normalizeTimestamp(action.now);
      const tasks = state.tasks.map((task) => task.id === action.taskId ? {
        ...task,
        status: "running" as const,
        startedAt: now,
        runStartedAt: now,
        deadlineAt: now + task.estimateMs,
        remainingMsAtPause: null,
      } : task);
      return finalize(state, tasks, action.taskId, now);
    }
    case "pause": {
      const target = state.tasks.find((task) => task.id === action.taskId);
      if (!target || target.status !== "running" || target.deadlineAt === null) return state;
      const now = normalizeTimestamp(action.now);
      if (target.deadlineAt <= now) {
        const tasks = state.tasks.map((task) => task.id === action.taskId ? elapse(task, target.deadlineAt!) : task);
        return finalize(state, tasks, state.activeTaskId, now);
      }
      const remainingMsAtPause = Math.max(0, target.deadlineAt - now);
      const tasks = state.tasks.map((task) => task.id === action.taskId ? {
        ...task,
        status: "paused" as const,
        runStartedAt: null,
        deadlineAt: null,
        remainingMsAtPause,
        accumulatedActiveMs: task.accumulatedActiveMs + activeIntervalMs(task, now),
      } : task);
      return finalize(state, tasks, null, now);
    }
    case "resume": {
      const target = state.tasks.find((task) => task.id === action.taskId);
      if (!target || target.status !== "paused" || target.remainingMsAtPause === null || state.activeTaskId !== null) return state;
      const now = normalizeTimestamp(action.now);
      const remainingMsAtPause = target.remainingMsAtPause;
      const tasks = state.tasks.map((task) => task.id === action.taskId ? {
        ...task,
        status: "running" as const,
        runStartedAt: now,
        deadlineAt: now + remainingMsAtPause,
        remainingMsAtPause: null,
      } : task);
      return finalize(state, tasks, action.taskId, now);
    }
    case "cancel": {
      const target = state.tasks.find((task) => task.id === action.taskId);
      // 完了済みタスクの取り消しには使わない。実行中/一時停止中を idle に戻すだけ。
      if (!target || target.status === "completed") return state;
      const now = normalizeTimestamp(action.now);
      const tasks = state.tasks.map((task) => task.id === action.taskId ? {
        ...task,
        status: "idle" as const,
        startedAt: null,
        runStartedAt: null,
        deadlineAt: null,
        remainingMsAtPause: null,
        accumulatedActiveMs: 0,
        completedAt: null,
        completionReason: null,
      } : task);
      return finalize(state, tasks, state.activeTaskId === action.taskId ? null : state.activeTaskId, now);
    }
    case "clearHistory": {
      // 完了済みの記録だけを消す。未完了のタスク一覧には触れない。
      // completedBefore を渡すと、その時刻より前に完了した記録に限定できる
      // （「昨日までの履歴を削除」が今日のまとめを巻き添えにしないため）。
      const cutoff = action.completedBefore ?? Number.POSITIVE_INFINITY;
      const tasks = state.tasks.filter(
        (task) => task.status !== "completed" || task.completedAt === null || task.completedAt >= cutoff,
      );
      if (tasks.length === state.tasks.length) return state;
      const keptIds = new Set(tasks.map((task) => task.id));
      const removedIds = state.tasks.filter((task) => !keptIds.has(task.id)).map((task) => task.id);
      const cleared = finalize(state, tasks, state.activeTaskId, normalizeTimestamp(action.now));
      // 一括削除こそ墓標が要る。取りこぼすと、古いタブが履歴をまとめて蘇らせる。
      return { ...cleared, deletions: recordDeletions(state, removedIds, action.now) };
    }
    case "reconcile": {
      const now = normalizeTimestamp(action.now);
      const today = localDateString(now);
      // 日付が変わっていたら、明日のぶんを今日へ繰り上げる。印を外すだけで、
      // 通知や催促は出さない（オーナー承認の仕様）。
      const promotedTaskIds = new Set(
        state.tasks
          .filter((task) => task.plannedFor !== undefined && task.plannedFor <= today)
          .map((task) => task.id),
      );
      const expiredTaskIds = new Set(
        state.tasks
          .filter((task) => task.status === "running" && task.deadlineAt !== null && task.deadlineAt <= now)
          .map((task) => task.id),
      );
      if (expiredTaskIds.size === 0 && promotedTaskIds.size === 0) return state;
      const tasks = state.tasks.map((task) => {
        let next = task;
        if (promotedTaskIds.has(next.id)) {
          const { plannedFor: _promoted, ...promoted } = next;
          next = promoted;
        }
        if (expiredTaskIds.has(next.id) && next.deadlineAt !== null) {
          next = elapse(next, next.deadlineAt);
        }
        return next;
      });
      // 時間切れでも「いま向き合っている1件」であることは変わらない。座は残す。
      return finalize(state, tasks, state.activeTaskId, now);
    }
    case "extend": {
      const target = state.tasks.find((task) => task.id === action.taskId);
      const additionalMs = Math.floor(action.additionalMs);
      if (!target || target.status !== "elapsed" || !validTimestamp(additionalMs) || additionalMs <= 0) return state;
      const now = normalizeTimestamp(action.now);
      // estimateMs は動かさない。最初にそう見積もったという事実は残す。
      // 伸びるのは実測だけで、その差が「見積もりを直しませんか」の材料になる。
      const tasks = state.tasks.map((task) => task.id === action.taskId ? {
        ...task,
        status: "running" as const,
        runStartedAt: now,
        deadlineAt: now + additionalMs,
        remainingMsAtPause: null,
      } : task);
      return finalize(state, tasks, action.taskId, now);
    }
    case "complete": {
      const target = state.tasks.find((task) => task.id === action.taskId);
      // 一度も始めていないタスクは完了にしない。実測 0 分の記録が混ざると、
      // ふりかえりの平均も「見積もりを直しませんか」の判断も歪む。
      if (!target || target.status === "completed" || target.status === "idle") return state;
      const now = normalizeTimestamp(action.now);
      // 期限を過ぎた running から直接「完了」を押された場合。計時を期限で止めてから
      // 本人の完了として記録する（押した時刻までを働いたことにはしない）。
      if (target.status === "running" && target.deadlineAt !== null && target.deadlineAt <= now) {
        const stopped = elapse(target, target.deadlineAt);
        const tasks = state.tasks.map((task) => task.id === action.taskId ? completeManually(stopped, now) : task);
        return finalize(state, tasks, null, now);
      }
      const tasks = state.tasks.map((task) => task.id === action.taskId ? completeManually(task, now) : task);
      return finalize(state, tasks, state.activeTaskId === action.taskId ? null : state.activeTaskId, now);
    }
  }
}

export function selectTaskById(state: PersistedTaskState, taskId: string | null): PersistedTask | undefined {
  return taskId === null ? undefined : state.tasks.find((task) => task.id === taskId);
}

export function selectIncompleteTasks(state: PersistedTaskState): PersistedTask[] {
  return selectTasksInDisplayOrder(state).filter((task) => task.status !== "completed");
}

/** 今日のぶん（明日以降に置いたタスクを除いた未完了）。ホームの見積もり合計はこちらだけを見る。 */
export function selectTodayIncompleteTasks(state: PersistedTaskState, now: number): PersistedTask[] {
  return selectIncompleteTasks(state).filter((task) => !isPlannedAfterToday(task, now));
}

/** 明日タブに出すぶん。 */
export function selectTomorrowTasks(state: PersistedTaskState, now: number): PersistedTask[] {
  return selectIncompleteTasks(state).filter((task) => isPlannedAfterToday(task, now));
}

export function selectTasksInDisplayOrder(state: PersistedTaskState): PersistedTask[] {
  return [...state.tasks].sort((left, right) => left.order - right.order);
}
