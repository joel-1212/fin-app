import assert from "node:assert/strict";
import test from "node:test";
import {
  NOTIFICATIONS_STORAGE_KEY,
  buildTaskNotification,
  readNotificationsEnabled,
  writeNotificationsEnabled,
} from "./notifications.ts";

function installBrowser(t) {
  const windowDescriptor = Object.getOwnPropertyDescriptor(globalThis, "window");
  const documentDescriptor = Object.getOwnPropertyDescriptor(globalThis, "document");
  const stored = new Map();

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      localStorage: {
        getItem: (key) => stored.get(key) ?? null,
        setItem: (key, value) => stored.set(key, value),
      },
    },
    writable: true,
  });
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: {},
    writable: true,
  });

  t.after(() => {
    if (windowDescriptor) {
      Object.defineProperty(globalThis, "window", windowDescriptor);
    } else {
      delete globalThis.window;
    }
    if (documentDescriptor) {
      Object.defineProperty(globalThis, "document", documentDescriptor);
    } else {
      delete globalThis.document;
    }
  });

  return stored;
}

test("notification copy preserves the complete task name and stays neutral", () => {
  const taskName = "資料を確認してチームに共有する長いタスク名";
  const notification = buildTaskNotification(taskName);
  const copy = `${notification.title}\n${notification.body}`;

  assert.ok(notification.title.includes(taskName));
  assert.equal(notification.body, "見積もりの時間になりました");
  assert.doesNotMatch(copy, /時間切れ|まだ終わっていません|急いで/);
});

test("notification setting defaults off for missing and unknown values", (t) => {
  const stored = installBrowser(t);

  assert.equal(readNotificationsEnabled(), false);
  stored.set(NOTIFICATIONS_STORAGE_KEY, "sometimes");
  assert.equal(readNotificationsEnabled(), false);
});

test("notification setting round trips its canonical values", (t) => {
  const stored = installBrowser(t);

  writeNotificationsEnabled(true);
  assert.equal(stored.get(NOTIFICATIONS_STORAGE_KEY), "enabled");
  assert.equal(readNotificationsEnabled(), true);

  writeNotificationsEnabled(false);
  assert.equal(stored.get(NOTIFICATIONS_STORAGE_KEY), "disabled");
  assert.equal(readNotificationsEnabled(), false);
});
