"use client";

import { useEffect, useState, type CSSProperties } from "react";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { useTaskStore } from "@/app/providers";
import {
  selectEstimateAdvice,
  selectHistoryByDay,
  selectTodaySummary,
  selectWeeklyReport,
  type EstimateAdvice,
  type HistoryDay,
  type TodaySummary,
} from "@/lib/task-report";

const cardStyle: CSSProperties = {
  background: "var(--sheet)",
  borderRadius: 20,
  display: "grid",
  gap: 14,
  padding: "20px 18px",
};

const sectionTitleStyle: CSSProperties = { fontSize: 15, fontWeight: 650, margin: 0 };
const mutedStyle: CSSProperties = { color: "var(--fg-42)", fontSize: 13, lineHeight: 1.6, margin: 0 };

export default function Page() {
  const store = useTaskStore();
  // 毎レンダーで Date.now() を読むと表示が落ち着かないので基準時刻は state に持つ。
  // ただしマウント時に固定したままだと、開きっぱなしで日をまたいだとき
  // 「今日のまとめ」が昨日のままになる。戻ってきたときに取り直す。
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const refresh = () => setNow(Date.now());
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") refresh();
    };

    refresh();
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  const ready = store.hydrated && now !== null;
  const summary = now === null ? null : selectTodaySummary(store.state, now);

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
      <div style={{ display: "flex", maxWidth: 620, width: "100%" }}>
        <Link href="/" style={backLinkStyle}>
          <Icon name="arrow_back" size={17} weight={350} color="currentColor" />
          <span>ホームに戻る</span>
        </Link>
      </div>

      <section style={{ display: "grid", gap: 30, maxWidth: 620, width: "100%" }}>
        <header style={{ display: "grid", gap: 10 }}>
          <p style={{ color: "var(--fg-42)", fontSize: 13, fontWeight: 650, letterSpacing: ".14em", margin: 0 }}>
            FIN
          </p>
          <h1
            style={{
              fontSize: "clamp(2rem, 7vw, 3rem)",
              fontWeight: 600,
              letterSpacing: "-.045em",
              lineHeight: 1,
              margin: 0,
            }}
          >
            ふりかえり
          </h1>
        </header>

        {/* 記録の集計は 2026-08-19 の F1 決定で無料開放した。Pro ゲートはここには無い。 */}
        {ready && summary ? (
          <>
            <TodayCard summary={summary} />
            <RecordSections state={store.state} now={now!} />
          </>
        ) : (
          <p style={mutedStyle}>読み込んでいます…</p>
        )}
      </section>
    </main>
  );
}

function TodayCard({ summary }: { summary: TodaySummary }) {
  const percent = Math.round(summary.achievementRate * 100);

  return (
    <section aria-labelledby="today-title" style={{ display: "grid", gap: 12 }}>
      <h2 id="today-title" style={sectionTitleStyle}>
        今日のまとめ
      </h2>
      <div style={cardStyle}>
        {summary.completedCount === 0 ? (
          <p style={{ fontSize: 15, lineHeight: 1.7, margin: 0 }}>
            今日はまだ記録がありません。ひとつ終えると、ここに残ります。
          </p>
        ) : (
          <>
            <p style={{ fontSize: "clamp(1.25rem, 5vw, 1.5rem)", fontWeight: 600, lineHeight: 1.5, margin: 0 }}>
              今日は {summary.completedCount}件 を終えました
            </p>
            <p style={mutedStyle}>
              かかった時間は {formatDuration(summary.totalActiveMs)}
              {summary.plannedCount > 0 ? ` ・ 予定していたうちの ${percent}%` : ""}
            </p>
          </>
        )}
      </div>
    </section>
  );
}

function RecordSections({ state, now }: { state: Parameters<typeof selectHistoryByDay>[0]; now: number }) {
  const advice = selectEstimateAdvice(state);
  const history = selectHistoryByDay(state);
  const weekly = selectWeeklyReport(state, now);

  return (
    <>
      <section aria-labelledby="weekly-title" style={{ display: "grid", gap: 12 }}>
        <h2 id="weekly-title" style={sectionTitleStyle}>
          直近7日の実績
        </h2>
        <div style={cardStyle}>
          {weekly.completedCount === 0 ? (
            <p style={mutedStyle}>この7日間の記録はまだありません。</p>
          ) : (
            <>
              <p style={{ fontSize: "clamp(1.25rem, 5vw, 1.5rem)", fontWeight: 600, lineHeight: 1.5, margin: 0 }}>
                {weekly.completedCount}件 ・ {formatDuration(weekly.totalActiveMs)}
              </p>
              <p style={mutedStyle}>
                7日のうち {weekly.activeDayCount}日 で完了
                {" ・ "}
                見積もり内で終えたのは {weekly.completedCount}件中 {weekly.withinEstimateCount}件（
                {Math.round(weekly.withinEstimateRate * 100)}%）
              </p>
            </>
          )}
        </div>
      </section>

      <section aria-labelledby="advice-title" style={{ display: "grid", gap: 12 }}>
        <h2 id="advice-title" style={sectionTitleStyle}>
          見積もりの提案
        </h2>
        {advice.length === 0 ? (
          <div style={cardStyle}>
            <p style={mutedStyle}>同じタスクが何度か終わると、見積もりの直し方をここに出します。</p>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {advice.map((row) => (
              <AdviceRow key={row.title} advice={row} />
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="history-title" style={{ display: "grid", gap: 12 }}>
        <h2 id="history-title" style={sectionTitleStyle}>
          これまでの履歴
        </h2>
        {history.length === 0 ? (
          <div style={cardStyle}>
            <p style={mutedStyle}>まだ完了した記録がありません。</p>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {history.map((day) => (
              <HistoryCard key={day.day} day={day} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}

function AdviceRow({ advice }: { advice: EstimateAdvice }) {
  const differenceMs = Math.abs(advice.averageActualMs - advice.estimateMs);

  return (
    <div style={cardStyle}>
      <p style={{ fontSize: 15, fontWeight: 650, margin: 0 }}>{advice.title}</p>
      <p style={{ fontSize: 14, lineHeight: 1.7, margin: 0 }}>
        {advice.overrun
          ? `見積もりより平均 ${formatDuration(differenceMs)} 長くかかっています。`
          : `見積もりより平均 ${formatDuration(differenceMs)} 早く終わっています。`}
        <br />
        {formatDuration(advice.suggestedMs)} にしてみるのはどうでしょう。
      </p>
      <p style={mutedStyle}>{advice.completionCount}件の記録から</p>
    </div>
  );
}

function HistoryCard({ day }: { day: HistoryDay }) {
  const { deleteTask } = useTaskStore();
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  return (
    <div style={cardStyle}>
      <div style={{ alignItems: "baseline", display: "flex", gap: 12, justifyContent: "space-between" }}>
        <p style={{ fontSize: 15, fontWeight: 650, margin: 0 }}>{formatDay(day.day)}</p>
        <p style={mutedStyle}>
          {day.tasks.length}件 ・ {formatDuration(day.totalActiveMs)}
        </p>
      </div>
      <ul style={{ display: "grid", gap: 8, listStyle: "none", margin: 0, padding: 0 }}>
        {day.tasks.map((task) => (
          <li key={task.id} style={{ alignItems: "center", display: "flex", gap: 10, minHeight: 32 }}>
            <Icon name={task.icon} size={18} weight={350} color="var(--fg-42)" />
            <span style={{ flex: 1, fontSize: 14, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {task.title}
            </span>
            {confirmingId === task.id ? (
              <span style={{ alignItems: "center", display: "flex", flex: "0 0 auto", gap: 6 }}>
                <button type="button" onClick={() => setConfirmingId(null)} style={historyCancelButtonStyle}>
                  キャンセル
                </button>
                <button
                  type="button"
                  onClick={() => {
                    deleteTask(task.id);
                    setConfirmingId(null);
                  }}
                  style={historyDeleteButtonStyle}
                >
                  削除する
                </button>
              </span>
            ) : (
              <>
                <span style={{ color: "var(--fg-42)", fontSize: 13 }}>{formatDuration(task.actualMs)}</span>
                <button
                  type="button"
                  aria-label={task.title + "の記録を削除"}
                  onClick={() => setConfirmingId(task.id)}
                  style={{
                    background: "transparent",
                    border: 0,
                    color: "var(--fg-42)",
                    cursor: "pointer",
                    display: "inline-flex",
                    flex: "0 0 auto",
                    padding: 4,
                  }}
                >
                  <Icon name="close" size={16} weight={350} color="currentColor" />
                </button>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

const historyCancelButtonStyle: CSSProperties = {
  background: "transparent",
  border: "1px solid var(--fg-14)",
  borderRadius: 999,
  color: "var(--fg-60)",
  cursor: "pointer",
  font: "inherit",
  fontSize: 12.5,
  fontWeight: 600,
  padding: "5px 9px",
};

const historyDeleteButtonStyle: CSSProperties = {
  background: "#b85c55",
  border: "1px solid #b85c55",
  borderRadius: 999,
  color: "#fff",
  cursor: "pointer",
  font: "inherit",
  fontSize: 12.5,
  fontWeight: 650,
  padding: "5px 9px",
};

/** 「1時間5分」「25分」の形。 */
function formatDuration(milliseconds: number) {
  const totalMinutes = Math.round(milliseconds / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}分`;
  if (minutes === 0) return `${hours}時間`;
  return `${hours}時間${minutes}分`;
}

/** YYYY-MM-DD を「8月3日」に。今年なら年を省く。 */
function formatDay(day: string) {
  const [year, month, date] = day.split("-").map(Number);
  const head = year === new Date().getFullYear() ? "" : `${year}年`;
  return `${head}${month}月${date}日`;
}

const backLinkStyle: CSSProperties = {
  alignItems: "center",
  background: "var(--bg)",
  border: "1px solid var(--fg-14)",
  borderRadius: 999,
  color: "var(--fg-42)",
  display: "inline-flex",
  fontSize: 12.5,
  fontWeight: 600,
  gap: 6,
  padding: "8px 11px",
  textDecoration: "none",
};

