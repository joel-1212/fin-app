# Agent coordination

The main task owns scope, final decisions, and owner communication. At session start, read current work, the latest memo/state, and bounded improvement counts. Delegates receive bounded Task Briefs and explicit file ownership. Register active work in `.harness/current-work.md` before edits. Never assign the same file to two active editors. The adaptive router uses anonymous capability tiers: Minimal work is direct, Standard work uses one balanced implementer, and research/review are opt-in for higher-risk work. Research returns facts; implementation changes only assigned files; review is independent and read-only. Keep project-owned instructions intact: harness guidance belongs in its companion files when those instructions already exist. Local commits after verification are automatic; push, deployment, production writes, migration, deletion, and irreversible operations remain owner-gated.

Cross-host execution is optional. If unavailable, retain a sufficient same-host tier or request owner handoff.

Verification is proportional: use the nearest focused check for tiny changes and expand only for shared/public/high-risk/release work, a failing check, or an owner request. Do not run the full suite or package validator on every iteration.
