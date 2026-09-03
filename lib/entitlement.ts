import { checkCurrentEntitlementStatus } from "./purchases";

export type ProStatus = "pro" | "free";

/**
 * ネイティブでしか課金状態を確かめられないので、答えが得られない場合は必ず free に倒す。
 * ここを「不明なら pro」にすると、ブラウザで開くだけで有料機能が開いてしまう。
 */
export async function getProStatus(): Promise<ProStatus> {
  if (isPreviewProRequested()) return "pro";

  try {
    const result = await checkCurrentEntitlementStatus();
    return result.available && result.value ? "pro" : "free";
  } catch {
    return "free";
  }
}

/**
 * 各画面がマウント時に1回だけ問い合わせていたので、購入・復元・返金・失効が
 * すでに開いている画面に届かなかった。答えを1か所に置いて配る。
 */
let currentProStatus: ProStatus | null = null;
let inFlightRefresh: Promise<ProStatus> | null = null;
const proStatusListeners = new Set<(status: ProStatus) => void>();

export function getCachedProStatus(): ProStatus | null {
  return currentProStatus;
}

/** 実際に問い合わせ直し、変わっていたら購読者に配る。同時に呼ばれても問い合わせは1本。 */
export function refreshProStatus(): Promise<ProStatus> {
  inFlightRefresh ??= getProStatus().then(
    (status) => {
      inFlightRefresh = null;
      if (status !== currentProStatus) {
        currentProStatus = status;
        for (const listener of proStatusListeners) listener(status);
      }
      return status;
    },
    () => {
      inFlightRefresh = null;
      // 判らないときは free。ここを pro に倒すと未購入の人に有料機能が開く。
      return currentProStatus ?? "free";
    },
  );
  return inFlightRefresh;
}

export function subscribeProStatus(listener: (status: ProStatus) => void): () => void {
  proStatusListeners.add(listener);
  return () => {
    proStatusListeners.delete(listener);
  };
}

/**
 * 開発中に Pro 側の画面をブラウザで確認するための逃げ道。
 * 本番ビルドでは NODE_ENV が production になるため、この分岐には到達しない。
 */
function isPreviewProRequested(): boolean {
  if (process.env.NODE_ENV !== "development") return false;
  if (typeof window === "undefined") return false;
  try {
    return new URLSearchParams(window.location.search).get("preview-pro") === "1";
  } catch {
    return false;
  }
}
