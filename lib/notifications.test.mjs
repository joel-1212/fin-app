import assert from "node:assert/strict";
import test from "node:test";
import {
  NOTIFICATIONS_STORAGE_KEY,
  buildTaskNotification,
  readNotificationsEnabled,
  requestNotificationPermission,
  toPlainLocalNotificationsApi,
  withNativeTimeout,
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

test("応答しないネイティブ呼び出しは打ち切られ、後続を待たせない", async () => {
  const started = Date.now();
  const result = await withNativeTimeout(new Promise(() => {}), 30);

  assert.deepEqual(result, { ok: false, reason: "timeout" });
  assert.ok(Date.now() - started < 1000);
});

test("解決した値はそのまま返り、拒否は打ち切りと区別して伝わる", async () => {
  assert.deepEqual(await withNativeTimeout(Promise.resolve({ display: "granted" }), 30), {
    ok: true,
    value: { display: "granted" },
  });

  await assert.rejects(() => withNativeTimeout(Promise.reject(new Error("native said no")), 30), {
    message: "native said no",
  });
});

test("notification copy preserves the complete task name and stays neutral", () => {
  const taskName = "資料を確認してチームに共有する長いタスク名";
  const notification = buildTaskNotification(taskName);
  const copy = `${notification.title}\n${notification.body}`;

  assert.ok(notification.title.includes(taskName));
  assert.equal(notification.body, "このタスク、終わった？");
  assert.doesNotMatch(copy, /時間切れ|まだ終わっていません|急いで/);
});

test("permission request outside the native shell reports unsupported, not a bare false", async (t) => {
  installBrowser(t);

  const result = await requestNotificationPermission();
  assert.equal(result.granted, false);
  assert.equal(result.reason, "unsupported");
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

test("thenableなプラグインプロキシは包み直してawaitの罠から外す", async () => {
  // Capacitor の registerPlugin プロキシを模す: どのプロパティにも関数を返し、
  // then に渡された resolve/reject は呼ばれない。
  const proxyLike = new Proxy(
    {},
    {
      get: (_, prop) => {
        if (prop === "checkPermissions") return async () => ({ display: "granted" });
        return () => new Promise(() => {});
      },
    },
  );

  // 素のプロキシを await すると固まる（バグの再現）。
  const rawOutcome = await Promise.race([
    Promise.resolve(proxyLike).then(() => "settled"),
    new Promise((resolve) => setTimeout(() => resolve("hung"), 50)),
  ]);
  assert.equal(rawOutcome, "hung");

  // 包み直したものは await をすり抜け、メソッドも生きている。
  const wrapped = toPlainLocalNotificationsApi(proxyLike);
  const wrappedOutcome = await Promise.race([
    Promise.resolve(wrapped).then(() => "settled"),
    new Promise((resolve) => setTimeout(() => resolve("hung"), 50)),
  ]);
  assert.equal(wrappedOutcome, "settled");
  assert.deepEqual(await wrapped.checkPermissions(), { display: "granted" });
});
