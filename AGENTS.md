# Project agent instructions

<!-- app-dev-harness:shared-tooling begin -->
## Shared app development harness
- Plugin: `app-dev-harness`
- Minimum core version: `0.2.6`
- Bootstrap revision: `1`
- Bootstrap digest: `sha256:3ae8ea5c323eb4a127cec7283bf85e42c5d9a2a354f71cb912806985e514a7ac`
- Connection: Use the installed plugin as the shared source for harness orchestration, verification, and safety guidance.
- Doctor: Use the read-only doctor to report bootstrap drift; it must not edit project instructions.
- Priority: Project-specific instructions outside this managed block take priority.
<!-- app-dev-harness:shared-tooling end -->

<!-- Harness companion guidance. If this project already had AGENTS.md, this content is written to .harness/AGENTS.harness.md instead. -->

## Project
- Name: fin
- Stack: node
- Production: configure-me

## Session rules
1. Follow installed `app-dev-harness` skills for orchestration, delegation, verification, audit, shipping, and improvement.
2. At session start, read `.harness/current-work.md`, the latest session memo/state, and the bounded improvement count before selecting the next task.
3. Before editing, register owned files in `.harness/current-work.md`; the adaptive router assigns anonymous capability tiers and keeps Minimal work direct.
4. Preserve unrelated changes and never let two agents edit the same file.
5. Read the relevant project pitfall before code changes.
6. Treat code and live-system evidence as more current than planning documents.
7. Cross-host execution is optional. If unavailable, retain a sufficient same-host tier or request owner handoff.
8. Verification is proportional: use the nearest focused check for tiny changes and expand only for shared/public/high-risk/release work, a failing check, or an owner request. Do not run the full suite or package validator on every iteration.

## Owner approval required
- push or publication (local commits after verification do not require approval)
- production deployment or production data writes
- schema migrations
- deletion, overwrite, or irreversible operations
- secret rotation or permission changes

## Project-specific constraints
- 実装フェーズの細かい作業（コーディング、修正、リファクタ等）は、原則としてCodex（model: `gpt-5.6-terra`, effort: `xhigh`）に委譲する。委譲時は `codex-cli-runtime` スキル経由で `--model gpt-5.6-terra --effort xhigh` を明示指定する（デフォルトのmodel/effort未指定ルールの例外として、このプロジェクトでは常に明示する）
  - 例外: 認証(Sign in with Apple)・決済(サブスク)など実際のセキュリティ・お金が絡む実装は `gpt-5.6-luna`(strong-reasoning)に格上げする。UIモックアップ段階ではterraで十分
- 設計判断・方針決定・オーナーとの壁打ちはClaude（この場）が担当し、Codexには確定済みの実装タスクのみを渡す
