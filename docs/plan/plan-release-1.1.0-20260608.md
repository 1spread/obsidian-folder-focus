# Plan: Release 1.1.0 - 2026-06-08

## Goal

Publish the `1.1.0` Obsidian plugin release from `main`.

## Steps

- [x] Confirm `main` is clean and tracking `1spread/main`.
- [x] Confirm `1.1.0` version metadata exists.
- [x] Confirm `1.1.0` tag does not already exist locally.
- [x] Confirm tag push triggers the release workflow.
- [x] Commit this release plan.
- [x] Create the `1.1.0` tag on the current `main` commit.
- [x] Push the `1.1.0` tag to `1spread`.
- [x] Watch the GitHub Actions release workflow.
- [x] Verify the GitHub Release exists and includes release assets.
- [x] Record final result.

## Notes

- Use `1spread` as the canonical release remote.
- The release workflow attaches `main.js`, `manifest.json`, and `styles.css`.

## Verification

- Pushed tag `1.1.0` to `1spread`.
- GitHub Actions run `27143036124` completed successfully.
- GitHub Release `1.1.0` is published and is not a draft or prerelease.
- Release assets verified:
  - `main.js`
  - `manifest.json`
  - `styles.css`

## Follow-up

- GitHub Actions reported a Node.js 20 deprecation annotation for `actions/checkout@v4` and `actions/setup-node@v4`. This did not block the `1.1.0` release, but the workflow should be updated before GitHub removes Node.js 20 runner support.
