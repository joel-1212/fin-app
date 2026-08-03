import { migrateTaskState, type PersistedTaskStateV1, type TaskStateParseResult } from "@/lib/task-state";

export const TASK_STORAGE_KEY = "fin.task-state";
const CORRUPT_TASK_STORAGE_PREFIX = "fin.task-state.corrupt-";

export type TaskStorage = Pick<Storage, "getItem" | "setItem">;

export type TaskStorageReadResult =
  | { kind: "missing" }
  | { kind: "valid"; state: PersistedTaskStateV1 }
  | { kind: "unreadable"; reason: "invalid" | "unsupported-schema" | "read-failed" };

export type TaskStorageWriteResult = { ok: true } | { ok: false; reason: "write-failed" };

export function decodeTaskState(raw: string): TaskStateParseResult {
  try {
    return migrateTaskState(JSON.parse(raw) as unknown);
  } catch {
    return { ok: false, reason: "invalid" };
  }
}

/** Reading deliberately does not repair or replace an unreadable existing value. */
export function readTaskState(storage: TaskStorage): TaskStorageReadResult {
  let raw: string | null;
  try {
    raw = storage.getItem(TASK_STORAGE_KEY);
  } catch {
    return { kind: "unreadable", reason: "read-failed" };
  }
  if (raw === null) return { kind: "missing" };

  const decoded = decodeTaskState(raw);
  return decoded.ok ? { kind: "valid", state: decoded.state } : { kind: "unreadable", reason: decoded.reason };
}

export function writeTaskState(storage: TaskStorage, state: PersistedTaskStateV1): TaskStorageWriteResult {
  try {
    storage.setItem(TASK_STORAGE_KEY, JSON.stringify(state));
    return { ok: true };
  } catch {
    return { ok: false, reason: "write-failed" };
  }
}

/** A user-initiated recovery preserves the unreadable source before replacing it. */
export function resetTaskState(
  storage: TaskStorage,
  state: PersistedTaskStateV1,
  now = Date.now(),
): TaskStorageWriteResult {
  try {
    const raw = storage.getItem(TASK_STORAGE_KEY);
    if (raw !== null) storage.setItem(`${CORRUPT_TASK_STORAGE_PREFIX}${now}`, raw);
  } catch {
    // Best-effort only: a failed backup (e.g. quota exhausted) must not block writing the fresh state.
  }
  try {
    storage.setItem(TASK_STORAGE_KEY, JSON.stringify(state));
    return { ok: true };
  } catch {
    return { ok: false, reason: "write-failed" };
  }
}
