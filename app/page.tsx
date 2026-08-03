"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TaskAddSheet, type TaskAddInput, type TaskEditTarget } from "@/components/TaskAddSheet";
import { StackedTop } from "@/components/layouts/StackedTop";
import { useTasks } from "@/lib/tasks";

export default function Page() {
  const router = useRouter();
  const model = useTasks();
  const [taskSheetOpen, setTaskSheetOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskEditTarget | undefined>(undefined);

  useEffect(() => {
    if (window.localStorage.getItem("fin-onboarded") === null) {
      router.replace("/screen-7");
    }
  }, [router]);

  if (!model.hydrated || !model.clockReady) {
    return <TaskStateNotice message={"タスクを読み込んでいます…"} />;
  }

  if (model.recoveryMessage) {
    return (
      <TaskStateNotice
        message={model.recoveryMessage}
        actionLabel={"新しいタスク状態で始める"}
        onAction={model.resetTaskState}
      />
    );
  }

  function closeTaskSheet() {
    setTaskSheetOpen(false);
    setEditingTask(undefined);
  }

  function submitTask(input: TaskAddInput) {
    if (editingTask) {
      model.editTask(editingTask.id, input);
    } else {
      model.addTask(input);
    }
    closeTaskSheet();
  }

  function openTaskEditor(task: TaskEditTarget) {
    setEditingTask(task);
    setTaskSheetOpen(true);
  }

  function deleteTaskFromSwipe(task: TaskEditTarget) {
    if (task.status === "running") {
      openTaskEditor(task);
      return;
    }

    model.deleteTask(task.id);
  }

  return (
    <main
      style={{
        background: "var(--bg)",
        display: "flex",
        flexDirection: "column",
        height: "100dvh",
        minHeight: "100dvh",
        overflow: "hidden",
        width: "100%",
      }}
    >
      <StackedTop
        model={model}
        onAddTask={() => {
          setEditingTask(undefined);
          setTaskSheetOpen(true);
        }}
        onDeleteTask={deleteTaskFromSwipe}
        onEditTask={openTaskEditor}
      />

      <TaskAddSheet
        open={taskSheetOpen}
        task={editingTask}
        onClose={closeTaskSheet}
        onSubmit={submitTask}
        onDelete={editingTask ? (taskId) => model.deleteTask(taskId) : undefined}
      />
    </main>
  );
}

function TaskStateNotice({
  message,
  actionLabel,
  onAction,
}: {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <main
      style={{
        alignItems: "center",
        background: "var(--bg)",
        color: "var(--fg)",
        display: "flex",
        flexDirection: "column",
        gap: 18,
        justifyContent: "center",
        minHeight: "100dvh",
        padding: 24,
        textAlign: "center",
      }}
    >
      <p style={{ margin: 0, maxWidth: 340, lineHeight: 1.7 }}>{message}</p>
      {actionLabel && onAction && (
        <button type="button" onClick={onAction} style={noticeButtonStyle}>
          {actionLabel}
        </button>
      )}
    </main>
  );
}

const noticeButtonStyle = {
  background: "var(--accent)",
  border: "none",
  borderRadius: 999,
  color: "var(--bg)",
  cursor: "pointer",
  font: "inherit",
  fontWeight: 600,
  padding: "12px 18px",
};
