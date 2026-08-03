export type ThemePreference = "system" | "light" | "dark";

const storageKey = "fin.theme";
const darkMediaQuery = "(prefers-color-scheme: dark)";

function isThemePreference(value: string | null): value is ThemePreference {
  return value === "system" || value === "light" || value === "dark";
}

export function readThemePreference(): ThemePreference {
  try {
    if (typeof window === "undefined") return "system";
    const preference = window.localStorage.getItem(storageKey);
    return isThemePreference(preference) ? preference : "system";
  } catch {
    return "system";
  }
}

export function writeThemePreference(preference: ThemePreference) {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(storageKey, preference);
  } catch {
    // 保存できない環境でも、画面上のテーマ変更は続ける。
  }
}

export function applyThemePreference(preference: ThemePreference) {
  try {
    if (typeof window === "undefined" || typeof document === "undefined") return;
    const isDark = preference === "dark" || (preference === "system" && window.matchMedia(darkMediaQuery).matches);
    if (isDark) {
      document.documentElement.setAttribute("data-theme", "dark");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
  } catch {
    // 一部の埋め込み環境ではテーマ取得が使えないため、既定の表示を保つ。
  }
}

export function subscribeToThemePreference(preference: ThemePreference) {
  if (preference !== "system" || typeof window === "undefined") return () => {};

  try {
    const mediaQuery = window.matchMedia(darkMediaQuery);
    const handleChange = () => applyThemePreference("system");
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  } catch {
    return () => {};
  }
}
