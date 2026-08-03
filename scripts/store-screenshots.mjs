/**
 * Capture the real app at App Store / Devpost screenshot size.
 *
 * The store asks for 1179x2556 with no device frame, which is an iPhone 15 Pro
 * viewport (393x852) at 3x. Rendering the running app at that scale gives the
 * actual screen rather than a mockup that drifts from it.
 *
 * Usage:
 *   npm run dev            # in another terminal
 *   node scripts/store-screenshots.mjs [baseUrl]
 */
import { launch } from "puppeteer-core";
import { mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";

const BASE_URL = process.argv[2] ?? "http://localhost:3000";
const OUT_DIR = "docs/screenshots/store";

const VIEWPORT = { width: 393, height: 852, deviceScaleFactor: 3, isMobile: true, hasTouch: true };

const CHROME_CANDIDATES = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "/usr/bin/google-chrome",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
];

/**
 * Screenshots taken at 2am show a finish time of 4:16, which reads as a bug
 * rather than a feature. Hold the page clock at an ordinary weekday afternoon
 * so the one number the app is about lands where a reader expects it.
 */
const STAGED_CLOCK = new Date("2026-08-04T14:20:00+09:00").getTime();

const MINUTE = 60_000;

function stagedTasks(now) {
  const base = {
    subtasks: [],
    startedAt: null,
    runStartedAt: null,
    deadlineAt: null,
    remainingMsAtPause: null,
    accumulatedActiveMs: 0,
    completedAt: null,
    completionReason: null,
  };
  return [
    // Two finished this morning, so the report screen has something to report.
    { ...base, id: "a", icon: "mail", title: "郵便を出す", estimateMs: 10 * MINUTE, order: 0,
      status: "completed", createdAt: now - 300 * MINUTE, startedAt: now - 290 * MINUTE,
      accumulatedActiveMs: 8 * MINUTE, completedAt: now - 282 * MINUTE, completionReason: "manual" },
    { ...base, id: "b", icon: "local_laundry_service", title: "洗濯を回す", estimateMs: 15 * MINUTE, order: 1,
      status: "completed", createdAt: now - 300 * MINUTE, startedAt: now - 260 * MINUTE,
      accumulatedActiveMs: 17 * MINUTE, completedAt: now - 243 * MINUTE, completionReason: "elapsed" },
    // Running now, a little over half way through.
    { ...base, id: "c", icon: "description", title: "週報を書く", estimateMs: 45 * MINUTE, order: 2,
      status: "running", createdAt: now - 300 * MINUTE, startedAt: now - 26 * MINUTE,
      runStartedAt: now - 26 * MINUTE, deadlineAt: now + 19 * MINUTE },
    { ...base, id: "d", icon: "menu_book", title: "論文を1本読む", estimateMs: 60 * MINUTE, order: 3, status: "idle", createdAt: now - 300 * MINUTE },
    { ...base, id: "e", icon: "cleaning_services", title: "机の上を片づける", estimateMs: 30 * MINUTE, order: 4, status: "idle", createdAt: now - 300 * MINUTE },
    { ...base, id: "f", icon: "restaurant", title: "夕飯をつくる", estimateMs: 40 * MINUTE, order: 5, status: "idle", createdAt: now - 300 * MINUTE },
  ];
}

function seedValues(now) {
  return {
    // Onboarding redirects away from every screen until this is set.
    "fin-onboarded": "1",
    "fin.theme": "light",
    "fin.task-state": JSON.stringify({ schemaVersion: 1, savedAt: now, tasks: stagedTasks(now), activeTaskId: "c" }),
  };
}

const SHOTS = [
  { name: "01-home", path: "/" },
  { name: "02-running", path: "/screen-2?taskId=c" },
  { name: "03-report", path: "/screen-5" },
  { name: "04-pro", path: "/screen-6" },
  { name: "05-settings", path: "/settings" },
];

function findChrome() {
  const found = CHROME_CANDIDATES.find((p) => existsSync(p));
  if (!found) throw new Error(`no Chrome build found; looked in:\n${CHROME_CANDIDATES.join("\n")}`);
  return found;
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const browser = await launch({ executablePath: findChrome(), headless: "new", defaultViewport: VIEWPORT });
  try {
    const page = await browser.newPage();

    // Shift rather than freeze: the countdown has to keep ticking for the
    // running screen to render a live remainder.
    const offset = STAGED_CLOCK - Date.now();
    await page.evaluateOnNewDocument((ms) => {
      const RealDate = Date;
      class StagedDate extends RealDate {
        constructor(...args) {
          if (args.length === 0) super(RealDate.now() + ms);
          else super(...args);
        }
        static now() {
          return RealDate.now() + ms;
        }
      }
      window.Date = StagedDate;
    }, offset);

    // localStorage is origin-scoped, so it can only be seeded after a first load.
    await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
    await page.evaluate((seed) => {
      for (const [key, value] of Object.entries(seed)) window.localStorage.setItem(key, value);
    }, seedValues(STAGED_CLOCK));

    // `next dev` paints its own indicator button into a <nextjs-portal>, which
    // otherwise lands in the corner of every capture.
    await page.evaluateOnNewDocument(() => {
      const style = document.createElement("style");
      style.textContent = "nextjs-portal, #__next-build-watcher { display: none !important; }";
      document.addEventListener("DOMContentLoaded", () => document.head.appendChild(style));
    });

    for (const shot of SHOTS) {
      await page.goto(`${BASE_URL}${shot.path}`, { waitUntil: "networkidle0" });
      // The clock and the countdown both settle a frame after hydration.
      await new Promise((resolve) => setTimeout(resolve, 900));
      const file = `${OUT_DIR}/${shot.name}.png`;
      await page.screenshot({ path: file });
      console.log(`captured ${shot.path} -> ${file}`);
    }
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
