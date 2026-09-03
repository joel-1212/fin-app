"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CompleteConfettiSoft } from "@/components/complete/CompleteConfettiSoft";
import { TimerBar } from "@/components/timer/TimerBar";
import { Icon } from "@/components/Icon";
import { useTaskStore } from "@/app/providers";
import { selectTaskById } from "@/lib/task-state";
import { formatFinishAt, selectOverallFinishAt, selectTaskRemainingMs } from "@/lib/task-time";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <Screen2Content />
    </Suspense>
  );
}

function Screen2Content() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const store = useTaskStore();
  const taskId = searchParams.get("taskId");
  const task = taskId ? selectTaskById(store.state, taskId) : undefined;
  const taskName = task?.title ?? "";
  const [now, setNow] = useState(0);
  const [isCompleting, setIsCompleting] = useState(false);
  const [cancelConfirmation, setCancelConfirmation] = useState(false);
  const completionStartedRef = useRef(false);
  // キャンセル後、ルート遷移が完了するまでの間に idle 起動 useEffect が再発火しないようにする
  const cancelledRef = useRef(false);
  const remainingMs = task ? selectTaskRemainingMs(task, now) : 0;
  const overallFinishAt = selectOverallFinishAt(store.state, now);
  const finishLabel = formatFinishAt(overallFinishAt, now);

  useEffect(() => {
    const refresh = () => {
      const current = Date.now();
      setNow(current);
      store.reconcileTimers(current);
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
  }, [store.reconcileTimers]);

  useEffect(() => {
    completionStartedRef.current = false;
    setIsCompleting(false);
    setCancelConfirmation(false);
  }, [task?.id]);

  useEffect(() => {
    if (cancelledRef.current) return;
    if (!task || task.status !== "idle") return;

    const activeTaskId = store.state.activeTaskId;
    // 進行中の1件があるなら、こちらを始めない。reducer は黙って弾くので、
    // 画面だけが動いているつもりになるのを防ぐ。開きたかった気持ちの行き先として、
    // 進行中のタスクへ差し替える。
    if (activeTaskId !== null && activeTaskId !== task.id) {
      router.replace(`/screen-2?taskId=${encodeURIComponent(activeTaskId)}`);
      return;
    }

    store.startTask(task.id);
  }, [router, store.startTask, store.state.activeTaskId, task?.id, task?.status]);

  useEffect(() => {
    if (task?.status !== "running") return;
    const tick = () => {
      const current = Date.now();
      setNow(current);
      store.reconcileTimers(current);
    };

    tick();
    const timer = window.setInterval(tick, 1_000);
    return () => window.clearInterval(timer);
  }, [store.reconcileTimers, task?.id, task?.status]);

  useEffect(() => {
    if (!task || task.status !== "completed" || completionStartedRef.current) return;
    completionStartedRef.current = true;
    setIsCompleting(true);
  }, [task?.id, task?.status]);

  useEffect(() => {
    if (!isCompleting) return;

    const navigationTimer = window.setTimeout(() => {
      router.push("/");
    }, 1700);

    return () => window.clearTimeout(navigationTimer);
  }, [isCompleting, router]);

  function completeTask() {
    if (!task || task.status === "completed" || completionStartedRef.current) return;
    store.completeTask(task.id);
  }

  function togglePaused() {
    if (!task) return;
    if (task.status === "paused") store.resumeTask(task.id);
    if (task.status === "running") store.pauseTask(task.id);
  }

  function confirmCancel() {
    if (!task) return;
    cancelledRef.current = true;
    store.cancelTask(task.id);
    router.push("/");
  }

  if (!store.hydrated || now === 0) {
    return <TaskStateNotice message={"タスクを読み込んでいます…"} />;
  }

  if (store.recoveryMessage) {
    return (
      <TaskStateNotice
        message={store.recoveryMessage}
        actionLabel={"新しいタスク状態で始める"}
        onAction={store.resetTaskState}
      />
    );
  }

  if (!task) {
    return (
      <TaskStateNotice
        message={"このタスクは見つかりません。"}
        actionLabel={"ホームへ戻る"}
        onAction={() => router.push("/")}
      />
    );
  }

  return (
    <main
      style={{
        alignItems: "center",
        background: "var(--bg)",
        color: "var(--fg)",
        display: "flex",
        flexDirection: "column",
        gap: 30,
        minHeight: "100dvh",
        padding: "32px 24px 56px",
      }}
    >
      <section
        aria-labelledby="screen-2-title"
        data-task-id={task.id}
        style={{
          alignItems: "center",
          background: "var(--sheet)",
          border: "1px solid var(--fg-14)",
          borderRadius: 32,
          display: "flex",
          flex: 1,
          flexDirection: "column",
          justifyContent: "center",
          maxWidth: 620,
          minHeight: "min(680px, 72dvh)",
          padding: "clamp(34px, 7vw, 72px) clamp(22px, 6vw, 64px)",
          position: "relative",
          width: "100%",
        }}
      >
        {!isCompleting && task.status !== "completed" && (
          <button
            type="button"
            onClick={() => setCancelConfirmation(true)}
            aria-label={"\u3053\u306e\u30bf\u30b9\u30af\u3092\u3084\u3081\u308b"}
            style={{
              alignItems: "center",
              background: "transparent",
              border: "none",
              borderRadius: "50%",
              cursor: "pointer",
              display: "flex",
              height: 36,
              justifyContent: "center",
              left: 16,
              position: "absolute",
              top: 16,
              width: 36,
            }}
          >
            <Icon name="close" size={20} color="var(--fg-42)" />
          </button>
        )}

        {cancelConfirmation && (
          <div
            role="alertdialog"
            aria-label={"\u30bf\u30b9\u30af\u3092\u3084\u3081\u308b\u78ba\u8a8d"}
            style={{
              alignItems: "center",
              background: "var(--sheet)",
              borderRadius: 32,
              display: "flex",
              flexDirection: "column",
              inset: 0,
              justifyContent: "center",
              padding: "32px 28px",
              position: "absolute",
              textAlign: "center",
              zIndex: 10,
            }}
          >
            <p style={{ fontSize: 16, fontWeight: 600, lineHeight: 1.8, margin: 0, maxWidth: 320 }}>
              {"\u3053\u306e\u30bf\u30b9\u30af\u3092\u3084\u3081\u3066\u3001\u30db\u30fc\u30e0\u306b\u623b\u308a\u307e\u3059\u3002\u3053\u3053\u307e\u3067\u306e\u6642\u9593\u306f\u8a18\u9332\u3055\u308c\u307e\u305b\u3093\u3002"}
            </p>
            <div style={{ display: "flex", gap: 10, marginTop: 26, width: "100%" }}>
              <button type="button" onClick={() => setCancelConfirmation(false)} style={{ ...secondaryButtonStyle, flex: 1 }}>
                {"\u3064\u3065\u3051\u308b"}
              </button>
              <button type="button" onClick={confirmCancel} style={{ ...primaryButtonStyle, flex: 1 }}>
                {"\u3084\u3081\u308b"}
              </button>
            </div>
          </div>
        )}

        <div style={{ color: "var(--fg-42)", fontSize: 13, letterSpacing: ".18em" }}>
          {"\u3044\u307e\u3001\u3053\u308c\u3060\u3051"}
        </div>
        <h1
          id="screen-2-title"
          style={{
            fontSize: "clamp(1.7rem, 5vw, 2.5rem)",
            fontWeight: 600,
            letterSpacing: "-.03em",
            margin: "15px 0 42px",
            textAlign: "center",
          }}
        >
          {taskName}
        </h1>

        <div style={{ alignItems: "center", display: "flex", justifyContent: "center", minHeight: 238, width: "100%" }}>
          {isCompleting ? (
            <CompleteConfettiSoft taskName={taskName} />
          ) : (
            <TimerBar remainingMs={remainingMs} totalMs={task.estimateMs} />
          )}
        </div>

        <div
          style={{
            color: "var(--fg-50)",
            fontSize: 13,
            lineHeight: 1.6,
            marginTop: 34,
            textAlign: "center",
          }}
        >
          {task.status === "elapsed" ? (
            <strong style={{ color: "var(--fg)", fontWeight: 600 }}>
              {"\u6642\u9593\u306b\u306a\u308a\u307e\u3057\u305f\u3002\u7d42\u308f\u308a\u3092\u6c7a\u3081\u308b\u306e\u306f\u3042\u306a\u305f\u3067\u3059\u3002"}
            </strong>
          ) : task.status === "paused" ? (
            <>
              {"\u4e00\u6642\u505c\u6b62\u4e2d\u3067\u3059\u3002\u4eca\u518d\u958b\u3057\u305f\u5834\u5408\u306f "}
              <strong style={{ color: "var(--fg)", fontWeight: 600 }}>{finishLabel}</strong>
              {" \u306e\u4e88\u5b9a"}
            </>
          ) : (
            <>
              {"\u3053\u306e\u30bf\u30b9\u30af\u3092\u542b\u3081\u3066\u3001\u305c\u3093\u3076\u7d42\u308f\u308b\u306e\u306f "}
              <strong style={{ color: "var(--fg)", fontWeight: 600 }}>{finishLabel}</strong>
              {" \u306e\u4e88\u5b9a"}
            </>
          )}
        </div>

        {!isCompleting && task.status !== "completed" && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center", marginTop: 28 }}>
            <button type="button" onClick={completeTask} style={primaryButtonStyle}>
              {"\u30bf\u30b9\u30af\u3092\u5b8c\u4e86"}
            </button>
            {task.status === "elapsed" ? (
              // 満了中に「一時停止」は意味を持たない（もう止まっている）。
              // 代わりに、続けるための選択肢を出す。
              <>
                <button type="button" onClick={() => store.extendTask(task.id, 5 * 60_000)} style={secondaryButtonStyle}>
                  {"5\u5206\u306e\u3070\u3059"}
                </button>
                <button type="button" onClick={() => store.extendTask(task.id, 10 * 60_000)} style={secondaryButtonStyle}>
                  {"10\u5206\u306e\u3070\u3059"}
                </button>
              </>
            ) : (
              <button type="button" onClick={togglePaused} style={secondaryButtonStyle}>
                {task.status === "paused" ? "\u518d\u958b" : "\u4e00\u6642\u505c\u6b62"}
              </button>
            )}
          </div>
        )}
      </section>
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

const primaryButtonStyle = {
  background: "var(--accent)",
  border: "1px solid var(--accent)",
  borderRadius: 999,
  color: "var(--bg)",
  cursor: "pointer",
  fontFamily: "inherit",
  fontSize: 14,
  fontWeight: 600,
  padding: "12px 20px",
};

const secondaryButtonStyle = {
  background: "transparent",
  border: "1px solid var(--fg-32)",
  borderRadius: 999,
  color: "var(--fg)",
  cursor: "pointer",
  fontFamily: "inherit",
  fontSize: 14,
  fontWeight: 600,
  padding: "12px 20px",
};

