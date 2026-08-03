# Claude project instructions

<!-- app-dev-harness:shared-tooling begin -->
## Shared app development harness
- Plugin: `app-dev-harness`
- Minimum core version: `0.2.6`
- Bootstrap revision: `1`
- Bootstrap digest: `sha256:3041019fda976b685b4e49e2299fb3fdb26f13a0d1006fb91c1ef4da721a991a`
- Connection: Load the shared harness guidance explicitly from @AGENTS.md.
- Doctor: Use the read-only doctor to report bootstrap drift; it must not edit project instructions.
- Companion: `AGENTS.md`
- Priority: Project-specific instructions outside this managed block take priority.
<!-- app-dev-harness:shared-tooling end -->

Harness companion guidance applies alongside the project's own instructions. At session start read `.harness/current-work.md`, the latest memo/state, and bounded improvement counts. Preserve unrelated changes; the adaptive router uses anonymous capability tiers and keeps Minimal work direct. Keep push, deploy, migration, production-write, destructive, and permission-changing actions owner-gated. Local commits after verification are automatic.

Cross-host execution is optional. If unavailable, retain a sufficient same-host tier or request owner handoff.

Verification is proportional: use the nearest focused check for tiny changes and expand only for shared/public/high-risk/release work, a failing check, or an owner request. Do not run the full suite or package validator on every iteration.

## Project

- Name: fin
- Stack: node

## Project-specific constraints

- 実装フェーズの細かい作業（コーディング、修正、リファクタ等）は、原則としてCodex（model: `gpt-5.6-terra`, effort: `xhigh`）に委譲する。認証・決済など機微な実装はlunaに格上げ。詳細は `AGENTS.md` を参照
