export const ONBOARDING_STORAGE_KEY = "fin-onboarded";

/**
 * ストレージが読めない端末（プライベートブラウズ、ストレージ無効）でも落ちないようにする。
 *
 * 読めないときは「完了済み」に倒す。逆に倒すと、保存もできない端末では
 * 起動のたびにオンボーディングへ送り返され、アプリを一生使えない。
 * オンボーディングをもう一度見せてしまう害の方がはるかに小さい。
 */
export function readOnboardingCompleted(): boolean {
  try {
    if (typeof window === "undefined") return true;
    return window.localStorage.getItem(ONBOARDING_STORAGE_KEY) !== null;
  } catch {
    return true;
  }
}

/** 保存できなくても呼び出し側は先へ進める。戻り値は「次も出るかもしれない」の判断用。 */
export function writeOnboardingCompleted(): boolean {
  try {
    if (typeof window === "undefined") return false;
    window.localStorage.setItem(ONBOARDING_STORAGE_KEY, "1");
    return true;
  } catch {
    return false;
  }
}
