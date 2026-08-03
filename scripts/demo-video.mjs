/**
 * Record the Shipaton demo video by driving the real app.
 *
 * Nothing here is a mockup: the browser runs the app at an iPhone 15 Pro
 * viewport and the recording is whatever the app actually did. English
 * captions are painted over it, because the UI ships in Japanese and the
 * judges do not read it.
 *
 * Usage:
 *   npm run dev                      # in another terminal
 *   node scripts/demo-video.mjs      # writes docs/promo/fin-demo.webm
 */
import { launch } from "puppeteer-core";
import ffmpegPath from "ffmpeg-static";
import { mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";

const BASE_URL = process.argv[2] ?? "http://localhost:3000";
const OUT_DIR = "docs/promo";
const OUT_FILE = `${OUT_DIR}/fin-demo.webm`;

const VIEWPORT = { width: 393, height: 852, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
const STAGED_CLOCK = new Date("2026-08-04T14:20:00+09:00").getTime();
const MINUTE = 60_000;

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

function stagedTasks(now) {
  const base = {
    subtasks: [], startedAt: null, runStartedAt: null, deadlineAt: null,
    remainingMsAtPause: null, accumulatedActiveMs: 0, completedAt: null, completionReason: null,
    status: "idle", createdAt: now - 300 * MINUTE,
  };
  return [
    { ...base, id: "a", icon: "mail", title: "郵便を出す", estimateMs: 10 * MINUTE, order: 0 },
    { ...base, id: "b", icon: "local_laundry_service", title: "洗濯を回す", estimateMs: 15 * MINUTE, order: 1 },
    { ...base, id: "c", icon: "description", title: "週報を書く", estimateMs: 45 * MINUTE, order: 2 },
    { ...base, id: "d", icon: "menu_book", title: "論文を1本読む", estimateMs: 60 * MINUTE, order: 3 },
  ];
}

function seedValues(now) {
  return {
    "fin-onboarded": "1",
    "fin.theme": "light",
    "fin.task-state": JSON.stringify({ schemaVersion: 1, savedAt: now, tasks: stagedTasks(now), activeTaskId: null }),
  };
}

/** Caption copy, in the order it appears. */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const browser = await launch({ executablePath: findChrome(), headless: "new", defaultViewport: VIEWPORT });

  try {
    const page = await browser.newPage();

    const offset = STAGED_CLOCK - Date.now();
    await page.evaluateOnNewDocument((ms) => {
      const RealDate = Date;
      class StagedDate extends RealDate {
        constructor(...args) {
          if (args.length === 0) super(RealDate.now() + ms);
          else super(...args);
        }
        static now() { return RealDate.now() + ms; }
      }
      window.Date = StagedDate;
    }, offset);

    // The dev overlay would otherwise sit in the corner of the whole video.
    await page.evaluateOnNewDocument(() => {
      const paint = () => {
        const style = document.createElement("style");
        style.textContent = `
          nextjs-portal, #__next-build-watcher { display: none !important; }
          #demo-caption {
            position: fixed; left: 0; right: 0; bottom: 0; z-index: 2147483647;
            padding: 26px 28px calc(28px + env(safe-area-inset-bottom));
            background: linear-gradient(to top, rgba(23,24,26,0.93) 62%, rgba(23,24,26,0));
            color: #f7f5f1; font-size: 21px; line-height: 1.5; font-weight: 600;
            letter-spacing: 0.01em; text-align: center; pointer-events: none;
            opacity: 0; transition: opacity 420ms ease;
            font-family: -apple-system, "SF Pro Text", "Helvetica Neue", sans-serif;
          }
          #demo-caption.on { opacity: 1; }`;
        document.head.appendChild(style);
        const bar = document.createElement("div");
        bar.id = "demo-caption";
        document.body.appendChild(bar);
      };
      if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", paint);
      else paint();
    });

    await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
    await page.evaluate((seed) => {
      for (const [k, v] of Object.entries(seed)) window.localStorage.setItem(k, v);
    }, seedValues(STAGED_CLOCK));

    const say = async (text) => {
      await page.evaluate((t) => {
        const bar = document.getElementById("demo-caption");
        if (!bar) return;
        bar.classList.remove("on");
        setTimeout(() => { bar.textContent = t; if (t) bar.classList.add("on"); }, 260);
      }, text);
    };

    /** Click the first element whose accessible name or text matches. */
    const tap = async (matcher) => {
      const ok = await page.evaluate((m) => {
        const nodes = Array.from(document.querySelectorAll("button, a, [role=button]"));
        const el = nodes.find((n) => (n.getAttribute("aria-label") || n.textContent || "").includes(m));
        if (!el) return false;
        el.click();
        return true;
      }, matcher);
      if (!ok) console.warn(`skipped: no control matching ${matcher}`);
      return ok;
    };

    /**
     * Open a task from the list. Matching has to go by visible text: each row
     * also carries a swipe-revealed delete control whose aria-label contains
     * the same title, and it comes first in the DOM. The row also owns
     * swipe-to-delete pointer handlers, which a synthetic mouse press trips
     * over, so this invokes the control directly.
     */
    const tapTask = async (title) => {
      const ok = await page.evaluate((t) => {
        const el = Array.from(document.querySelectorAll("button")).find((n) => (n.textContent || "").includes(t));
        if (!el) return false;
        el.click();
        return true;
      }, title);
      if (!ok) console.warn(`skipped: no task row for ${title}`);
      return ok;
    };

    /**
     * Step back through client-side history. page.goBack() waits for a network
     * navigation that a pushState route never performs, so it returns before
     * the route has changed.
     */
    const back = async () => {
      const from = await page.evaluate(() => location.pathname);
      await page.evaluate(() => history.back());
      await page
        .waitForFunction((prev) => location.pathname !== prev, { timeout: 6000 }, from)
        .catch(() => console.warn(`warning: still on ${from} after going back`));
    };

    /** Never let the loading placeholder sit in a frame. */
    const settle = async () => {
      await page
        .waitForFunction(() => !document.body.innerText.includes("読み込んでいます"), { timeout: 8000 })
        .catch(() => {});
      await sleep(600);
    };

    await page.goto(BASE_URL, { waitUntil: "networkidle0" });
    await settle();
    const recorder = await page.screencast({ path: OUT_FILE, ffmpegPath });
    console.log("recording…");

    // 1. The problem, before the app is explained.
    await sleep(1200);
    await say("A to-do list tells you what to do.");
    await sleep(3400);
    await say("It never tells you when you'll be done.");
    await sleep(3800);

    // 2. The one number.
    await say("Fin answers that. One number: the time your whole day ends.");
    await sleep(5200);

    // 3. Adding a task moves the number.
    await say("Add a task with an estimate…");
    await sleep(1600);
    await tap("タスクを追加する");
    await sleep(1400);
    const nameField = await page.$('input[placeholder="何をする？"]');
    if (nameField) {
      await nameField.click();
      await page.keyboard.type("夕飯をつくる", { delay: 120 });
      await sleep(900);
      // The submit button sits at the bottom of a scrolling sheet, where a
      // coordinate click is unreliable. Ask the form to submit itself.
      await page.evaluate(() => {
        const form = document.querySelector("form");
        if (form) form.requestSubmit();
      });
    }
    await settle();
    // The sheet must be gone before the next caption claims the list changed.
    await page
      .waitForFunction(() => !document.querySelector('input[placeholder="何をする？"]'), { timeout: 6000 })
      .catch(() => console.warn("warning: the add sheet did not close"));
    await sleep(1200);
    await say("…and the number moves.");
    await sleep(4200);

    // 4. One task at a time. The route change is the app's own, so the
    // caption survives it — a reload would blank the overlay.
    await say("Start one, and nothing else is on the screen.");
    await sleep(1900);
    await tapTask("週報を書く");
    await settle();
    await page.waitForFunction(() => location.pathname.includes("screen-2"), { timeout: 6000 })
      .catch(() => console.warn("warning: did not reach the running screen"));
    await sleep(4400);
    await say("It never advances on its own. Finishing is your decision.");
    await sleep(5000);

    // 5. What it deliberately does not do, said over the screen that proves it.
    await say("No streaks. No overdue red.");
    await sleep(3600);
    await say("No weekly report of what you failed to do.");
    await sleep(4200);

    // 6. Completing returns home on its own, which is also how the number
    // moving back gets shown without navigating backwards.
    await say("Finish it early…");
    await sleep(1700);
    await tap("タスクを完了");
    await settle();
    await sleep(1800);
    await say("…and the number moves back.");
    await sleep(4600);

    await say("Your tasks never leave the device. No account, no sign-up.");
    await sleep(4800);

    await say("The same app runs in a browser. Nothing to install.");
    await sleep(4600);

    await say("Fin — fin-app.xyz");
    await sleep(4200);
    await say("");
    await sleep(1400);

    await recorder.stop();
    console.log(`wrote ${OUT_FILE}`);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
