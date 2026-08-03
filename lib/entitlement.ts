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
