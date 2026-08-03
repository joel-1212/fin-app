import { Capacitor } from "@capacitor/core";

export const FIN_TASK_NOTIFICATION_ID = 1;
export const NOTIFICATIONS_STORAGE_KEY = "fin.notifications";

export type NotificationPermission = "granted" | "denied" | "prompt" | "unsupported";

export type TaskNotificationInput = {
  deadlineAt: number | null;
  taskId: string;
  title: string;
};

let localNotificationsModulePromise: Promise<typeof import("@capacitor/local-notifications")> | null = null;
let notificationSyncQueue: Promise<void> = Promise.resolve();

function isNativeCapacitorContext(): boolean {
  return typeof window !== "undefined" && Capacitor.isNativePlatform();
}

async function getLocalNotifications() {
  if (!isNativeCapacitorContext()) return null;
  localNotificationsModulePromise ??= import("@capacitor/local-notifications");
  const { LocalNotifications } = await localNotificationsModulePromise;
  return LocalNotifications;
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

export async function requestNotificationPermission(): Promise<boolean> {
  try {
    const LocalNotifications = await getLocalNotifications();
    if (!LocalNotifications) return false;
    const { display } = await LocalNotifications.requestPermissions();
    return display === "granted";
  } catch {
    return false;
  }
}

export async function getNotificationPermission(): Promise<NotificationPermission> {
  try {
    const LocalNotifications = await getLocalNotifications();
    if (!LocalNotifications) return "unsupported";
    const { display } = await LocalNotifications.checkPermissions();
    return mapPermission(display);
  } catch {
    return "unsupported";
  }
}

export function buildTaskNotification(title: string) {
  // タスク名は動詞句のことが多く（「郵便を出す」など）、後ろに「の見積もり」を
  // 付けると日本語として崩れる。見出しはタスク名だけにして、説明は本文に置く。
  // アプリ名は iOS が通知の上に出すので、ここで名乗る必要もない。
  return {
    body: "見積もりの時間になりました",
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

export function syncTaskNotification(input: TaskNotificationInput): Promise<void> {
  const sync = async () => {
    try {
      const LocalNotifications = await getLocalNotifications();
      if (!LocalNotifications) return;

      await LocalNotifications.cancel({ notifications: [{ id: FIN_TASK_NOTIFICATION_ID }] });
      if (!isFutureDeadline(input.deadlineAt)) return;

      const notification = buildTaskNotification(input.title);
      await LocalNotifications.schedule({
        notifications: [
          {
            body: notification.body,
            extra: { taskId: input.taskId },
            id: FIN_TASK_NOTIFICATION_ID,
            schedule: { at: new Date(input.deadlineAt) },
            title: notification.title,
          },
        ],
      });
    } catch {
      // Native scheduling errors are intentionally non-fatal.
    }
  };

  notificationSyncQueue = notificationSyncQueue.catch(() => undefined).then(sync);
  return notificationSyncQueue;
}
