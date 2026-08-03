# Fin

**Fin tells you when your day actually ends.**

A task manager for people who struggle to start. You give each task an estimate; Fin gives you one number back — the time your whole day will be done.

Built for [RevenueCat Shipaton 2026](https://revenuecat-shipaton-2026.devpost.com/).

---

## Why this exists

Most task managers answer *"what should I do?"* Fin answers a different question: *"when will this be over?"*

A list of ten items tells you nothing about your day. It just sits there and grows. For people who have trouble starting — including people with ADHD — an open-ended list is the thing that makes starting impossible. You can't begin something with no visible end.

The second problem is tone. Most productivity apps are built to push: streaks, red overdue badges, weekly "you failed" summaries. The people who need the most help already feel bad about themselves. An app that scolds you gets deleted on exactly the day you needed it.

The design brief for Fin was one line: **don't blame the user.**

## What it does

- **Estimate a task, see your finish time.** Add "read the report — 20 min" and the number at the top moves. That single number turns an infinite list into a day with an end.
- **One task at a time.** When you start, Fin shows only the current task, full screen, counting down. Nothing else is on screen.
- **It never auto-advances.** Finishing is your decision, not a timer's.
- **Your data stays on your device.** No account, no sign-up, no server holding your tasks.

Deliberately absent: streaks, combos, red overdue states, guilt screens, feeds, social features, gamification.

## Try it

The whole app runs in the browser with nothing to install: **https://fin-app.xyz**

The iOS build is the same codebase wrapped with Capacitor.

## Stack

| Layer | Choice |
|---|---|
| App | Next.js 15 (App Router), React 19, TypeScript |
| Styling | Plain CSS with a small design-token layer (`app/globals.css`) |
| State | React context + reducer, persisted to `localStorage` |
| Native | Capacitor 7 (iOS), local notifications |
| Payments | RevenueCat (`@revenuecat/purchases-capacitor`) |
| Hosting | Vercel |
| iOS CI | Codemagic (builds and uploads without a Mac) |

## Layout

```
app/           routes — home, running task, report, paywall, settings, onboarding
components/    UI; timer/ holds the three countdown presentations
lib/           task state, time math, storage, purchases, notifications
docs/          design and engineering notes (see below)
```

Two files carry most of the reasoning:

- **`lib/task-state.ts`** — the reducer. Tasks carry an absolute deadline rather than a ticking remainder, so a backgrounded app, a device sleep, or a crossed midnight all reconcile correctly on the next read.
- **`lib/task-time.ts`** — the finish-time math that produces the one number the whole app is about.

Both have Node test files next to them (`*.test.mjs`).

## Running it

```bash
npm install
npm run dev
```

```bash
npm run typecheck
npm run build
```

Payments are native-only; in the browser `lib/purchases.ts` degrades to a no-op so the rest of the app stays usable. `NEXT_PUBLIC_REVENUECAT_PUBLIC_API_KEY` is only needed for native builds.

## Notes worth reading

- **`docs/design-prompts.md`** — the full design brief, including why the store screenshots are designed almost inversely to the app itself. A calm, low-contrast app disappears in an App Store grid.
- **`docs/PITFALLS.md`** — verified failure modes hit during this project, with root causes.
- **`docs/agent-coordination.md`** — this app was built with AI coding agents; this is how the work was split and kept from colliding.

## License

Apache License 2.0 — see [LICENSE](LICENSE).
