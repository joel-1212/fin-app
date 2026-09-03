/**
 * Compose the App Store screenshots: the sand artboard and caption from the
 * original poster set, but with the REAL app capture inside the device.
 *
 * The first submission was rejected under Guideline 2.3.3 because only 2 of the
 * 5 frames had any app UI in them ("do not show the actual app in use in the
 * majority of the screenshots"). Apple does not object to captions or device
 * frames — it objects to the majority not showing the app. So every frame here
 * carries a real capture from scripts/store-screenshots.mjs.
 *
 * Usage:
 *   node scripts/store-screenshots.mjs http://localhost:3020            # captures first
 *   SHOT_VIEWPORT=ipad SHOT_OUT_DIR=docs/screenshots/store-ipad \
 *     node scripts/store-screenshots.mjs http://localhost:3020
 *   node scripts/store-frames.mjs                                       # then compose
 */
import { launch } from "puppeteer-core";
import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { pathToFileURL } from "node:url";
import path from "node:path";

const CHROME_CANDIDATES = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "/usr/bin/google-chrome",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
];

function findChrome() {
  const found = CHROME_CANDIDATES.find((p) => existsSync(p));
  if (!found) throw new Error(`no Chrome build found; looked in:\n${CHROME_CANDIDATES.join("\n")}`);
  return found;
}

const SLIDES = [
  { shot: "01-home", caption: "今日、ぜんぶ<br>終わるのは<br>何時？", sub: "やることの時間を入れるだけ。" },
  { shot: "02-running", caption: "いまは、<br>これ、だけ。", sub: "残りの時間と、終わる時刻だけ。" },
  { shot: "03-report", caption: "終わったあとに、<br>ふりかえる。", sub: "かかった時間と、見積もりとのズレ。" },
  // 以前ここは課金ページで、コピーも「無料のままでも」だった。Guideline 2.3.7
  // （スクショに価格への言及があってはならない。Apple は無料への言及も価格に含める）
  // で却下されたので、価格の話が出ない履歴画面に差し替えてある。
  { shot: "04-history", caption: "続けた日が、<br>そのまま<br>記録になる。", sub: "日ごとの履歴と、見積もりとのズレの傾向。" },
  { shot: "05-settings", caption: "登録も、<br>ログインも、<br>いりません。", sub: "データは端末の中にだけ残ります。" },
];

/**
 * The caption block has to leave the lower two-thirds to the capture — that
 * ratio is what makes the app, not the poster, the majority of the frame.
 */
const TARGETS = [
  {
    name: "iphone",
    board: { w: 1284, h: 2778 },
    srcDir: "docs/screenshots/store",
    outDir: "docs/screenshots/store-framed",
    caption: 108,
    sub: 46,
    padX: 96,
    padTop: 132,
    deviceW: 1000,
    deviceTop: 800,
    radius: 76,
  },
  {
    name: "ipad",
    board: { w: 2064, h: 2752 },
    srcDir: "docs/screenshots/store-ipad",
    outDir: "docs/screenshots/store-framed-ipad",
    caption: 132,
    sub: 56,
    padX: 150,
    padTop: 150,
    deviceW: 1560,
    deviceTop: 760,
    radius: 60,
  },
];

function artboard(target, slide, index) {
  const src = pathToFileURL(path.resolve(`${target.srcDir}/${slide.shot}.png`)).href;
  return `
  <section class="board" id="board-${index}">
    <svg class="hill" viewBox="0 0 1284 1050" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M0 360C220 135 450 92 685 210C900 318 1080 312 1284 248V1050H0Z" fill="#D8C7AB"/>
    </svg>
    <h2 class="caption">${slide.caption}</h2>
    <p class="sub">${slide.sub}</p>
    <div class="device"><img src="${src}" alt=""></div>
  </section>`;
}

function html(target) {
  return `<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><style>
  * { box-sizing: border-box; margin: 0; }
  body { background: #666; font-family: "Hiragino Sans", "Noto Sans JP", "Yu Gothic UI", system-ui, sans-serif; }
  .board {
    position: relative; overflow: hidden;
    width: ${target.board.w}px; height: ${target.board.h}px;
    background: #E4D7C1;
  }
  .hill { position: absolute; left: 0; bottom: 0; width: 100%; height: 38%; }
  .caption {
    position: relative; z-index: 2;
    padding: ${target.padTop}px ${target.padX}px 0;
    font-size: ${target.caption}px; line-height: 1.18; font-weight: 800;
    letter-spacing: 0.01em; color: #17181a;
  }
  .sub {
    position: relative; z-index: 2;
    padding: ${Math.round(target.caption * 0.34)}px ${target.padX}px 0;
    font-size: ${target.sub}px; line-height: 1.5; color: #6b6660;
  }
  /* The device bleeds off the bottom edge so the capture keeps growing
     downward instead of being letterboxed into a small card. */
  .device {
    position: absolute; z-index: 3;
    left: 50%; transform: translateX(-50%);
    top: ${target.deviceTop}px; width: ${target.deviceW}px;
    padding: ${Math.round(target.radius * 0.16)}px;
    background: #2b2d30; border-radius: ${target.radius}px;
    box-shadow: 0 ${Math.round(target.radius * 0.5)}px ${target.radius}px rgba(23, 24, 26, 0.18);
  }
  .device img { display: block; width: 100%; border-radius: ${Math.round(target.radius * 0.82)}px; }
</style></head><body>
${SLIDES.map((s, i) => artboard(target, s, i)).join("\n")}
</body></html>`;
}

async function main() {
  const browser = await launch({ executablePath: findChrome(), headless: "new" });
  try {
    for (const target of TARGETS) {
      for (const slide of SLIDES) {
        const src = `${target.srcDir}/${slide.shot}.png`;
        if (!existsSync(src)) throw new Error(`missing capture: ${src} — run store-screenshots.mjs first`);
      }
      await mkdir(target.outDir, { recursive: true });
      const page = await browser.newPage();
      await page.setViewport({ width: target.board.w, height: target.board.h, deviceScaleFactor: 1 });
      const file = `docs/screenshots/.framed-${target.name}.html`;
      await writeFile(file, html(target), "utf8");
      await page.goto(pathToFileURL(path.resolve(file)).href, { waitUntil: "networkidle0" });

      for (const [index, slide] of SLIDES.entries()) {
        const element = await page.$(`#board-${index}`);
        const out = `${target.outDir}/${slide.shot}.png`;
        await element.screenshot({ path: out });
        console.log(`composed ${target.name} ${slide.shot} -> ${out}`);
      }
      await page.close();
    }
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
