import type { PersistedTaskStateV1 } from "@/lib/task-state";

export type TaskNameSuggestionOptions = {
  query?: string;
  limit?: number;
};

const DEFAULT_LIMIT = 6;

/**
 * 「よく使うタスク名」を検索履歴のように提示するための純粋セレクタ。
 * 専用のストレージは持たず、既存のタスク一覧から重複を除いて並べ替えるだけ。
 */
export function selectTaskNameSuggestions(
  state: PersistedTaskStateV1,
  { query = "", limit = DEFAULT_LIMIT }: TaskNameSuggestionOptions = {},
): string[] {
  const normalizedQuery = query.trim().toLowerCase();

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
    .filter((entry) => entry.title.toLowerCase() !== normalizedQuery)
    .filter((entry) => normalizedQuery === "" || entry.title.toLowerCase().includes(normalizedQuery))
    .sort((a, b) => b.recency - a.recency)
    .slice(0, limit)
    .map((entry) => entry.title);
}
