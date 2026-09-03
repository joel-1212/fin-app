import type { TaskAddInput } from "@/components/TaskAddSheet";

export type TaskTemplate = TaskAddInput & { id: string };

type TaskTemplateEnvelope = { schemaVersion: 1; templates: TaskTemplate[] };

const STORAGE_KEY = "fin.task-templates";
const SCHEMA_VERSION = 1;

/**
 * 保存上限は 2026-08-19 のオーナー壁打ち（F1）で撤廃した。無料でも無制限。
 * 呼び出し側を壊さないよう関数の形だけ残してある（isPro は判定に使わない）。
 */
export function canSaveTemplate(_count: number, _isPro: boolean): boolean {
  return true;
}

/** 同名かつ同じ所要時間なら、保存は追加ではなく上書きになる（`saveTaskTemplate` と同じ判定）。 */
export function findTemplateToOverwrite(
  templates: TaskTemplate[],
  input: Pick<TaskAddInput, "name" | "min">,
): TaskTemplate | undefined {
  return templates.find((template) => template.name === input.name && template.min === input.min);
}

/** 上限撤廃後は常に保存できる。呼び出し側を壊さないよう形だけ残す。 */
export function canSaveTemplateInput(
  templates: TaskTemplate[],
  input: Pick<TaskAddInput, "name" | "min">,
  isPro: boolean,
): boolean {
  if (findTemplateToOverwrite(templates, input) !== undefined) return true;
  return canSaveTemplate(templates.length, isPro);
}

function isTaskTemplate(value: unknown): value is TaskTemplate {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  if (typeof candidate.id !== "string" || !candidate.id) return false;
  if (typeof candidate.name !== "string" || !candidate.name) return false;
  if (typeof candidate.min !== "number" || !Number.isFinite(candidate.min)) return false;
  if (typeof candidate.icon !== "string" || !candidate.icon) return false;
  if (candidate.subtasks !== undefined) {
    if (!Array.isArray(candidate.subtasks)) return false;
    if (!candidate.subtasks.every((subtask) => typeof subtask === "string")) return false;
  }
  return true;
}

function decodeTaskTemplates(raw: string): TaskTemplate[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== "object" || parsed === null) return [];
    const envelope = parsed as Record<string, unknown>;
    if (envelope.schemaVersion !== SCHEMA_VERSION) return [];
    if (!Array.isArray(envelope.templates)) return [];
    return envelope.templates.filter(isTaskTemplate);
  } catch {
    return [];
  }
}

function writeEnvelope(templates: TaskTemplate[]) {
  const envelope: TaskTemplateEnvelope = { schemaVersion: SCHEMA_VERSION, templates };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(envelope));
}

/** 破損データや未知のスキーマは、決して例外を投げず空配列に倒す。 */
export function readTaskTemplates(): TaskTemplate[] {
  try {
    if (typeof window === "undefined") return [];
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null) return [];
    return decodeTaskTemplates(raw);
  } catch {
    return [];
  }
}

function createTemplateId(): string {
  return `template-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** 同名かつ同じ所要時間のテンプレートは、複製せず上書きする。 */
export function saveTaskTemplate(input: TaskAddInput): TaskTemplate[] {
  try {
    if (typeof window === "undefined") return readTaskTemplates();
    const current = readTaskTemplates();
    const existing = current.find((template) => template.name === input.name && template.min === input.min);
    const template: TaskTemplate = {
      name: input.name,
      min: input.min,
      icon: input.icon,
      subtasks: input.subtasks,
      id: existing?.id ?? createTemplateId(),
    };
    const next = existing
      ? current.map((candidate) => (candidate.id === existing.id ? template : candidate))
      : [...current, template];
    writeEnvelope(next);
    return next;
  } catch {
    return readTaskTemplates();
  }
}

export function deleteTaskTemplate(id: string): TaskTemplate[] {
  try {
    if (typeof window === "undefined") return readTaskTemplates();
    const next = readTaskTemplates().filter((template) => template.id !== id);
    writeEnvelope(next);
    return next;
  } catch {
    return readTaskTemplates();
  }
}
