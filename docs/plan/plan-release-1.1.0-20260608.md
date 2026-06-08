# Plan: Release 1.1.0 - 2026-06-08

## Goal

Publish the `1.1.0` Obsidian plugin release from `main`.

## Steps

- [x] Confirm `main` is clean and tracking `1spread/main`.
- [x] Confirm `1.1.0` version metadata exists.
- [x] Confirm `1.1.0` tag does not already exist locally.
- [x] Confirm tag push triggers the release workflow.
- [ ] Commit this release plan.
- [ ] Create the `1.1.0` tag on the current `main` commit.
- [ ] Push the `1.1.0` tag to `1spread`.
- [ ] Watch the GitHub Actions release workflow.
- [ ] Verify the GitHub Release exists and includes release assets.
- [ ] Record final result.

## Notes

- Use `1spread` as the canonical release remote.
- The release workflow attaches `main.js`, `manifest.json`, and `styles.css`.
