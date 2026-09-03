"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "../Icon";
import { AllDoneCard } from "../complete/AllDoneCard";
import { TaskRow } from "../TaskRow";
import type { useTasks } from "@/lib/tasks";

type Model = ReturnType<typeof useTasks>;
type Task = Model["tasks"][number];

/** ホームの2枚のタブ。今日と明日だけで、それ以上先は作らない（オーナー承認 B-4）。 */
export type HomeTab = "today" | "tomorrow";

/** The single, responsive production home layout. */
export function StackedTop({
  model,
  activeTab,
  onChangeTab,
  onAddTask,
  onDeleteTask,
  onEditTask,
}: {
  model: Model;
  activeTab: HomeTab;
  onChangeTab: (tab: HomeTab) => void;
  onAddTask: () => void;
  onDeleteTask: (task: Task) => void;
  onEditTask: (task: Task) => void;
}) {
  const { tasks, tomorrowTasks, tomorrowTotalLabel, tomorrowCount, start, end, remainLabel, remainCount, allDone, isPaused } = model;
  const showTomorrow = activeTab === "tomorrow";
  // Home only renders once the store has hydrated, so this never runs during SSR
  // and cannot desync hydration. Picking once per mount keeps the line steady
  // while the screen is open instead of changing under the reader.
  const [copySeed] = useState(() => Math.floor(Math.random() * 10_000));
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const centerAllDoneCard = !showTomorrow && allDone;

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
        <div style={{ alignItems: "center", display: "flex", gap: 12, justifyContent: "space-between", marginBottom: 8 }}>
          <div
            role="tablist"
            aria-label="今日と明日の切り替え"
            style={{ background: "var(--sheet)", borderRadius: 999, display: "flex", gap: 2, padding: 3 }}
          >
            {(
              [
                { label: "今日", value: "today" },
                { label: "明日", value: "tomorrow" },
              ] as const
            ).map((tab) => {
              const selected = activeTab === tab.value;
              return (
                <button
                  key={tab.value}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => {
                    setOpenTaskId(null);
                    onChangeTab(tab.value);
                  }}
                  style={{
                    background: selected ? "var(--bg)" : "transparent",
                    border: "none",
                    borderRadius: 999,
                    color: selected ? "var(--fg)" : "var(--fg-50)",
                    cursor: "pointer",
                    font: "inherit",
                    fontSize: 13.5,
                    fontWeight: 650,
                    padding: "7px 16px",
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
          <div style={{ display: "flex", gap: 2, justifyContent: "flex-end" }}>
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
        </div>
        {showTomorrow ? (
          <>
            <div style={{ color: "var(--fg-42)", fontSize: 13, letterSpacing: ".22em" }}>明日にやること</div>
            {tomorrowCount > 0 && (
              <div
                style={{
                  alignItems: "center",
                  color: "var(--fg-50)",
                  display: "flex",
                  flexWrap: "wrap",
                  fontSize: 15,
                  gap: 12,
                  marginTop: 14,
                }}
              >
                <span>見積もり {tomorrowTotalLabel}</span>
                <span aria-hidden style={{ background: "var(--fg-32)", borderRadius: "50%", height: 3, width: 3 }} />
                <span>{tomorrowCount}件</span>
              </div>
            )}
          </>
        ) : allDone ? null : (
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
        aria-label={showTomorrow ? "明日のタスク" : "未完了のタスク"}
        style={{
          // All done leaves the list empty, so centre the card in the space the
          // list would have used instead of stranding it under the header.
          alignItems: centerAllDoneCard ? "center" : undefined,
          display: centerAllDoneCard ? "flex" : undefined,
          flex: 1,
          justifyContent: centerAllDoneCard ? "center" : undefined,
          marginTop: centerAllDoneCard ? 0 : 30,
          minHeight: 0,
          overflowY: "auto",
          overscrollBehavior: "contain",
          padding: "0 clamp(16px, 4vw, 34px) calc(24px + env(safe-area-inset-bottom))",
          scrollbarGutter: "stable both-edges",
        }}
        onScroll={() => setOpenTaskId(null)}
      >
        {showTomorrow ? (
          tomorrowTasks.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {tomorrowTasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onDelete={onDeleteTask}
                  // 明日のぶんはまだ始めない。タップはタイマーではなく編集を開く。
                  onOpen={(editingTask) => {
                    setOpenTaskId(null);
                    onEditTask(editingTask);
                  }}
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
              寝る前に明日のタスクも追加しておけます
            </p>
          )
        ) : allDone ? (
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
