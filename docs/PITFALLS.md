# Project pitfalls

Record verified project-specific failure modes. For each entry include symptoms, root cause, safe fix, verification, and affected areas. Do not store credentials or personal data.

Use companion harness instructions when existing project instruction files must remain unchanged.

## Build and deployment

### Delegate `npm run build` corrupts a concurrently running `next dev` cache
- Symptoms: after a Codex delegate task runs its own `npm run build` verification, the already-running `next dev` preview server starts throwing `Cannot find module './...'` and client buttons/interactivity silently stop working (page looks static, no console error visible to the user).
- Root cause: both processes write to the same `.next/` directory. A production build running while `next dev` is also writing to it corrupts the dev server's manifest.
- Safe fix: stop the dev preview server, `rm -rf .next`, restart `next dev`. Confirm with `preview_logs` (no errors) before telling the owner it's fixed.
- Verification: reload the page and exercise the previously-broken interaction (e.g. toggle buttons) via `read_page`/`get_page_text`, not just a build-success message.
- Affected areas: any Codex-delegated task whose verification step is `npm run build`/`npm.cmd run build`, run while a local dev preview server is active.

### Codex-delegated edits can corrupt Japanese string literals (mojibake)
- Symptoms: after a Codex delegate task edits a file containing Japanese text, some hardcoded JSX string literals render as mojibake (garbled half-width katakana like `繝繝ｼ繧ｯ`) while dynamically-injected text (e.g. from URL query params) renders fine. `file`/`.next` cache clearing does not fix it — the bad bytes are baked into the source file itself.
- Root cause: on Windows, the delegate wrote the file via a PowerShell pipeline; PowerShell's non-UTF8 default text encoding on some code paths mangles non-ASCII literals it round-trips through the shell, even though the file is still valid UTF-8 overall (so `file` reports it as fine).
- Safe fix: `Read` the file, spot the garbled runs, and replace them with correct Japanese by exact byte-offset (not a plain string `.replace`/`Edit old_string` match — the corrupted run can contain an invisible stray control character, e.g. U+0080, that a manually-typed replacement string won't match). Verify with a script that greps for suspicious katakana-half-width runs across every file the delegate touched, not just the one you noticed.
- Verification: after fixing, reload in the browser and read the actual DOM `textContent` (not just a build-success message) to confirm the fix rendered.
- Affected areas: any Codex-delegated task on this Windows machine that edits a file with Japanese (or other multi-byte) string literals.

### Codex delegate rewrites unrelated existing copy while adding a feature
- Symptoms: a delegate task scoped to "add X to file Y" also silently rewrites Y's pre-existing UI text (labels, help text) that had nothing to do with the requested change. The rewritten text can be subtly wrong (e.g. describing an animation direction that doesn't match the actual CSS behavior) while still passing the mojibake/encoding checks, since it's new text written correctly, just factually incorrect and unrequested.
- Root cause: when a delegate edits a file, it isn't reliably treating pre-existing strings as immutable just because the Task Brief didn't mention them — it can "helpfully" rephrase things it touches on the way.
- Safe fix: after any delegate task, diff the touched files' pre-existing copy (not just the new copy) against what was there before, and restore anything that was rewritten without being asked. Don't just check the new acceptance criteria — check for unrequested changes too.
- Verification: `git diff` (or manual before/after comparison) on every owned file, not just the lines the task was supposed to add.
- Affected areas: any delegate task that edits a file with existing, unrelated Japanese UI copy nearby the new code.

## Authentication and authorization

## Data and migrations

## UI and client behavior

## External services
