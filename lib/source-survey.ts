// 流入元アンケート（全アプリ共通・2026-09-03 オーナー決定）
// 🔴 正本は private-app-dev-harness/templates/source-survey/。ここは写し。直すときは正本を先に直す。
//
// 初回起動の1枚目に「どこで知りましたか？」を1回だけ聞き、答えを Google スプレッドシートに1行送る。
// データベースは持たない。送るのは {app, source, platform, version, day} の5項目だけで、
// 端末ID・ユーザーID・IPを自分から付けることはしない（Apps Script 側にも残さない）。

export const APP_ID = "fin";

export const SOURCE_SURVEY_ENDPOINT =
  "https://script.google.com/macros/s/AKfycbznG_ID472s5QJLA_ujUiCWWE5XH8O223m-LtxjEwhDmOsQqEMqeG4NwYru3AzkVoEh/exec";

export const SOURCE_SURVEY_STORAGE_KEY = "source-survey:v1";

export const SOURCE_OPTIONS = [
  { id: "tiktok", label: "TikTok" },
  { id: "x", label: "X（Twitter）" },
  { id: "instagram", label: "Instagram" },
  { id: "friend", label: "友人・知人から" },
  { id: "search", label: "App Store で検索" },
  { id: "other", label: "その他" },
] as const;

export type SourceId = (typeof SOURCE_OPTIONS)[number]["id"] | "skip";

export type SourceAnswer = { source: SourceId; at: string };

/** 読めない端末（プライベートブラウズ等）では「答え済み」に倒す。起動のたびに聞くほうが害が大きい。 */
export function readSourceAnswer(): SourceAnswer | null | "unavailable" {
  try {
    if (typeof window === "undefined") return "unavailable";
    const raw = window.localStorage.getItem(SOURCE_SURVEY_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SourceAnswer>;
    return typeof parsed.source === "string" ? { source: parsed.source as SourceId, at: String(parsed.at ?? "") } : null;
  } catch {
    return "unavailable";
  }
}

export function writeSourceAnswer(source: SourceId): boolean {
  try {
    window.localStorage.setItem(SOURCE_SURVEY_STORAGE_KEY, JSON.stringify({ source, at: new Date().toISOString() }));
    return true;
  } catch {
    return false;
  }
}

function platformOf(): "ios" | "android" | "web" {
  try {
    const cap = (window as unknown as { Capacitor?: { getPlatform?: () => string } }).Capacitor;
    const p = cap?.getPlatform?.();
    if (p === "ios" || p === "android") return p;
  } catch {
    // Capacitor が無ければ Web
  }
  return "web";
}

/**
 * 投げっぱなしで送る。失敗しても呼び出し側は先へ進む（アンケートの失敗で画面を止めない）。
 * Content-Type を text/plain にするのは CORS のプリフライトを避けるため（Apps Script は OPTIONS に答えない）。
 * `no-cors` なので応答は読めない。届いたかはシート側で数える。
 */
export function sendSourceAnswer(source: SourceId, version = ""): void {
  if (source === "skip") return; // 「答えない」は送らない（端末に記録して二度と聞かないだけ）
  if (!SOURCE_SURVEY_ENDPOINT || SOURCE_SURVEY_ENDPOINT.includes("CHANGE_ME")) return;
  try {
    const body = JSON.stringify({
      app: APP_ID,
      source,
      platform: platformOf(),
      version,
      day: new Date().toISOString().slice(0, 10),
    });
    void fetch(SOURCE_SURVEY_ENDPOINT, {
      method: "POST",
      mode: "no-cors",
      keepalive: true,
      headers: { "Content-Type": "text/plain;charset=UTF-8" },
      body,
    }).catch(() => undefined);
  } catch {
    // 計測の失敗はユーザー体験を止めない
  }
}
