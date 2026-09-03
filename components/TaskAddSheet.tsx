"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { DurationWheel } from "@/components/DurationWheel";
import type { TaskStatus } from "@/lib/task-state";
import {
  findTemplateToOverwrite,
  readTaskTemplates,
  saveTaskTemplate,
  type TaskTemplate,
} from "@/lib/task-templates";
import {
  addSuggestionExclusion,
  clearSuggestionExclusion,
  readSuggestionExclusions,
  selectTaskNameSuggestions,
} from "@/lib/task-history";
import { useTaskStore } from "@/app/providers";

export type TaskAddInput = {
  name: string;
  min: number;
  icon: string;
  subtasks?: string[];
};

export type TaskEditTarget = TaskAddInput & {
  id: string;
  // ステータス集合を書き写さず正本から取る。書き写すと、状態が増えたときに
  // ここだけ古いままになる。
  status: TaskStatus;
};

type TaskAddSheetProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: TaskAddInput) => void;
  task?: TaskEditTarget;
  onDelete?: (taskId: string) => void;
};

const ICONS = [
  "checklist",
  "mail",
  "local_laundry_service",
  "description",
  "menu_book",
  "cleaning_services",
  "restaurant",
  "home",
  "shopping_cart",
  "fitness_center",
  "event",
] as const;

export function TaskAddSheet({ open, onClose, onSubmit, task, onDelete }: TaskAddSheetProps) {
  const [name, setName] = useState("");
  const [min, setMin] = useState<number>(15);
  const [icon, setIcon] = useState<string>("checklist");
  const [subtaskDraft, setSubtaskDraft] = useState("");
  const [subtasks, setSubtasks] = useState<string[]>([]);
  const [deleteConfirmation, setDeleteConfirmation] = useState(false);
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [excludedSuggestions, setExcludedSuggestions] = useState<string[]>([]);
  const isEditing = task !== undefined;
  const { state: taskState } = useTaskStore();
  const trimmedTemplateName = name.trim();
  // 保存上限は撤廃済み（2026-08-19 F1）。名前さえあれば保存できる。
  const templateOverwriteTarget =
    trimmedTemplateName === ""
      ? undefined
      : findTemplateToOverwrite(templates, { name: trimmedTemplateName, min });
  const templateSaveAllowed = trimmedTemplateName !== "";
  // テンプレートは「保存して呼び出す」もの、これは「前に入力した名前」を検索履歴のように出すもの。編集中は出さない。
  const nameSuggestions = isEditing
    ? []
    : selectTaskNameSuggestions(taskState, { query: name, excluded: excludedSuggestions });

  useEffect(() => {
    if (!open) return;

    setName(task?.name ?? "");
    setMin(task?.min ?? 15);
    setIcon(task?.icon ?? "checklist");
    setSubtaskDraft("");
    setSubtasks(task?.subtasks ?? []);
    setDeleteConfirmation(false);
    setExcludedSuggestions(readSuggestionExclusions());
  }, [open, task]);

  useEffect(() => {
    if (!open || isEditing) {
      setTemplates([]);
      return;
    }

    setTemplates(readTaskTemplates());
  }, [open, isEditing]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open]);

  if (!open) return null;

  function addSubtask() {
    const value = subtaskDraft.trim();
    if (!value) return;

    setSubtasks((current) => [...current, value]);
    setSubtaskDraft("");
  }

  // タップしても即追加はしない。今日の見積もりは調整の余地を残す。
  function applyTemplate(template: TaskTemplate) {
    setName(template.name);
    setMin(template.min);
    setIcon(template.icon);
    setSubtasks(template.subtasks ?? []);
  }

  function saveCurrentAsTemplate() {
    if (!templateSaveAllowed) return;
    const trimmedName = name.trim();

    setTemplates(
      saveTaskTemplate({
        name: trimmedName,
        min,
        icon,
        subtasks: subtasks.length > 0 ? subtasks : undefined,
      }),
    );
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) return;

    // 消した候補と同じ名前をまた使ったなら、次からは候補に戻す。
    clearSuggestionExclusion(trimmedName);

    onSubmit({
      name: trimmedName,
      min,
      icon,
      subtasks: subtasks.length > 0 ? subtasks : undefined,
    });
  }

  return (
    <div
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 20,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        background: "rgba(23,24,26,.28)",
        padding: "16px 12px 0",
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-add-title"
        style={{
          width: "min(100%, 430px)",
          maxHeight: "calc(100dvh - 16px)",
          overflowY: "auto",
          borderRadius: "30px 30px 0 0",
          background: "var(--sheet)",
          color: "var(--fg)",
          boxShadow: "0 -18px 50px rgba(0,0,0,.2)",
          padding: "12px 22px 24px",
        }}
      >
        <div
          style={{
            width: 38,
            height: 4,
            borderRadius: 99,
            background: "var(--fg-14)",
            margin: "0 auto 12px",
          }}
        />

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <h2
            id="task-add-title"
            style={{
              margin: 0,
              fontSize: 22,
              letterSpacing: ".01em",
              fontWeight: 650,
            }}
          >
            {deleteConfirmation ? "タスクを削除" : isEditing ? "タスクを編集" : "タスクを追加"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={"\u9589\u3058\u308b"}
            style={{
              width: 36,
              height: 36,
              border: "none",
              borderRadius: "50%",
              background: "var(--hover)",
              color: "var(--fg-60)",
              fontSize: 22,
              lineHeight: 1,
              cursor: "pointer",
            }}
          >
            ×
          </button>
        </div>

        {deleteConfirmation && task ? (
          <div style={{ padding: "30px 0 12px" }}>
            <p style={{ fontSize: 17, fontWeight: 600, lineHeight: 1.6, margin: 0 }}>
              {task.status === "running" ? "実行中のタスクを削除しますか？" : "このタスクを削除しますか？"}
            </p>
            <p style={{ color: "var(--fg-60)", fontSize: 14, lineHeight: 1.7, margin: "12px 0 0" }}>
              {task.status === "running"
                ? "タイマーは停止します。この操作は取り消せません。"
                : "この操作は取り消せません。"}
            </p>
            <div style={{ display: "flex", gap: 10, marginTop: 28 }}>
              <button
                type="button"
                onClick={() => setDeleteConfirmation(false)}
                style={{
                  background: "transparent",
                  border: "1px solid var(--fg-14)",
                  borderRadius: 14,
                  color: "var(--fg)",
                  cursor: "pointer",
                  flex: 1,
                  font: "inherit",
                  fontWeight: 600,
                  padding: "13px 16px",
                }}
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={() => {
                  onDelete?.(task.id);
                  onClose();
                }}
                style={{
                  background: "#b85c55",
                  border: "1px solid #b85c55",
                  borderRadius: 14,
                  color: "#fff",
                  cursor: "pointer",
                  flex: 1,
                  font: "inherit",
                  fontWeight: 650,
                  padding: "13px 16px",
                }}
              >
                削除する
              </button>
            </div>
          </div>
        ) : (
        <form onSubmit={handleSubmit}>
          {!isEditing && templates.length > 0 && (
            <div
              role="group"
              aria-label={"テンプレート"}
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
                marginTop: 20,
              }}
            >
              {templates.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => applyTemplate(template)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    borderRadius: 999,
                    border: "1px solid var(--fg-14)",
                    background: "var(--hover)",
                    color: "var(--fg)",
                    padding: "8px 13px",
                    font: "inherit",
                    fontSize: 13,
                    fontWeight: 550,
                    cursor: "pointer",
                  }}
                >
                  <Icon name={template.icon} size={16} fill={0} />
                  {template.name}
                </button>
              ))}
            </div>
          )}

          <label
            htmlFor="task-name"
            style={{
              display: "block",
              marginTop: 22,
              marginBottom: 8,
              fontSize: 13,
              color: "var(--fg-60)",
            }}
          >
            {"\u30bf\u30b9\u30af\u540d"}
          </label>
          <input
            id="task-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={"\u4f55\u3092\u3059\u308b\uff1f"}
            autoFocus
            style={{
              width: "100%",
              border: "1px solid var(--fg-14)",
              borderRadius: 14,
              background: "var(--bg)",
              color: "var(--fg)",
              padding: "13px 14px",
              font: "inherit",
              fontSize: 16,
              outline: "none",
            }}
          />

          {!isEditing && nameSuggestions.length > 0 && (
            <div
              role="group"
              aria-label={"\u5165\u529b\u5c65\u6b74"}
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 6,
                marginTop: 9,
                maxHeight: 64,
                overflow: "hidden",
              }}
            >
              {nameSuggestions.map((suggestion) => (
                <span
                  key={suggestion}
                  style={{
                    alignItems: "center",
                    background: "var(--hover)",
                    borderRadius: 999,
                    color: "var(--fg-50)",
                    display: "inline-flex",
                    gap: 2,
                    paddingRight: 4,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setName(suggestion)}
                    aria-label={`${suggestion} \u3092\u540d\u524d\u306b\u5165\u308c\u308b`}
                    style={{
                      background: "transparent",
                      border: "none",
                      borderRadius: 999,
                      color: "inherit",
                      cursor: "pointer",
                      font: "inherit",
                      fontSize: 12,
                      fontWeight: 500,
                      padding: "6px 0 6px 11px",
                    }}
                  >
                    {suggestion}
                  </button>
                  <button
                    type="button"
                    onClick={() => setExcludedSuggestions(addSuggestionExclusion(suggestion))}
                    aria-label={`${suggestion} \u3092\u5019\u88dc\u304b\u3089\u6d88\u3059`}
                    style={{
                      alignItems: "center",
                      background: "transparent",
                      border: "none",
                      borderRadius: 999,
                      color: "var(--fg-42)",
                      cursor: "pointer",
                      display: "inline-flex",
                      padding: "6px 6px",
                    }}
                  >
                    <Icon name="close" size={13} weight={350} color="currentColor" />
                  </button>
                </span>
              ))}
            </div>
          )}

          <fieldset style={{ border: 0, padding: 0, margin: "20px 0 0" }}>
            <legend
              style={{
                padding: 0,
                marginBottom: 9,
                fontSize: 13,
                color: "var(--fg-60)",
              }}
            >
              {"\u6240\u8981\u6642\u9593"}
            </legend>
            <DurationWheel valueMin={min} onChange={setMin} />
          </fieldset>

          <fieldset style={{ border: 0, padding: 0, margin: "20px 0 0" }}>
            <legend
              style={{
                padding: 0,
                marginBottom: 9,
                fontSize: 13,
                color: "var(--fg-60)",
              }}
            >
              {"\u30a2\u30a4\u30b3\u30f3"}
            </legend>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
                gap: 8,
              }}
            >
              {ICONS.map((iconName) => {
                const selected = icon === iconName;
                return (
                  <button
                    key={iconName}
                    type="button"
                    title={iconName}
                    aria-label={iconName}
                    aria-pressed={selected}
                    onClick={() => setIcon(iconName)}
                    style={{
                      minHeight: 44,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: 13,
                      border: selected ? "1px solid var(--accent)" : "1px solid var(--fg-14)",
                      background: selected ? "color-mix(in srgb, var(--accent) 18%, transparent)" : "transparent",
                      color: selected ? "var(--accent)" : "var(--fg-60)",
                      cursor: "pointer",
                    }}
                  >
                    <Icon name={iconName} size={23} fill={selected ? 1 : 0} />
                  </button>
                );
              })}
            </div>
          </fieldset>

          <fieldset style={{ border: 0, padding: 0, margin: "20px 0 0" }}>
            <legend
              style={{
                padding: 0,
                marginBottom: 9,
                fontSize: 13,
                color: "var(--fg-60)",
              }}
            >
              {"\u30b5\u30d6\u30bf\u30b9\u30af"}
              <span style={{ marginLeft: 6, color: "var(--fg-38)" }}>
                {"\u4efb\u610f"}
              </span>
            </legend>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={subtaskDraft}
                onChange={(event) => setSubtaskDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addSubtask();
                  }
                }}
                placeholder={"\u3053\u308c\u3082\u3084\u308b"}
                aria-label={"\u30b5\u30d6\u30bf\u30b9\u30af\u3092\u5165\u529b"}
                style={{
                  minWidth: 0,
                  flex: 1,
                  border: "1px solid var(--fg-14)",
                  borderRadius: 13,
                  background: "var(--bg)",
                  color: "var(--fg)",
                  padding: "11px 12px",
                  font: "inherit",
                  fontSize: 14,
                  outline: "none",
                }}
              />
              <button
                type="button"
                onClick={addSubtask}
                style={{
                  border: "1px solid var(--fg-14)",
                  borderRadius: 13,
                  background: "transparent",
                  color: "var(--fg-60)",
                  padding: "0 14px",
                  font: "inherit",
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                {"\u8ffd\u52a0"}
              </button>
            </div>

            {subtasks.length > 0 && (
              <ul
                style={{
                  listStyle: "none",
                  padding: 0,
                  margin: "10px 0 0",
                  display: "flex",
                  flexDirection: "column",
                  gap: 7,
                }}
              >
                {subtasks.map((subtask, index) => (
                  <li
                    key={subtask + "-" + index}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "8px 10px",
                      borderRadius: 11,
                      background: "var(--hover)",
                      fontSize: 14,
                    }}
                  >
                    <span style={{ flex: 1 }}>{subtask}</span>
                    <button
                      type="button"
                      onClick={() => setSubtasks((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                      aria-label={subtask + "\u3092\u524a\u9664"}
                      style={{
                        border: 0,
                        background: "transparent",
                        color: "var(--fg-45)",
                        font: "inherit",
                        fontSize: 13,
                        cursor: "pointer",
                        padding: "3px 2px",
                      }}
                    >
                      {"\u524a\u9664"}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </fieldset>

          {!isEditing && (
            <div style={{ marginTop: 20 }}>
              <button
                type="button"
                onClick={saveCurrentAsTemplate}
                disabled={!templateSaveAllowed}
                style={{
                  width: "100%",
                  border: "1px solid var(--fg-14)",
                  borderRadius: 14,
                  background: "transparent",
                  color: "var(--fg-60)",
                  padding: "12px 14px",
                  font: "inherit",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: templateSaveAllowed ? "pointer" : "default",
                  opacity: templateSaveAllowed ? 1 : 0.5,
                }}
              >
                {templateOverwriteTarget ? "テンプレートを上書きする" : "テンプレートとして保存"}
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={!name.trim()}
            style={{
              width: "100%",
              marginTop: 24,
              border: "none",
              borderRadius: 15,
              background: "var(--accent)",
              color: "var(--bg)",
              padding: "14px 16px",
              font: "inherit",
              fontSize: 16,
              fontWeight: 650,
              cursor: name.trim() ? "pointer" : "default",
              opacity: name.trim() ? 1 : 0.45,
            }}
          >
            {isEditing ? "変更を保存" : "タスクを追加"}
          </button>
          {isEditing && task && onDelete && (
            <button
              type="button"
              onClick={() => setDeleteConfirmation(true)}
              style={{
                display: "block",
                margin: "18px auto 0",
                border: 0,
                background: "transparent",
                color: "#b85c55",
                font: "inherit",
                fontSize: 14,
                cursor: "pointer",
                padding: "5px 12px",
              }}
            >
              タスクを削除
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            style={{
              display: "block",
              margin: "12px auto 0",
              border: 0,
              background: "transparent",
              color: "var(--fg-50)",
              font: "inherit",
              fontSize: 14,
              cursor: "pointer",
              padding: "5px 12px",
            }}
          >
            {"\u30ad\u30e3\u30f3\u30bb\u30eb"}
          </button>
        </form>
        )}
      </section>
    </div>
  );
}
