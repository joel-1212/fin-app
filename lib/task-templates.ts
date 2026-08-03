import type { TaskAddInput } from "@/components/TaskAddSheet";

export type TaskTemplate = TaskAddInput & { id: string };

type TaskTemplateEnvelope = { schemaVersion: 1; templates: TaskTemplate[] };

const STORAGE_KEY = "fin.task-templates";
const SCHEMA_VERSION = 1;

/** 無料プランで保存できるテンプレート数の上限。 */
export const FREE_TEMPLATE_LIMIT = 3;

/** UI 側からブリッジなしで判定できるよう、純粋関数として切り出す。 */
export function canSaveTemplate(count: number, isPro: boolean): boolean {
  if (isPro) return true;
  return count < FREE_TEMPLATE_LIMIT;
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
