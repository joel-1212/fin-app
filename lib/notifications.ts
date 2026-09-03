import { Capacitor } from "@capacitor/core";

export const FIN_TASK_NOTIFICATION_ID = 1;
export const NOTIFICATIONS_STORAGE_KEY = "fin.notifications";

export type NotificationPermission = "granted" | "denied" | "prompt" | "unsupported";

export type TaskNotificationInput = {
  deadlineAt: number | null;
  taskId: string;
  title: string;
};

type PermissionsResult = { display: string };

/** 実際に使うメソッドだけの型。npm モジュール経由でも注入ブリッジ経由でも同じ形。 */
type LocalNotificationsApi = {
  checkPermissions(): Promise<PermissionsResult>;
  requestPermissions(): Promise<PermissionsResult>;
  schedule(options: unknown): Promise<unknown>;
  cancel(options: unknown): Promise<unknown>;
};

type InjectedCapacitor = {
  Plugins?: Record<string, unknown>;
  nativePromise?: (pluginName: string, methodName: string, options?: unknown) => Promise<unknown>;
};

let localNotificationsModulePromise: Promise<typeof import("@capacitor/local-notifications")> | null = null;
let notificationSyncQueue: Promise<void> = Promise.resolve();

function isNativeCapacitorContext(): boolean {
  return typeof window !== "undefined" && Capacitor.isNativePlatform();
}

/**
 * ネイティブが WebView に注入した実行時（window.Capacitor）から直接プラグインを取る。
 * リモートURL構成の実機で、npm モジュール経由の呼び出しが応答しない報告があるため、
 * バンドル内のモジュールを介さないこちらを正とする。
 */
function getInjectedLocalNotifications(): LocalNotificationsApi | null {
  if (typeof window === "undefined") return null;
  const injected = (window as unknown as { Capacitor?: InjectedCapacitor }).Capacitor;
  const plugin = injected?.Plugins?.["LocalNotifications"] as Partial<LocalNotificationsApi> | undefined;
  if (plugin && typeof plugin.checkPermissions === "function" && typeof plugin.schedule === "function") {
    return plugin as LocalNotificationsApi;
  }
  const nativePromise = injected?.nativePromise;
  if (typeof nativePromise !== "function") return null;
  return {
    cancel: (options) => nativePromise("LocalNotifications", "cancel", options),
    checkPermissions: () => nativePromise("LocalNotifications", "checkPermissions") as Promise<PermissionsResult>,
    requestPermissions: () => nativePromise("LocalNotifications", "requestPermissions") as Promise<PermissionsResult>,
    schedule: (options) => nativePromise("LocalNotifications", "schedule", options),
  };
}

/**
 * Capacitor の registerPlugin が返すプロキシは、あらゆるプロパティ名に応答するため
 * `then` にも関数を返してしまう（thenable になる）。async 関数からそのまま return
 * すると、Promise 機構がその偽 then() を呼び、渡された resolve/reject は永遠に
 * 呼ばれないまま await が固まる。素のオブジェクトに包み直して thenable 性を断つ。
 * 通知が実機で一度も動かなかった原因はこれ。
 */
export function toPlainLocalNotificationsApi(plugin: LocalNotificationsApi): LocalNotificationsApi {
  return {
    cancel: (options) => plugin.cancel(options),
    checkPermissions: () => plugin.checkPermissions(),
    requestPermissions: () => plugin.requestPermissions(),
    schedule: (options) => plugin.schedule(options),
  };
}

async function getLocalNotifications(): Promise<LocalNotificationsApi | null> {
  if (!isNativeCapacitorContext()) return null;
  const injected = getInjectedLocalNotifications();
  if (injected) return toPlainLocalNotificationsApi(injected);
  localNotificationsModulePromise ??= import("@capacitor/local-notifications");
  const { LocalNotifications } = await localNotificationsModulePromise;
  return toPlainLocalNotificationsApi(LocalNotifications);
}

function mapPermission(display: string): NotificationPermission {
  if (display === "granted") return "granted";
  if (display === "denied") return "denied";
  return "prompt";
}

function isFutureDeadline(deadlineAt: number | null): deadlineAt is number {
  return typeof deadlineAt === "number" && Number.isFinite(deadlineAt) && deadlineAt > Date.now();
}

export function isNotificationsSupported(): boolean {
  return isNativeCapacitorContext();
}

/** 応答しないネイティブ呼び出しを打ち切る。待っている呼び出しの結果は捨てる。 */
export const NATIVE_CALL_TIMEOUT_MS = 8000;

export type NativeCallResult<T> = { ok: true; value: T } | { ok: false; reason: "timeout" };

/**
 * ネイティブが応答しないと await が永久に返らない。通知の同期は単一のキューに
 * 積まれているので、1回固まると以後の同期が全部その後ろで待ち続ける。
 * 打ち切って次へ進めるために、必ずこれを通す。
 */
export function withNativeTimeout<T>(
  promise: Promise<T>,
  timeoutMs = NATIVE_CALL_TIMEOUT_MS,
): Promise<NativeCallResult<T>> {
  return new Promise<NativeCallResult<T>>((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      resolve({ ok: false, reason: "timeout" });
    }, timeoutMs);

    promise.then(
      (value) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve({ ok: true, value });
      },
      (error: unknown) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        // 拒否は打ち切りと違う。呼び出し元が理由を見分けられるよう、そのまま伝える。
        reject(error instanceof Error ? error : new Error(String(error)));
      },
    );
  });
}

export type NotificationPermissionRequestResult =
  | { granted: true }
  | { granted: false; reason: "denied" | "error" | "unsupported"; detail?: string };

export async function requestNotificationPermission(): Promise<NotificationPermissionRequestResult> {
  try {
    const LocalNotifications = await getLocalNotifications();
    if (!LocalNotifications) return { granted: false, reason: "unsupported" };
    // 実機でネイティブ側が応答しないと、ここで永遠に待って「保存されないON」になる。
    // 一定時間で打ち切って失敗として画面に出す。
    const result = await withNativeTimeout(LocalNotifications.requestPermissions());
    if (!result.ok) {
      return { granted: false, reason: "error", detail: "ネイティブ側が応答しませんでした" };
    }
    if (result.value.display === "granted") return { granted: true };
    return { granted: false, reason: "denied" };
  } catch (error) {
    // 失敗を握りつぶすと、設定画面のトグルが「押しても何も起きない」ように見える。
    // 原因文言を設定画面へ渡し、実機だけで再現する不具合を切り分けられるようにする。
    const detail = error instanceof Error ? error.message : String(error);
    return { granted: false, reason: "error", detail };
  }
}

export async function getNotificationPermission(): Promise<NotificationPermission> {
  try {
    const LocalNotifications = await getLocalNotifications();
    if (!LocalNotifications) return "unsupported";
    const result = await withNativeTimeout(LocalNotifications.checkPermissions());
    if (!result.ok) return "unsupported";
    return mapPermission(result.value.display);
  } catch {
    return "unsupported";
  }
}

export function buildTaskNotification(title: string) {
  // タスク名は動詞句のことが多く（「郵便を出す」など）、後ろに「の見積もり」を
  // 付けると日本語として崩れる。見出しはタスク名だけにして、説明は本文に置く。
  // アプリ名は iOS が通知の上に出すので、ここで名乗る必要もない。
  return {
    // 「見積もりの時間になりました」は日本語として変（2026-08-18 オーナー指摘）。
    // 問いかけ形にして、終わっていれば消すだけ・終わっていなければ開く動機になる。
    body: "このタスク、終わった？",
    title,
  };
}

export function readNotificationsEnabled(): boolean {
  try {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(NOTIFICATIONS_STORAGE_KEY) === "enabled";
  } catch {
    return false;
  }
}

export function writeNotificationsEnabled(enabled: boolean): void {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, enabled ? "enabled" : "disabled");
  } catch {
    // A storage failure should not block use of the app.
  }
}

export type NotificationSyncResult =
  | { ok: true; scheduled: boolean }
  | { ok: false; reason: "unsupported" | "timeout" | "error"; detail?: string };

/**
 * 予約の成否を返す。呼び出し側が無視しても動作は変わらない（非致命なのは元のまま）が、
 * 握り潰したままだと「ONに見えるのに鳴らない」を切り分ける手掛かりが残らない。
 */
export function syncTaskNotification(input: TaskNotificationInput): Promise<NotificationSyncResult> {
  const sync = async (): Promise<NotificationSyncResult> => {
    try {
      const LocalNotifications = await getLocalNotifications();
      if (!LocalNotifications) return { ok: false, reason: "unsupported" };

      const cancelled = await withNativeTimeout(
        LocalNotifications.cancel({ notifications: [{ id: FIN_TASK_NOTIFICATION_ID }] }),
      );
      if (!cancelled.ok) return { ok: false, reason: "timeout" };
      if (!isFutureDeadline(input.deadlineAt)) return { ok: true, scheduled: false };

      const notification = buildTaskNotification(input.title);
      const scheduled = await withNativeTimeout(
        LocalNotifications.schedule({
          notifications: [
            {
              body: notification.body,
              extra: { taskId: input.taskId },
              id: FIN_TASK_NOTIFICATION_ID,
              schedule: { at: new Date(input.deadlineAt) },
              title: notification.title,
            },
          ],
        }),
      );
      if (!scheduled.ok) return { ok: false, reason: "timeout" };
      return { ok: true, scheduled: true };
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      return { ok: false, reason: "error", detail };
    }
  };

  // 直列に保つのは、cancel と schedule が入れ違うと予約が消えるため。
  // ただし前の結果には依存させない（1件の失敗で以後が止まらないように）。
  const next = notificationSyncQueue.then(sync, sync);
  notificationSyncQueue = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
}
