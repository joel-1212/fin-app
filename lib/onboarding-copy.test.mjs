import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import test from "node:test";

const screen7Source = readFileSync(resolve("app/screen-7/page.tsx"), "utf8");
const appAndComponentSources = ["app", "components"].flatMap((directory) => collectSources(resolve(directory)));

test("onboarding uses an honest local start action instead of Apple sign-in", () => {
  assert.ok(screen7Source.includes('{"\\u0046\\u0069\\u006e\\u3092\\u59cb\\u3081\\u308b"}'));
  assert.ok(
    screen7Source.includes(
      '{"\\u30c7\\u30fc\\u30bf\\u306f\\u3053\\u306e\\u7aef\\u672b\\u5185\\u306b\\u306e\\u307f\\u4fdd\\u5b58\\u3055\\u308c\\u307e\\u3059\\u3002\\u30a2\\u30ab\\u30a6\\u30f3\\u30c8\\u306e\\u4f5c\\u6210\\u3084\\u30b5\\u30a4\\u30f3\\u30a4\\u30f3\\u306f\\u5fc5\\u8981\\u3042\\u308a\\u307e\\u305b\\u3093\\u3002"}',
    ),
  );
  assert.doesNotMatch(screen7Source, /Sign in with Apple/);
  assert.match(screen7Source, /writeOnboardingCompleted\(\)/);
  assert.match(screen7Source, /router\.push\("\/"\)/);
});

// ストレージが使えない端末で落ちないよう、オンボーディングの読み書きは
// 例外を飲み込むヘルパー経由に揃えてある。直書きに戻っていないか見張る。
test("onboarding storage is never touched directly from a screen", () => {
  for (const source of [screen7Source, readFileSync(resolve("app/page.tsx"), "utf8")]) {
    assert.doesNotMatch(source, /localStorage\.(get|set)Item\(\s*"fin-onboarded"/);
  }
});

// /screen-3 は完了演出を見比べるだけの開発用ページで、削除済み。
// 誤って作り直したときに気づけるよう、参照が戻っていないことだけ見張る。
test("app and component sources do not link to the removed screen-3 preview route", () => {
  for (const source of appAndComponentSources) {
    assert.doesNotMatch(
      readFileSync(source, "utf8"),
      /(?:href\s*=\s*(?:\{\s*)?["']|router\.(?:push|replace)\(\s*["'])\/screen-3\b/,
    );
  }
});

function collectSources(directory) {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    return statSync(path).isDirectory() ? collectSources(path) : /\.(?:[cm]?js|tsx?)$/.test(entry) ? [path] : [];
  });
}
