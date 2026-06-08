# keyCode Review Warning Fix - 2026-06-08

- [x] Confirm the review warning source in `src/FolderFocusView.ts`.
- [x] Replace deprecated `KeyboardEvent.keyCode` usage without removing IME-safe search handling.
- [x] Run project verification.
- [x] Prepare `1.0.7` release metadata for the review warning fix.
- [x] Re-run project verification after version updates.
- [x] Summarize changed files and verification results.

## Verification

- `npm run test` passed.
- `npm run build` passed.
- `git diff --check` passed.
- `rg -n "keyCode" src package.json manifest.json versions.json CHANGELOG.md docs/plan/plan-keycode-review-20260608.md` only finds changelog/plan references, not source code.
