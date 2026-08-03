"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Icon } from "@/components/Icon";
import { useTaskStore } from "@/app/providers";
import { getProStatus } from "@/lib/entitlement";
import {
  isNotificationsSupported,
  readNotificationsEnabled,
  requestNotificationPermission,
  syncTaskNotification,
  writeNotificationsEnabled,
} from "@/lib/notifications";
import {
  deleteTaskTemplate,
  FREE_TEMPLATE_LIMIT,
  readTaskTemplates,
  type TaskTemplate,
} from "@/lib/task-templates";
import {
  applyThemePreference,
  readThemePreference,
  subscribeToThemePreference,
  writeThemePreference,
  type ThemePreference,
} from "@/lib/theme";

const themeOptions: { description: string; label: string; value: ThemePreference }[] = [
  { description: "端末の表示設定に合わせます", label: "システムに合わせる", value: "system" },
  { description: "明るい表示にします", label: "ライト", value: "light" },
  { description: "暗い表示にします", label: "ダーク", value: "dark" },
];

export default function SettingsPage() {
  const { state } = useTaskStore();
  const [notificationMessage, setNotificationMessage] = useState<string | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notificationsSupported, setNotificationsSupported] = useState<boolean | null>(null);
  const [preference, setPreference] = useState<ThemePreference | null>(null);
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [isPro, setIsPro] = useState(false);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const isMounted = useRef(false);
  const notificationRequestRevision = useRef(0);
  const runningTask = state.tasks.find((task) => task.status === "running");
  const runningTaskRef = useRef(runningTask);
  runningTaskRef.current = runningTask;

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    const supported = isNotificationsSupported();
    setNotificationsSupported(supported);
    setNotificationsEnabled(supported && readNotificationsEnabled());
  }, []);

  useEffect(() => {
    setTemplates(readTaskTemplates());
    let cancelled = false;
    void getProStatus().then((status) => {
      if (!cancelled) setIsPro(status === "pro");
    });
    return () => {
      cancelled = true;
    };
  }, []);

  function removeTemplate(id: string) {
    setTemplates(deleteTaskTemplate(id));
    setConfirmingDeleteId(null);
  }

  useEffect(() => {
    if (preference === null) {
      setPreference(readThemePreference());
      return;
    }

    applyThemePreference(preference);
    return subscribeToThemePreference(preference);
  }, [preference]);

  function selectTheme(nextPreference: ThemePreference) {
    applyThemePreference(nextPreference);
    setPreference(nextPreference);
    writeThemePreference(nextPreference);
  }

  async function changeNotifications(event: ChangeEvent<HTMLInputElement>) {
    const enabled = event.currentTarget.checked;
    const revision = ++notificationRequestRevision.current;

    if (!enabled) {
      writeNotificationsEnabled(false);
      if (isMounted.current) {
        setNotificationMessage(null);
        setNotificationsEnabled(false);
      }
      await syncTaskNotification({ deadlineAt: null, taskId: "", title: "" });
      return;
    }

    const granted = await requestNotificationPermission();
    if (revision !== notificationRequestRevision.current) return;
    if (!granted) {
      writeNotificationsEnabled(false);
      await syncTaskNotification({ deadlineAt: null, taskId: "", title: "" });
      if (isMounted.current) {
        setNotificationMessage("通知の許可はiOSの設定で変更できます。");
        setNotificationsEnabled(false);
      }
      return;
    }

    writeNotificationsEnabled(true);
    if (isMounted.current) {
      setNotificationMessage(null);
      setNotificationsEnabled(true);
    }
    const task = runningTaskRef.current;
    await syncTaskNotification({
      deadlineAt: task?.deadlineAt ?? null,
      taskId: task?.id ?? "",
      title: task?.title ?? "",
    });
  }

  return (
    <main
      style={{
        alignItems: "center",
        background: "var(--bg)",
        color: "var(--fg)",
        display: "flex",
        flexDirection: "column",
        gap: 34,
        minHeight: "100dvh",
        padding: "32px 24px 56px",
      }}
    >
      <div style={{ alignItems: "center", display: "flex", maxWidth: 620, width: "100%" }}>
        <Link href="/" style={backLinkStyle}>
          <Icon name="arrow_back" size={17} weight={350} color="currentColor" />
          <span>ホームに戻る</span>
        </Link>
      </div>

      <section style={{ display: "grid", gap: 34, maxWidth: 620, width: "100%" }}>
        <header style={{ display: "grid", gap: 10 }}>
          <p style={{ color: "var(--fg-42)", fontSize: 13, fontWeight: 650, letterSpacing: ".14em", margin: 0 }}>
            FIN
          </p>
          <h1 style={{ fontSize: "clamp(2rem, 7vw, 3rem)", fontWeight: 600, letterSpacing: "-.045em", lineHeight: 1, margin: 0 }}>
            設定
          </h1>
        </header>

        <fieldset style={{ border: "none", display: "grid", gap: 12, margin: 0, padding: 0 }}>
          <legend style={{ fontSize: 15, fontWeight: 650, marginBottom: 4, padding: 0 }}>テーマ</legend>
          <div style={{ display: "grid", gap: 8 }}>
            {themeOptions.map((option) => (
              <label
                key={option.value}
                style={{
                  alignItems: "center",
                  background: "var(--sheet)",
                  borderRadius: 20,
                  // 選択中の行を背景色に寄せると、ページ地と同化して逆に沈む。
                  // 面ではなく細い輪郭で示す。
                  boxShadow: preference === option.value ? "inset 0 0 0 1.5px var(--accent)" : "none",
                  cursor: "pointer",
                  display: "flex",
                  gap: 14,
                  minHeight: 76,
                  padding: "16px 18px",
                }}
              >
                <input
                  checked={preference === option.value}
                  name="theme"
                  type="radio"
                  value={option.value}
                  onChange={() => selectTheme(option.value)}
                  style={{ accentColor: "var(--accent)", flex: "0 0 auto", height: 18, margin: 0, width: 18 }}
                />
                <span style={{ display: "grid", gap: 4 }}>
                  <span style={{ fontSize: 15, fontWeight: 650 }}>{option.label}</span>
                  <span style={{ color: "var(--fg-42)", fontSize: 13, lineHeight: 1.45 }}>{option.description}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <section aria-labelledby="notifications-title" style={{ display: "grid", gap: 12 }}>
          <h2 id="notifications-title" style={{ fontSize: 15, fontWeight: 650, margin: 0 }}>
            通知
          </h2>
          {notificationsSupported ? (
            <label
              style={{
                alignItems: "center",
                background: "var(--sheet)",
                borderRadius: 20,
                cursor: "pointer",
                display: "flex",
                justifyContent: "space-between",
                minHeight: 72,
                padding: "16px 18px",
              }}
            >
              <span style={{ display: "grid", gap: 4 }}>
                <span style={{ fontSize: 15, fontWeight: 650 }}>見積もりの時間に知らせる</span>
                <span style={{ color: "var(--fg-42)", fontSize: 13, lineHeight: 1.45 }}>
                  実行中のタスクの見積もり時刻に通知します
                </span>
              </span>
              <input
                checked={notificationsEnabled}
                role="switch"
                type="checkbox"
                onChange={changeNotifications}
                style={{ accentColor: "var(--accent)", height: 18, margin: 0, width: 18 }}
              />
            </label>
          ) : notificationsSupported === false ? (
            <p style={{ color: "var(--fg-42)", fontSize: 13, lineHeight: 1.45, margin: 0 }}>
              通知はiOSアプリで利用できます。
            </p>
          ) : null}
          {notificationMessage && (
            <p aria-live="polite" style={{ color: "var(--fg-42)", fontSize: 13, lineHeight: 1.45, margin: 0 }}>
              {notificationMessage}
            </p>
          )}
        </section>

        <section aria-labelledby="templates-title" style={{ display: "grid", gap: 12 }}>
          <div style={{ alignItems: "baseline", display: "flex", justifyContent: "space-between" }}>
            <h2 id="templates-title" style={{ fontSize: 15, fontWeight: 650, margin: 0 }}>
              テンプレート
            </h2>
            {!isPro && (
              <span style={{ color: "var(--fg-42)", fontSize: 12.5 }}>
                {templates.length} / {FREE_TEMPLATE_LIMIT}
              </span>
            )}
          </div>
          {templates.length === 0 ? (
            <p style={{ color: "var(--fg-42)", fontSize: 13, lineHeight: 1.45, margin: 0 }}>
              保存されたテンプレートはまだありません
            </p>
          ) : (
            <ul style={{ display: "grid", gap: 8, listStyle: "none", margin: 0, padding: 0 }}>
              {templates.map((template) => (
                <li
                  key={template.id}
                  style={{
                    alignItems: "center",
                    background: "var(--sheet)",
                    borderRadius: 18,
                    display: "flex",
                    gap: 12,
                    justifyContent: "space-between",
                    minHeight: 64,
                    padding: "12px 16px",
                  }}
                >
                  <span style={{ alignItems: "center", display: "flex", gap: 12, minWidth: 0 }}>
                    <Icon name={template.icon} size={19} weight={350} color="var(--fg-60)" />
                    <span style={{ display: "grid", gap: 2, minWidth: 0 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {template.name}
                      </span>
                      <span style={{ color: "var(--fg-42)", fontSize: 12.5 }}>{template.min}分</span>
                    </span>
                  </span>
                  {confirmingDeleteId === template.id ? (
                    <span style={{ alignItems: "center", display: "flex", flex: "0 0 auto", gap: 6 }}>
                      <button
                        type="button"
                        onClick={() => setConfirmingDeleteId(null)}
                        style={{
                          background: "transparent",
                          border: "1px solid var(--fg-14)",
                          borderRadius: 999,
                          color: "var(--fg-60)",
                          cursor: "pointer",
                          font: "inherit",
                          fontSize: 12.5,
                          fontWeight: 600,
                          padding: "6px 10px",
                        }}
                      >
                        キャンセル
                      </button>
                      <button
                        type="button"
                        onClick={() => removeTemplate(template.id)}
                        style={{
                          background: "#b85c55",
                          border: "1px solid #b85c55",
                          borderRadius: 999,
                          color: "#fff",
                          cursor: "pointer",
                          font: "inherit",
                          fontSize: 12.5,
                          fontWeight: 650,
                          padding: "6px 10px",
                        }}
                      >
                        削除する
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      aria-label={template.name + "を削除"}
                      onClick={() => setConfirmingDeleteId(template.id)}
                      style={{
                        background: "transparent",
                        border: 0,
                        color: "var(--fg-45)",
                        cursor: "pointer",
                        flex: "0 0 auto",
                        font: "inherit",
                        fontSize: 13,
                        padding: "6px 4px",
                      }}
                    >
                      削除
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="premium-title" style={{ display: "grid", gap: 12 }}>
          <h2 id="premium-title" style={{ fontSize: 15, fontWeight: 650, margin: 0 }}>
            プラン
          </h2>
          <Link
            href="/screen-6"
            style={{
              alignItems: "center",
              background: "var(--sheet)",
              borderRadius: 20,
              color: "var(--fg)",
              display: "flex",
              fontSize: 15,
              fontWeight: 650,
              justifyContent: "space-between",
              minHeight: 72,
              padding: "16px 18px",
              textDecoration: "none",
            }}
          >
            <span style={{ alignItems: "center", display: "flex", gap: 12 }}>
              <Icon name="workspace_premium" size={20} weight={350} color="var(--accent)" />
              <span>有料プランについて</span>
            </span>
            <Icon name="arrow_forward" size={18} weight={350} color="var(--fg-42)" />
          </Link>
        </section>
      </section>
    </main>
  );
}

const backLinkStyle = {
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
