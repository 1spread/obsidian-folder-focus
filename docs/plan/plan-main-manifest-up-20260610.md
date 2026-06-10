# Plan: Main Manifest Up

## Goal

Finalize the current fixes on `main`, bump plugin manifest/package metadata for a patch release, verify, commit, and push.

## Checklist

- [x] Confirm current branch and dirty worktree state.
- [x] Confirm current manifest/package version.
- [x] Bump release metadata to `1.1.2`.
- [x] Update changelog and README release version.
- [x] Run tests, build, and diff checks.
- [x] Commit changes on `main`.
- [x] Push `main`.

## Notes

- Current branch is already `main`, so no branch merge is needed.
- Current version before this task is `1.1.1`.
- Included pending user-facing fixes: file rename context menu, visible header icons, responsive search mode tabs, and sorted filtered search results.

## Verification

- `npm run test` passed: 11 tests.
- `npm run build` passed.
- `git diff --check` passed.

## Commit

- Created the release commit on `main`.

## Push

- Pushed `main` to `1spread/obsidian-folder-focus`.

## Release Follow-up

- [x] Confirmed GitHub Release `1.1.2` was missing after the manifest bump.
- [x] Confirmed local tag `1.1.2` was missing.
- [x] Push tag `1.1.2` to trigger the release workflow.
- [x] Verify the GitHub Actions release workflow completes.
- [x] Verify GitHub Release `1.1.2` exists with release assets.

## Release Verification

- Pushed tag `1.1.2`.
- GitHub Actions run `27266353092` completed successfully.
- GitHub Release `1.1.2` is published and is not draft/prerelease.
- Release assets verified: `main.js`, `manifest.json`, `styles.css`.
