"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTaskStore } from "@/app/providers";
import {
  nextLocalDateString,
  selectTodayIncompleteTasks,
  selectTomorrowTasks,
  type PersistedTask,
  type TaskStatus,
} from "@/lib/task-state";
import { formatClockTime, formatFinishAt, selectOverallFinishAt, selectTotalRemainingMs } from "@/lib/task-time";

export type Task = {
  id: string;
  /** Material Symbols のリガチャ名 */
  icon: string;
  name: string;
  /** 見積もり（分） */
  min: number;
  subtasks?: string[];
};

export type DerivedTask = Task & {
  done: boolean;
  status: TaskStatus;
  minLabel: string;
  /** 全体に占める割合。全画面レイアウトの帯の幅に使う */
  pct: string;
};

/** 列（今日/明日）ごとに表示用の形へ落とす。pct はその列の合計に対する割合。 */
function deriveTasks(sourceTasks: PersistedTask[]): DerivedTask[] {
  const totalEstimateMs = sourceTasks.reduce((sum, task) => sum + task.estimateMs, 0);
  return sourceTasks.map((task) => {
    const min = Math.ceil(task.estimateMs / 60_000);
    return {
      id: task.id,
      icon: task.icon,
      name: task.title,
      min,
      subtasks: task.subtasks.length > 0 ? task.subtasks : undefined,
      done: false,
      status: task.status,
      minLabel: `${min}分`,
      pct: totalEstimateMs > 0 ? `${((task.estimateMs / totalEstimateMs) * 100).toFixed(2)}%` : "0%",
    };
  });
}

/** 分数を「1時間30分」形式にする。0 のときだけ「0分」と出す */
export function formatDuration(totalMin: number): string {
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (!h && !m) return "0分";
  return `${h ? `${h}時間` : ""}${m ? `${m}分` : ""}`;
}

/** Home display values are always re-derived from the current device clock. */
export function useTasks() {
  const {
    state,
    addTask: addSharedTask,
    editTask: editSharedTask,
    deleteTask: deleteSharedTask,
    completeTask,
    hydrated,
    recoveryMessage,
    storageError,
    recoverTaskState,
    reconcileTimers,
  } = useTaskStore();
  const [now, setNow] = useState(0);

  useEffect(() => {
    const refresh = () => {
      const current = Date.now();
      setNow(current);
      reconcileTimers(current);
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") refresh();
    };

    refresh();
    const timer = window.setInterval(refresh, 30_000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [reconcileTimers]);

  const addTask = useCallback(
    (input: { name: string; min: number; icon: string; subtasks?: string[]; plannedFor?: string }) => {
      const name = input.name.trim();
      if (!name || !Number.isFinite(input.min) || input.min < 0) return;

      addSharedTask({
        title: name,
        icon: input.icon,
        estimateMs: Math.floor(input.min * 60_000),
        subtasks: input.subtasks,
        plannedFor: input.plannedFor,
      });
    },
    [addSharedTask],
  );

  const editTask = useCallback(
    (taskId: string, input: { name: string; min: number; icon: string; subtasks?: string[] }) => {
      const name = input.name.trim();
      if (!name || !Number.isFinite(input.min) || input.min < 0) return;

      editSharedTask(taskId, {
        title: name,
        icon: input.icon,
        estimateMs: Math.floor(input.min * 60_000),
        subtasks: input.subtasks,
      });
    },
    [editSharedTask],
  );

  return useMemo(() => {
    const sourceTasks = selectTodayIncompleteTasks(state, now);
    const tomorrowSourceTasks = selectTomorrowTasks(state, now);
    const totalRemainingMs = selectTotalRemainingMs(state, now);
    const remainingCount = sourceTasks.length;
    const hasPausedTask = sourceTasks.some((task) => task.status === "paused");
    const finishAt = selectOverallFinishAt(state, now);
    const finishTime = formatFinishAt(finishAt, now);
    const tasks = deriveTasks(sourceTasks);
    const tomorrowTasks = deriveTasks(tomorrowSourceTasks);
    const remainMin = Math.ceil(totalRemainingMs / 60_000);
    const tomorrowTotalMin = Math.ceil(
      tomorrowSourceTasks.reduce((sum, task) => sum + task.estimateMs, 0) / 60_000,
    );

    return {
      tasks,
      tomorrowTasks,
      /** 「明日」タブで追加するタスクに付けるローカル日付。 */
      tomorrowDate: nextLocalDateString(now),
      tomorrowTotalLabel: formatDuration(tomorrowTotalMin),
      tomorrowCount: tomorrowTasks.length,
      toggle: completeTask,
      addTask,
      editTask,
      deleteTask: deleteSharedTask,
      start: formatClockTime(now),
      end: hasPausedTask ? `今再開した場合は ${finishTime}` : finishTime,
      isPaused: hasPausedTask,
      remainMin,
      remainCount: remainingCount,
      remainLabel: formatDuration(remainMin),
      /** 全部終わったか。終了予定時刻の代わりに静かな一言を出すために使う */
      allDone: remainingCount === 0,
      hydrated,
      clockReady: now > 0,
      recoveryMessage,
      storageError,
      resetTaskState: recoverTaskState,
    };
  }, [addTask, completeTask, deleteSharedTask, editTask, hydrated, now, recoverTaskState, recoveryMessage, state, storageError]);
}
