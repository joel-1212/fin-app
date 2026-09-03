import type { PersistedTaskState } from "@/lib/task-state";

export type TaskNameSuggestionOptions = {
  query?: string;
  limit?: number;
  /** 非表示にした候補（小文字化した名前）。検索履歴の「1件ずつ消す」に使う。 */
  excluded?: string[];
};

const DEFAULT_LIMIT = 6;

export const SUGGESTION_EXCLUSIONS_STORAGE_KEY = "fin.suggestion-exclusions";

/** 保存されている非表示候補（小文字キー）を返す。読めなければ空。 */
export function readSuggestionExclusions(): string[] {
  try {
    if (typeof window === "undefined") return [];
    const raw = window.localStorage.getItem(SUGGESTION_EXCLUSIONS_STORAGE_KEY);
    if (raw === null) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry): entry is string => typeof entry === "string");
  } catch {
    return [];
  }
}

function writeSuggestionExclusions(exclusions: string[]): void {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(SUGGESTION_EXCLUSIONS_STORAGE_KEY, JSON.stringify(exclusions));
  } catch {
    // 保存に失敗しても候補が消せないだけで、アプリの利用は妨げない。
  }
}

/** 候補を1件非表示にし、保存後の一覧を返す。 */
export function addSuggestionExclusion(title: string): string[] {
  const key = title.trim().toLowerCase();
  if (key === "") return readSuggestionExclusions();
  const next = Array.from(new Set([...readSuggestionExclusions(), key]));
  writeSuggestionExclusions(next);
  return next;
}

/**
 * 非表示を解除し、保存後の一覧を返す。同じ名前のタスクをまた使い始めたときに呼ぶ。
 * 消したはずの名前が再入力された＝また候補に出てよい、という解釈。
 */
export function clearSuggestionExclusion(title: string): string[] {
  const key = title.trim().toLowerCase();
  const current = readSuggestionExclusions();
  if (!current.includes(key)) return current;
  const next = current.filter((entry) => entry !== key);
  writeSuggestionExclusions(next);
  return next;
}

/**
 * 「よく使うタスク名」を検索履歴のように提示するための純粋セレクタ。
 * 専用のストレージは持たず、既存のタスク一覧から重複を除いて並べ替えるだけ。
 */
export function selectTaskNameSuggestions(
  state: PersistedTaskState,
  { query = "", limit = DEFAULT_LIMIT, excluded = [] }: TaskNameSuggestionOptions = {},
): string[] {
  const normalizedQuery = query.trim().toLowerCase();
  const excludedKeys = new Set(excluded);

  // 大文字小文字違いの同名タスクは1件にまとめ、最も新しい表記を残す。
  const latestByKey = new Map<string, { title: string; recency: number }>();
  for (const task of state.tasks) {
    const title = task.title.trim();
    if (!title) continue;

    const key = title.toLowerCase();
    const recency = task.completedAt ?? task.createdAt;
    const existing = latestByKey.get(key);
    if (!existing || recency > existing.recency) {
      latestByKey.set(key, { title, recency });
    }
  }

  return Array.from(latestByKey.values())
    .filter((entry) => !excludedKeys.has(entry.title.toLowerCase()))
    .filter((entry) => entry.title.toLowerCase() !== normalizedQuery)
    .filter((entry) => normalizedQuery === "" || entry.title.toLowerCase().includes(normalizedQuery))
    .sort((a, b) => b.recency - a.recency)
    .slice(0, limit)
    .map((entry) => entry.title);
}
