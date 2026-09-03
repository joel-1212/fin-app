"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from "react";
import {
  createEmptyTaskState,
  createSeedTaskState,
  selectTaskById,
  taskStateReducer,
  type PersistedTask,
  type PersistedTaskState,
  type TaskDraft,
} from "@/lib/task-state";
import {
  decodeTaskState,
  readTaskState,
  resetTaskState as resetStoredTaskState,
  TASK_STORAGE_KEY,
  writeTaskState,
} from "@/lib/task-storage";
import { mergeTaskStates } from "@/lib/task-merge";
import {
  getNotificationPermission,
  readNotificationsEnabled,
  syncTaskNotification,
} from "@/lib/notifications";
import { initializePurchases } from "@/lib/purchases";
import { useReviewPrompt } from "./use-review";

type HydrationStatus = "loading" | "ready" | "recovery-required";

type TaskStore = {
  state: PersistedTaskState;
  hydrated: boolean;
  storageError: string | null;
  recoveryRequired: boolean;
  recoveryMessage: string | null;
  addTask: (input: TaskDraft) => void;
  editTask: (taskId: string, input: TaskDraft) => void;
  deleteTask: (taskId: string) => void;
  startTask: (taskId: string) => void;
  pauseTask: (taskId: string) => void;
  resumeTask: (taskId: string) => void;
  completeTask: (taskId: string) => void;
  cancelTask: (taskId: string) => void;
  extendTask: (taskId: string, additionalMs: number) => void;
  clearHistory: (completedBefore?: number) => void;
  reconcileTimers: (now?: number) => void;
  getTask: (taskId: string | null) => PersistedTask | undefined;
  recoverTaskState: () => void;
  resetTaskState: () => void;
};

const TaskStoreContext = createContext<TaskStore | null>(null);

function taskId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return `custom-${crypto.randomUUID()}`;
  return `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function storageMessage(kind: "invalid" | "unsupported-schema" | "read-failed" | "write-failed") {
  if (kind === "unsupported-schema") return "\u3053\u306e\u7aef\u672b\u3067\u306f\u65b0\u3057\u3044\u30bf\u30b9\u30af\u30c7\u30fc\u30bf\u3092\u8aad\u307f\u8fbc\u3081\u307e\u305b\u3093\u3002";
  if (kind === "write-failed") return "\u30bf\u30b9\u30af\u306e\u4fdd\u5b58\u306b\u5931\u6557\u3057\u307e\u3057\u305f\u3002";
  return "\u30bf\u30b9\u30af\u30c7\u30fc\u30bf\u3092\u8aad\u307f\u8fbc\u3081\u307e\u305b\u3093\u3002";
}

export function TaskProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(taskStateReducer, undefined, () => createEmptyTaskState(0));
  const [hydrationStatus, setHydrationStatus] = useState<HydrationStatus>("loading");
  const [storageError, setStorageError] = useState<string | null>(null);
  const lastPersistedAt = useRef<number | null>(null);
  // storage リスナーを state ごとに張り直すと、その間に届いたイベントを取りこぼす。
  // 購読は据え置き、最新の state は ref から読む。
  const stateRef = useRef(state);
  stateRef.current = state;
  const notificationSyncRevision = useRef(0);
  const storageRef = useRef<Storage | null>(null);
  const runningTask = state.tasks.find((task) => task.status === "running");
  const runningTaskDeadlineAt = runningTask?.deadlineAt ?? null;
  const runningTaskId = runningTask?.id ?? "";
  const runningTaskTitle = runningTask?.title ?? "";

  useEffect(() => {
    void initializePurchases().catch(() => undefined);
  }, []);

  useEffect(() => {
    const storage = getBrowserStorage();
    if (!storage) {
      setStorageError("タスクデータを読み込めません。");
      setHydrationStatus("recovery-required");
      return;
    }

    storageRef.current = storage;
    const stored = readTaskState(storage);
    if (stored.kind === "valid") {
      lastPersistedAt.current = stored.state.savedAt;
      dispatch({ type: "hydrate", state: taskStateReducer(stored.state, { type: "reconcile", now: Date.now() }) });
      setHydrationStatus("ready");
      return;
    }
    if (stored.kind === "unreadable") {
      setStorageError(storageMessage(stored.reason));
      setHydrationStatus("recovery-required");
      return;
    }

    const seed = createSeedTaskState(Date.now());
    const result = writeTaskState(storage, seed);
    if (result.ok) lastPersistedAt.current = seed.savedAt;
    dispatch({ type: "hydrate", state: taskStateReducer(seed, { type: "reconcile", now: Date.now() }) });
    if (!result.ok) setStorageError(storageMessage(result.reason));
    setHydrationStatus("ready");
  }, []);

  useEffect(() => {
    const revision = ++notificationSyncRevision.current;
    if (hydrationStatus !== "ready") return;

    void (async () => {
      const cancel = () => syncTaskNotification({ deadlineAt: null, taskId: "", title: "" });
      if (!readNotificationsEnabled()) {
        await cancel();
        return;
      }

      const permission = await getNotificationPermission();
      if (revision !== notificationSyncRevision.current) return;
      if (permission !== "granted") {
        await cancel();
        return;
      }

      await syncTaskNotification({
        deadlineAt: runningTaskDeadlineAt,
        taskId: runningTaskId,
        title: runningTaskTitle,
      });
    })();
  }, [hydrationStatus, runningTaskDeadlineAt, runningTaskId, runningTaskTitle]);

  useEffect(() => {
    if (hydrationStatus !== "ready" || lastPersistedAt.current === state.savedAt) return;
    const storage = storageRef.current;
    if (!storage) {
      setStorageError(storageMessage("write-failed"));
      return;
    }
    const result = writeTaskState(storage, state);
    if (result.ok) {
      lastPersistedAt.current = state.savedAt;
      setStorageError(null);
    } else {
      setStorageError(storageMessage(result.reason));
    }
  }, [hydrationStatus, state]);

  useEffect(() => {
    if (hydrationStatus !== "ready") return;
    const onStorage = (event: StorageEvent) => {
      if (event.key !== TASK_STORAGE_KEY || event.newValue === null) return;
      const decoded = decodeTaskState(event.newValue);
      if (!decoded.ok) return;

      // 古い到着も捨てない。捨てると相手の変更は次のローカル編集で黙って消える。
      const merged = mergeTaskStates(stateRef.current, decoded.state);
      // 受信そのままなら書き戻す必要はない。savedAt を持ち主として記録して保存を止める。
      if (!merged.changedFromIncoming) lastPersistedAt.current = merged.state.savedAt;
      dispatch({ type: "hydrate", state: taskStateReducer(merged.state, { type: "reconcile", now: Date.now() }) });
      setStorageError(null);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [hydrationStatus]);

  const addTask = useCallback((input: TaskDraft) => dispatch({ type: "add", id: taskId(), input, now: Date.now() }), []);
  const editTask = useCallback((taskId: string, input: TaskDraft) => dispatch({ type: "edit", taskId, input, now: Date.now() }), []);
  const deleteTask = useCallback((taskId: string) => dispatch({ type: "delete", taskId, now: Date.now() }), []);
  const startTask = useCallback((taskId: string) => dispatch({ type: "start", taskId, now: Date.now() }), []);
  const pauseTask = useCallback((taskId: string) => dispatch({ type: "pause", taskId, now: Date.now() }), []);
  const resumeTask = useCallback((taskId: string) => dispatch({ type: "resume", taskId, now: Date.now() }), []);
  const completeTask = useCallback((taskId: string) => dispatch({ type: "complete", taskId, now: Date.now(), reason: "manual" }), []);
  const cancelTask = useCallback((taskId: string) => dispatch({ type: "cancel", taskId, now: Date.now() }), []);
  const extendTask = useCallback((taskId: string, additionalMs: number) => dispatch({ type: "extend", taskId, additionalMs, now: Date.now() }), []);
  const clearHistory = useCallback(
    (completedBefore?: number) => dispatch({ type: "clearHistory", completedBefore, now: Date.now() }),
    [],
  );
  const reconcileTimers = useCallback((now = Date.now()) => dispatch({ type: "reconcile", now }), []);

  useEffect(() => {
    if (hydrationStatus !== "ready") return;
    const reconcile = () => reconcileTimers();
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") reconcile();
    };

    reconcile();
    window.addEventListener("focus", reconcile);
    document.addEventListener("visibilitychange", onVisibilityChange);
    const timer = state.activeTaskId === null ? null : window.setInterval(reconcile, 1_000);

    return () => {
      window.removeEventListener("focus", reconcile);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      if (timer !== null) window.clearInterval(timer);
    };
  }, [hydrationStatus, reconcileTimers, state.activeTaskId]);
  const recoverTaskState = useCallback(() => {
    const storage = storageRef.current ?? getBrowserStorage();
    if (!storage) {
      setStorageError("新しいタスク状態をこの端末に保存できません。");
      return;
    }

    const seed = createSeedTaskState(Date.now());
    const result = resetStoredTaskState(storage, seed, seed.savedAt);
    if (!result.ok) {
      setStorageError(storageMessage(result.reason));
      return;
    }
    storageRef.current = storage;
    lastPersistedAt.current = seed.savedAt;
    dispatch({ type: "hydrate", state: seed });
    setStorageError(null);
    setHydrationStatus("ready");
  }, []);

  // レビュー依頼。全画面が通るのはここだけなので、画面ごとに置かない。
  // 出す条件は lib/review-prompt.mjs、保存は自分のキー（app/use-review.ts の冒頭に理由）。
  useReviewPrompt(state.tasks, hydrationStatus === "ready");

  const store = useMemo<TaskStore>(
    () => ({
      state,
      hydrated: hydrationStatus !== "loading",
      storageError,
      recoveryRequired: hydrationStatus === "recovery-required",
      recoveryMessage: hydrationStatus === "recovery-required" ? storageError : null,
      addTask,
      editTask,
      deleteTask,
      startTask,
      pauseTask,
      resumeTask,
      completeTask,
      cancelTask,
      extendTask,
      clearHistory,
      reconcileTimers,
      getTask: (taskId) => selectTaskById(state, taskId),
      recoverTaskState,
      resetTaskState: recoverTaskState,
    }),
    [addTask, cancelTask, clearHistory, completeTask, deleteTask, editTask, extendTask, hydrationStatus, pauseTask, reconcileTimers, recoverTaskState, resumeTask, startTask, state, storageError],
  );

  return (
    <TaskStoreContext.Provider value={store}>
      {storageError && hydrationStatus === "ready" && (
        <p
          role="alert"
          style={{
            background: "var(--sheet)",
            color: "var(--fg)",
            left: 16,
            margin: 0,
            padding: "10px 14px",
            position: "fixed",
            right: 16,
            textAlign: "center",
            top: 16,
            zIndex: 100,
          }}
        >
          {storageError}
        </p>
      )}
      {children}
    </TaskStoreContext.Provider>
  );
}

export function useTaskStore(): TaskStore {
  const store = useContext(TaskStoreContext);
  if (!store) throw new Error("useTaskStore must be used inside TaskProvider");
  return store;
}

function getBrowserStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
