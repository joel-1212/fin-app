export const TASK_STATE_SCHEMA_VERSION = 1 as const;

export type TaskStatus = "idle" | "running" | "paused" | "completed";
export type CompletionReason = "manual" | "elapsed";

export type PersistedTask = {
  id: string;
  title: string;
  icon: string;
  estimateMs: number;
  subtasks: string[];
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

export type PersistedTaskStateV1 = {
  schemaVersion: typeof TASK_STATE_SCHEMA_VERSION;
  savedAt: number;
  tasks: PersistedTask[];
  activeTaskId: string | null;
};

export type TaskDraft = {
  title: string;
  icon: string;
  estimateMs: number;
  subtasks?: string[];
};

export type TaskStateAction =
  | { type: "hydrate"; state: PersistedTaskStateV1 }
  | { type: "add"; id: string; input: TaskDraft; now: number }
  | { type: "edit"; taskId: string; input: TaskDraft; now: number }
  | { type: "delete"; taskId: string; now: number }
  | { type: "start"; taskId: string; now: number }
  | { type: "pause"; taskId: string; now: number }
  | { type: "resume"; taskId: string; now: number }
  | { type: "complete"; taskId: string; now: number; reason: CompletionReason }
  | { type: "completeElapsed"; taskId: string; now: number }
  | { type: "cancel"; taskId: string; now: number }
  | { type: "reconcile"; now: number };

export type TaskStateParseResult =
  | { ok: true; state: PersistedTaskStateV1 }
  | { ok: false; reason: "invalid" | "unsupported-schema" };

const taskStatuses: ReadonlySet<string> = new Set(["idle", "running", "paused", "completed"]);
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

function isPersistedTask(value: unknown): value is PersistedTask {
  if (!isRecord(value)) return false;

  return (
    typeof value.id === "string" && value.id.length > 0 &&
    typeof value.title === "string" &&
    typeof value.icon === "string" &&
    validTimestamp(value.estimateMs) &&
    Array.isArray(value.subtasks) && value.subtasks.every((subtask) => typeof subtask === "string") &&
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
  return task.runStartedAt === null && task.deadlineAt === null && task.remainingMsAtPause === null;
}

/** Runtime validation never repairs persisted data: unreadable data must remain recoverable. */
export function validateTaskStateV1(value: unknown): value is PersistedTaskStateV1 {
  if (!isRecord(value) || value.schemaVersion !== TASK_STATE_SCHEMA_VERSION || !validTimestamp(value.savedAt)) return false;
  if (!Array.isArray(value.tasks) || !value.tasks.every(isPersistedTask)) return false;
  if (value.activeTaskId !== null && typeof value.activeTaskId !== "string") return false;

  const taskIds = new Set(value.tasks.map((task) => task.id));
  if (taskIds.size !== value.tasks.length) return false;

  const hasInvalidCompletion = value.tasks.some((task) =>
    task.status === "completed"
      ? task.completedAt === null || task.completionReason === null
      : task.completedAt !== null || task.completionReason !== null,
  );
  if (hasInvalidCompletion || value.tasks.some((task) => !hasValidTimingShape(task))) return false;

  const runningTasks = value.tasks.filter((task) => task.status === "running");
  if (runningTasks.length > 1) return false;
  if (runningTasks.length === 1 && value.activeTaskId !== runningTasks[0].id) return false;
  if (runningTasks.length === 0 && value.activeTaskId !== null) return false;
  return true;
}

/** The explicit migration boundary for future persisted task-state schemas. */
export function migrateTaskState(value: unknown): TaskStateParseResult {
  if (!isRecord(value)) return { ok: false, reason: "invalid" };
  if (typeof value.schemaVersion === "number" && value.schemaVersion > TASK_STATE_SCHEMA_VERSION) {
    return { ok: false, reason: "unsupported-schema" };
  }
  if (value.schemaVersion === TASK_STATE_SCHEMA_VERSION && validateTaskStateV1(value)) return { ok: true, state: value };
  return { ok: false, reason: "invalid" };
}

export function createEmptyTaskState(now: number): PersistedTaskStateV1 {
  return { schemaVersion: TASK_STATE_SCHEMA_VERSION, savedAt: normalizeTimestamp(now), tasks: [], activeTaskId: null };
}

export function createSeedTaskState(now: number): PersistedTaskStateV1 {
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

function nextSavedAt(state: PersistedTaskStateV1, now: number): number {
  return Math.max(normalizeTimestamp(now), state.savedAt + 1);
}

function finalize(state: PersistedTaskStateV1, tasks: PersistedTask[], activeTaskId: string | null, now: number) {
  return { ...state, savedAt: nextSavedAt(state, now), tasks, activeTaskId };
}

function activeIntervalMs(task: PersistedTask, now: number): number {
  return task.runStartedAt === null ? 0 : Math.max(0, now - task.runStartedAt);
}

function completeElapsedTask(task: PersistedTask, deadlineAt: number): PersistedTask {
  return {
    ...task,
    status: "completed",
    runStartedAt: null,
    deadlineAt: null,
    remainingMsAtPause: null,
    accumulatedActiveMs: task.estimateMs,
    completedAt: deadlineAt,
    completionReason: "elapsed",
  };
}

function completeManually(task: PersistedTask, now: number): PersistedTask {
  const accumulatedActiveMs = task.status === "running"
    ? Math.min(task.estimateMs, task.accumulatedActiveMs + activeIntervalMs(task, now))
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

export function taskStateReducer(state: PersistedTaskStateV1, action: TaskStateAction): PersistedTaskStateV1 {
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
      const task: PersistedTask = {
        id: action.id, title, icon, estimateMs,
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
        const tasks = state.tasks.map((task) => task.id === target.id ? completeElapsedTask(task, target.deadlineAt!) : task);
        return finalize(state, tasks, null, now);
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
          ? completeElapsedTask({ ...editedTask, accumulatedActiveMs: elapsedMs }, now)
          : {
            ...editedTask,
            accumulatedActiveMs: elapsedMs,
            runStartedAt: now,
            deadlineAt: now + remainingMs,
            remainingMsAtPause: null,
          };
        const tasks = state.tasks.map((task) => task.id === target.id ? replacement : task);
        return finalize(state, tasks, replacement.status === "completed" ? null : state.activeTaskId, now);
      }

      if (target.status === "paused") {
        const remainingMsAtPause = Math.max(0, estimateMs - target.accumulatedActiveMs);
        const replacement = remainingMsAtPause === 0
          ? completeElapsedTask(editedTask, now)
          : { ...editedTask, remainingMsAtPause };
        const tasks = state.tasks.map((task) => task.id === target.id ? replacement : task);
        return finalize(state, tasks, state.activeTaskId, now);
      }

      const tasks = state.tasks.map((task) => task.id === target.id ? editedTask : task);
      return finalize(state, tasks, state.activeTaskId, now);
    }
    case "delete": {
      const target = state.tasks.find((task) => task.id === action.taskId);
      if (!target) return state;
      const tasks = state.tasks.filter((task) => task.id !== action.taskId);
      return finalize(state, tasks, state.activeTaskId === action.taskId ? null : state.activeTaskId, action.now);
    }
    case "start": {
      const target = state.tasks.find((task) => task.id === action.taskId);
      if (!target || target.status !== "idle" || state.activeTaskId !== null) return state;
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
        const tasks = state.tasks.map((task) => task.id === action.taskId ? completeElapsedTask(task, target.deadlineAt!) : task);
        return finalize(state, tasks, null, now);
      }
      const remainingMsAtPause = Math.max(0, target.deadlineAt - now);
      const tasks = state.tasks.map((task) => task.id === action.taskId ? {
        ...task,
        status: "paused" as const,
        runStartedAt: null,
        deadlineAt: null,
        remainingMsAtPause,
        accumulatedActiveMs: Math.min(task.estimateMs, task.accumulatedActiveMs + activeIntervalMs(task, now)),
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
    case "completeElapsed": {
      const target = state.tasks.find((task) => task.id === action.taskId);
      const now = normalizeTimestamp(action.now);
      if (!target || target.status !== "running" || target.deadlineAt === null || target.deadlineAt > now) return state;
      const tasks = state.tasks.map((task) => task.id === action.taskId ? completeElapsedTask(task, target.deadlineAt!) : task);
      return finalize(state, tasks, null, now);
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
    case "reconcile": {
      const now = normalizeTimestamp(action.now);
      const expiredTaskIds = new Set(
        state.tasks
          .filter((task) => task.status === "running" && task.deadlineAt !== null && task.deadlineAt <= now)
          .map((task) => task.id),
      );
      if (expiredTaskIds.size === 0) return state;
      const tasks = state.tasks.map((task) => {
        if (!expiredTaskIds.has(task.id) || task.deadlineAt === null) return task;
        return completeElapsedTask(task, task.deadlineAt);
      });
      return finalize(state, tasks, null, now);
    }
    case "complete": {
      const target = state.tasks.find((task) => task.id === action.taskId);
      if (!target || target.status === "completed") return state;
      const now = normalizeTimestamp(action.now);
      if (target.status === "running" && target.deadlineAt !== null && target.deadlineAt <= now) {
        const tasks = state.tasks.map((task) => task.id === action.taskId ? completeElapsedTask(task, target.deadlineAt!) : task);
        return finalize(state, tasks, null, now);
      }
      const tasks = state.tasks.map((task) => task.id === action.taskId ? completeManually(task, now) : task);
      return finalize(state, tasks, state.activeTaskId === action.taskId ? null : state.activeTaskId, now);
    }
  }
}

export function selectTaskById(state: PersistedTaskStateV1, taskId: string | null): PersistedTask | undefined {
  return taskId === null ? undefined : state.tasks.find((task) => task.id === taskId);
}

export function selectIncompleteTasks(state: PersistedTaskStateV1): PersistedTask[] {
  return selectTasksInDisplayOrder(state).filter((task) => task.status !== "completed");
}

export function selectTasksInDisplayOrder(state: PersistedTaskStateV1): PersistedTask[] {
  return [...state.tasks].sort((left, right) => left.order - right.order);
}
