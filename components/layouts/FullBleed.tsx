"use client";

import { PhoneFrame } from "../PhoneFrame";
import { HomeIndicator, StatusBar } from "../StatusBar";
import type { useTasks } from "@/lib/tasks";

type Model = ReturnType<typeof useTasks>;

/**
 * 案1c: 全画面。
 * 数字だけを置き、タスクは太さの違う帯に抽象化する。
 * 情報量は最も少ないが、そのぶんスクリーンショットとしては最も強い。
 */
export function FullBleed({ model }: { model: Model }) {
  const { tasks, toggle, start, end, remainLabel, remainCount, allDone } = model;

  return (
    <PhoneFrame>
      <StatusBar time={start} dim />

      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 26,
        }}
      >
        <div style={{ fontSize: 14, letterSpacing: ".3em", color: "var(--fg-38)" }}>
          {allDone ? "きょうはここまで" : "ぜんぶ終わるのは"}
        </div>
        <div
          style={{
            fontSize: 172,
            lineHeight: 0.82,
            fontWeight: 600,
            letterSpacing: "-.07em",
          }}
        >
          {allDone ? "Fin" : end}
        </div>
        {!allDone && (
          <div style={{ fontSize: 17, color: "var(--fg-45)" }}>のこり {remainLabel}</div>
        )}
      </div>

      <div style={{ position: "absolute", left: 30, right: 30, bottom: 124 }}>
        <div style={{ display: "flex", gap: 4, height: 8 }}>
          {tasks.map((task) => (
            <button
              key={task.id}
              type="button"
              onClick={() => toggle(task.id)}
              aria-label={`${task.name} ${task.minLabel}`}
              aria-pressed={task.done}
              style={{
                height: 8,
                width: task.pct,
                padding: 0,
                border: "none",
                borderRadius: 4,
                cursor: "pointer",
                background: task.done ? "var(--fg-14)" : "var(--accent)",
                transition: "background 260ms ease",
              }}
            />
          ))}
        </div>

        <div
          style={{
            marginTop: 16,
            display: "flex",
            justifyContent: "space-between",
            fontSize: 13.5,
            color: "var(--fg-38)",
          }}
        >
          <span>{remainCount}件のこっている</span>
          <span>今日はやらない　2</span>
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 52,
          textAlign: "center",
          fontSize: 14,
          color: "var(--fg-32)",
        }}
      >
        ↑　リストを見る
      </div>

      <HomeIndicator />
    </PhoneFrame>
  );
}
