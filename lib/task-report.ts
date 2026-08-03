import type { PersistedTaskStateV1 } from "./task-state";

const MILLISECONDS_PER_MINUTE = 60_000;

export type TaskReportRow = {
  estimateMinutes: number;
  count: number;
  averageActualMs: number;
  /** Positive when actual time exceeded the estimate. */
  averageDifferenceMs: number;
};

export type TaskReport = {
  totalCompletedTaskCount: number;
  rows: TaskReportRow[];
};

export type TodaySummary = {
  /** 今日終えた件数。 */
  completedCount: number;
  /** 今日終えたぶんに実際にかかった時間の合計。 */
  totalActiveMs: number;
  /** 今日終えたぶん＋まだ残っているぶん。今日の予定の母数。 */
  plannedCount: number;
  /** 0〜1。母数が 0 のときは 0。 */
  achievementRate: number;
};

export type EstimateAdvice = {
  title: string;
  estimateMs: number;
  averageActualMs: number;
  /** 5 分単位に整えた提案値。 */
  suggestedMs: number;
  /** 実測が見積もりより長いときに true。 */
  overrun: boolean;
  completionCount: number;
};

export type HistoryTask = {
  id: string;
  title: string;
  icon: string;
  estimateMs: number;
  actualMs: number;
};

export type HistoryDay = {
  /** ローカル暦の日付キー（YYYY-MM-DD）。 */
  day: string;
  totalActiveMs: number;
  tasks: HistoryTask[];
};

/** 同名タスクが最低これだけ完了していないと、傾向として扱わない。 */
const MINIMUM_COMPLETIONS_FOR_ADVICE = 2;
/** 見積もりに対するズレがこの割合未満なら、誤差として黙っておく。 */
const ADVICE_RATIO_THRESHOLD = 0.2;
/** 割合を満たしていても、この時間未満のズレは提案するほどではない。 */
const ADVICE_ABSOLUTE_THRESHOLD_MS = 3 * MILLISECONDS_PER_MINUTE;
const ADVICE_ROUNDING_MS = 5 * MILLISECONDS_PER_MINUTE;

type ReportGroup = {
  count: number;
  totalActualMs: number;
  totalDifferenceMs: number;
};

/**
 * Summarizes persisted completed-task history. Every completed task is counted
 * once, regardless of whether it was manually or automatically completed.
 */
export function selectTaskReport(state: Pick<PersistedTaskStateV1, "tasks">): TaskReport {
  const groups = new Map<number, ReportGroup>();
  let totalCompletedTaskCount = 0;

  for (const task of state.tasks) {
    if (
      task.status !== "completed" ||
      task.completedAt === null ||
      !Number.isFinite(task.estimateMs) ||
      !Number.isFinite(task.accumulatedActiveMs)
    ) {
      continue;
    }

    const estimateMinutes = Math.max(0, Math.round(task.estimateMs / MILLISECONDS_PER_MINUTE));
    const current = groups.get(estimateMinutes) ?? { count: 0, totalActualMs: 0, totalDifferenceMs: 0 };
    current.count += 1;
    current.totalActualMs += task.accumulatedActiveMs;
    current.totalDifferenceMs += task.accumulatedActiveMs - task.estimateMs;
    groups.set(estimateMinutes, current);
    totalCompletedTaskCount += 1;
  }

  return {
    totalCompletedTaskCount,
    rows: [...groups.entries()]
      .sort(([left], [right]) => left - right)
      .map(([estimateMinutes, group]) => ({
        estimateMinutes,
        count: group.count,
        averageActualMs: group.totalActualMs / group.count,
        averageDifferenceMs: group.totalDifferenceMs / group.count,
      })),
  };
}

type CompletedTask = {
  id: string;
  title: string;
  icon: string;
  estimateMs: number;
  actualMs: number;
  completedAt: number;
};

/** 集計に使える完了タスクだけを取り出す。壊れた値はここで落とす。 */
function selectCompletedTasks(state: Pick<PersistedTaskStateV1, "tasks">): CompletedTask[] {
  const completed: CompletedTask[] = [];
  for (const task of state.tasks) {
    if (
      task.status !== "completed" ||
      typeof task.completedAt !== "number" ||
      !Number.isFinite(task.completedAt) ||
      !Number.isFinite(task.estimateMs) ||
      !Number.isFinite(task.accumulatedActiveMs)
    ) {
      continue;
    }
    completed.push({
      actualMs: task.accumulatedActiveMs,
      completedAt: task.completedAt,
      estimateMs: task.estimateMs,
      icon: task.icon,
      id: task.id,
      title: task.title,
    });
  }
  return completed;
}

/**
 * 「今日」はUTCではなく端末のローカル暦で区切る。23:59 に終えたぶんが
 * 翌日の集計へ回ってしまうと、その日を振り返る意味がなくなる。
 */
function toLocalDayKey(timestamp: number): string {
  const date = new Date(timestamp);
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function selectTodaySummary(state: Pick<PersistedTaskStateV1, "tasks">, now: number): TodaySummary {
  const today = toLocalDayKey(now);
  let completedCount = 0;
  let totalActiveMs = 0;

  for (const task of selectCompletedTasks(state)) {
    if (toLocalDayKey(task.completedAt) !== today) continue;
    completedCount += 1;
    totalActiveMs += task.actualMs;
  }

  // 未完了ぶんは「今日やる予定として残っているもの」として母数に足す。
  const remainingCount = state.tasks.filter((task) => task.status !== "completed").length;
  const plannedCount = completedCount + remainingCount;

  return {
    achievementRate: plannedCount === 0 ? 0 : completedCount / plannedCount,
    completedCount,
    plannedCount,
    totalActiveMs,
  };
}

/** 5 分単位に整える。超過ぶんは切り上げ、短縮ぶんは四捨五入で、5 分は下回らせない。 */
function roundSuggestion(averageActualMs: number, overrun: boolean): number {
  const rounded = overrun
    ? Math.ceil(averageActualMs / ADVICE_ROUNDING_MS) * ADVICE_ROUNDING_MS
    : Math.round(averageActualMs / ADVICE_ROUNDING_MS) * ADVICE_ROUNDING_MS;
  return Math.max(ADVICE_ROUNDING_MS, rounded);
}

/**
 * 同じ名前のタスクを繰り返した結果から、見積もりの直し方を提案する。
 * 一度きりのブレでは出さず、割合と絶対値の両方を満たしたものだけを返す。
 */
export function selectEstimateAdvice(state: Pick<PersistedTaskStateV1, "tasks">): EstimateAdvice[] {
  const groups = new Map<string, { count: number; totalActualMs: number; totalEstimateMs: number }>();

  for (const task of selectCompletedTasks(state)) {
    const key = task.title.trim();
    if (key === "") continue;
    const current = groups.get(key) ?? { count: 0, totalActualMs: 0, totalEstimateMs: 0 };
    current.count += 1;
    current.totalActualMs += task.actualMs;
    current.totalEstimateMs += task.estimateMs;
    groups.set(key, current);
  }

  const advice: EstimateAdvice[] = [];
  for (const [title, group] of groups) {
    if (group.count < MINIMUM_COMPLETIONS_FOR_ADVICE) continue;

    const estimateMs = group.totalEstimateMs / group.count;
    const averageActualMs = group.totalActualMs / group.count;
    const differenceMs = averageActualMs - estimateMs;
    if (estimateMs <= 0) continue;
    if (Math.abs(differenceMs) < ADVICE_ABSOLUTE_THRESHOLD_MS) continue;
    if (Math.abs(differenceMs) / estimateMs < ADVICE_RATIO_THRESHOLD) continue;

    const overrun = differenceMs > 0;
    const suggestedMs = roundSuggestion(averageActualMs, overrun);
    if (suggestedMs === estimateMs) continue;

    advice.push({ averageActualMs, completionCount: group.count, estimateMs, overrun, suggestedMs, title });
  }

  return advice.sort((left, right) => right.completionCount - left.completionCount);
}

/** 完了履歴をローカル暦の日ごとにまとめ、新しい日から順に返す。 */
export function selectHistoryByDay(state: Pick<PersistedTaskStateV1, "tasks">): HistoryDay[] {
  const days = new Map<string, HistoryDay>();

  for (const task of selectCompletedTasks(state).sort((left, right) => right.completedAt - left.completedAt)) {
    const day = toLocalDayKey(task.completedAt);
    const current = days.get(day) ?? { day, tasks: [], totalActiveMs: 0 };
    current.tasks.push({
      actualMs: task.actualMs,
      estimateMs: task.estimateMs,
      icon: task.icon,
      id: task.id,
      title: task.title,
    });
    current.totalActiveMs += task.actualMs;
    days.set(day, current);
  }

  return [...days.values()].sort((left, right) => (left.day < right.day ? 1 : -1));
}
