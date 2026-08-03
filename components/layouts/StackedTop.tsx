"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "../Icon";
import { AllDoneCard } from "../complete/AllDoneCard";
import { TaskRow } from "../TaskRow";
import type { useTasks } from "@/lib/tasks";

type Model = ReturnType<typeof useTasks>;
type Task = Model["tasks"][number];

/** The single, responsive production home layout. */
export function StackedTop({
  model,
  onAddTask,
  onDeleteTask,
  onEditTask,
}: {
  model: Model;
  onAddTask: () => void;
  onDeleteTask: (task: Task) => void;
  onEditTask: (task: Task) => void;
}) {
  const { tasks, start, end, remainLabel, remainCount, allDone, isPaused } = model;
  // Home only renders once the store has hydrated, so this never runs during SSR
  // and cannot desync hydration. Picking once per mount keeps the line steady
  // while the screen is open instead of changing under the reader.
  const [copySeed] = useState(() => Math.floor(Math.random() * 10_000));
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);

  useEffect(() => {
    const closeSwipeOnOutsidePointer = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Element && target.closest("[data-task-row]")) return;
      setOpenTaskId(null);
    };

    document.addEventListener("pointerdown", closeSwipeOnOutsidePointer);
    return () => document.removeEventListener("pointerdown", closeSwipeOnOutsidePointer);
  }, []);

  return (
    <section
      aria-label="ホーム"
      style={{
        color: "var(--fg)",
        display: "flex",
        flex: 1,
        flexDirection: "column",
        minHeight: 0,
        width: "100%",
      }}
    >
      <style>{`@media (prefers-reduced-motion: reduce) { [data-swipe-surface] { transition: none !important; } }`}</style>
      <header style={{ padding: "max(24px, env(safe-area-inset-top)) clamp(20px, 6vw, 42px) 0" }}>
        <div style={{ display: "flex", gap: 2, justifyContent: "flex-end", marginBottom: 8 }}>
          <Link
            aria-label="ふりかえり"
            href="/screen-5"
            style={{
              alignItems: "center",
              color: "var(--fg-50)",
              display: "inline-flex",
              padding: 6,
              textDecoration: "none",
            }}
          >
            <Icon name="monitoring" size={21} weight={350} color="currentColor" />
          </Link>
          <Link
            aria-label="設定"
            href="/settings"
            style={{
              alignItems: "center",
              color: "var(--fg-50)",
              display: "inline-flex",
              padding: 6,
              textDecoration: "none",
            }}
          >
            <Icon name="settings" size={21} weight={350} color="currentColor" />
          </Link>
        </div>
        {allDone ? null : (
          <>
            <div style={{ color: "var(--fg-42)", fontSize: 13, letterSpacing: ".22em" }}>
              {isPaused ? "一時停止中" : "ぜんぶ終わるのは"}
            </div>

            {/* 日をまたぐと「翌日 0:50」の形で来る。日付ぶんまで時計と同じ大きさで
                出すと折り返して不格好になるので、時刻だけを主役にして日付は上に小さく置く。 */}
            {(() => {
              const separator = end.indexOf(" ");
              const hasDayPrefix = separator > 0;
              const dayPrefix = hasDayPrefix ? end.slice(0, separator) : null;
              const clock = hasDayPrefix ? end.slice(separator + 1) : end;

              return (
                <>
                  {dayPrefix && (
                    <div style={{ color: "var(--fg-50)", fontSize: 15, fontWeight: 600, marginTop: 10 }}>
                      {dayPrefix}
                    </div>
                  )}
                  <div
                    style={{
                      fontSize: isPaused ? "clamp(2rem, 8vw, 2.5rem)" : "clamp(4.5rem, 28vw, 7.375rem)",
                      fontWeight: 600,
                      letterSpacing: "-.055em",
                      lineHeight: 0.94,
                      marginTop: dayPrefix ? 4 : 14,
                      overflowWrap: "anywhere",
                    }}
                  >
                    {clock}
                  </div>
                </>
              );
            })()}

          <div
            style={{
              alignItems: "center",
              color: "var(--fg-50)",
              display: "flex",
              flexWrap: "wrap",
              fontSize: 15,
              gap: 12,
              marginTop: 22,
            }}
          >
            <span>のこり {remainLabel}</span>
            <span aria-hidden style={{ background: "var(--fg-32)", borderRadius: "50%", height: 3, width: 3 }} />
            <span>{remainCount}件</span>
            <span style={{ color: "var(--fg-38)", marginLeft: "auto" }}>{start}</span>
          </div>
          </>
        )}
      </header>

      <div
        aria-label="未完了のタスク"
        style={{
          // All done leaves the list empty, so centre the card in the space the
          // list would have used instead of stranding it under the header.
          alignItems: allDone ? "center" : undefined,
          display: allDone ? "flex" : undefined,
          flex: 1,
          justifyContent: allDone ? "center" : undefined,
          marginTop: allDone ? 0 : 30,
          minHeight: 0,
          overflowY: "auto",
          overscrollBehavior: "contain",
          padding: "0 clamp(16px, 4vw, 34px) calc(24px + env(safe-area-inset-bottom))",
          scrollbarGutter: "stable both-edges",
        }}
        onScroll={() => setOpenTaskId(null)}
      >
        {allDone ? (
          <AllDoneCard seed={copySeed} />
        ) : tasks.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {tasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                onDelete={onDeleteTask}
                onEdit={(editingTask) => {
                  setOpenTaskId(null);
                  onEditTask(editingTask);
                }}
                onSwipeOpenChange={(open) => setOpenTaskId(open ? task.id : null)}
                swipeOpen={openTaskId === task.id}
              />
            ))}
          </div>
        ) : (
          <p style={{ color: "var(--fg-50)", lineHeight: 1.7, margin: "10px 8px" }}>
            いまはタスクがありません。次にやることを追加しましょう。
          </p>
        )}
      </div>

      <footer
        style={{
          alignItems: "center",
          background: "linear-gradient(to top, var(--bg) 72%, transparent)",
          display: "flex",
          gap: 16,
          justifyContent: "space-between",
          padding: "16px clamp(20px, 6vw, 42px) max(20px, env(safe-area-inset-bottom))",
        }}
      >
        <button
          type="button"
          aria-label="タスクを追加する"
          onClick={onAddTask}
          style={{
            alignItems: "center",
            background: "var(--accent)",
            border: "none",
            borderRadius: "50%",
            color: "var(--bg)",
            cursor: "pointer",
            display: "flex",
            flex: "0 0 auto",
            fontSize: 31,
            height: 58,
            justifyContent: "center",
            lineHeight: 1,
            padding: 0,
            width: 58,
          }}
        >
          <Icon name="add" size={29} weight={350} color="currentColor" />
        </button>
      </footer>
    </section>
  );
}
