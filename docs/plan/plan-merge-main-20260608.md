# Plan: Merge 1.1.0 Feature Branch Into Main - 2026-06-08

## Goal

Merge `codex/favorites-search-drag-feedback` into `main` and push the updated `main` branch to the canonical `1spread` remote.

## Steps

- [x] Confirm current branch and worktree are clean.
- [x] Confirm canonical remote is `1spread`.
- [x] Fetch latest `1spread/main`.
- [x] Switch to `main`.
- [x] Update local `main` from `1spread/main`.
- [x] Merge `codex/favorites-search-drag-feedback` into `main`.
- [x] Run verification after merge.
- [x] Push `main` to `1spread`.
- [x] Record final result.

## Notes

- `origin` points to a different repository owner, so use `1spread` for the upstream merge push.
- Do not create or push a release tag unless that is explicitly chosen as part of the release step.

## Verification

- `npm run test` passed on `main` after merge.
- `npm run build` passed on `main` after merge.
- `git diff --check HEAD~1 HEAD` passed after merge.
- Pushed `main` to `1spread`.
