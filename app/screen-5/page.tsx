"use client";

import { useEffect, useState, type CSSProperties } from "react";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { useTaskStore } from "@/app/providers";
import { getProStatus, type ProStatus } from "@/lib/entitlement";
import {
  selectEstimateAdvice,
  selectHistoryByDay,
  selectTodaySummary,
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
  const [proStatus, setProStatus] = useState<ProStatus | null>(null);
  // 集計の基準時刻はマウント時に一度だけ確定させる。毎レンダーで Date.now() を
  // 読むと、開きっぱなしの画面で「今日」が静かにずれていく。
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    let cancelled = false;
    void getProStatus().then((status) => {
      if (!cancelled) setProStatus(status);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const ready = store.hydrated && proStatus !== null && now !== null;
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

        {/* 判定前に無料版を描くと、Pro の利用者に一瞬だけ案内が見えてしまう。 */}
        {ready && summary ? (
          <>
            <TodayCard summary={summary} />
            {proStatus === "pro" ? <ProSections state={store.state} /> : <UpgradeCard />}
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

function ProSections({ state }: { state: Parameters<typeof selectHistoryByDay>[0] }) {
  const advice = selectEstimateAdvice(state);
  const history = selectHistoryByDay(state);

  return (
    <>
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
          <li key={task.id} style={{ alignItems: "center", display: "flex", gap: 10 }}>
            <Icon name={task.icon} size={18} weight={350} color="var(--fg-42)" />
            <span style={{ flex: 1, fontSize: 14 }}>{task.title}</span>
            <span style={{ color: "var(--fg-42)", fontSize: 13 }}>{formatDuration(task.actualMs)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function UpgradeCard() {
  return (
    <section aria-labelledby="upgrade-title" style={{ display: "grid", gap: 12 }}>
      <h2 id="upgrade-title" style={sectionTitleStyle}>
        きのうまでの記録
      </h2>
      <div style={{ ...cardStyle, gap: 16 }}>
        <p style={{ fontSize: 15, lineHeight: 1.7, margin: 0 }}>きのうまでの記録は Pro で見られます。</p>
        <ul style={{ display: "grid", gap: 10, listStyle: "none", margin: 0, padding: 0 }}>
          {["日付ごとの履歴", "実績レポートと達成率", "見積もりの提案"].map((item) => (
            <li key={item} style={{ alignItems: "center", display: "flex", fontSize: 14, gap: 10 }}>
              <Icon name="check_circle" size={18} weight={350} fill={1} color="var(--accent)" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <Link href="/screen-6" style={proLinkStyle}>
          <span>Fin Pro について</span>
          <Icon name="arrow_forward" size={18} weight={350} color="var(--fg-42)" />
        </Link>
      </div>
    </section>
  );
}

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

const proLinkStyle: CSSProperties = {
  alignItems: "center",
  background: "var(--bg)",
  borderRadius: 14,
  color: "var(--fg)",
  display: "flex",
  fontSize: 14,
  fontWeight: 650,
  justifyContent: "space-between",
  padding: "14px 16px",
  textDecoration: "none",
};
