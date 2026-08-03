"use client";

import { AddButton, PhoneFrame } from "../PhoneFrame";
import { HomeIndicator, StatusBar } from "../StatusBar";
import { TaskRow } from "../TaskRow";
import type { useTasks } from "@/lib/tasks";

type Model = ReturnType<typeof useTasks>;

/**
 * 案1b: 中央配置。
 * 数字が余白に浮き、リストはボトムシートへ退く。
 * 数字とリストが層で分かれるぶん、数字の存在感は 1a より強い。
 */
export function CenteredSheet({ model }: { model: Model }) {
  const { tasks, toggle, start, end, remainLabel, allDone, isPaused } = model;

  return (
    <PhoneFrame>
      <StatusBar time={start} />

      <div
        style={{
          height: 400,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 20,
        }}
      >
        <div style={{ fontSize: 13, letterSpacing: ".24em", color: "var(--fg-42)" }}>
          {allDone ? "きょうはここまで" : isPaused ? "一時停止中" : "ぜんぶ終わるのは"}
        </div>
        <div
          style={{
            fontSize: isPaused ? 34 : 132,
            lineHeight: 0.9,
            fontWeight: 600,
            letterSpacing: "-.06em",
          }}
        >
          {allDone ? "Fin" : end}
        </div>
        {!allDone && (
          <div style={{ fontSize: 16, color: "var(--fg-45)", letterSpacing: ".02em" }}>
            のこり {remainLabel}
          </div>
        )}
      </div>

      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 420,
          background: "var(--sheet)",
          borderRadius: "34px 34px 0 0",
          padding: "14px 24px 48px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: 38,
            height: 4,
            borderRadius: 2,
            background: "var(--fg-14)",
            margin: "0 auto 16px",
          }}
        />
        {tasks.map((task) => (
          <TaskRow key={task.id} task={task} onToggle={toggle} size="compact" />
        ))}
      </div>

      <AddButton
        style={{
          position: "absolute",
          right: 26,
          bottom: 442,
          boxShadow: "0 10px 24px rgba(0,0,0,.45)",
        }}
      />

      <HomeIndicator />
    </PhoneFrame>
  );
}
