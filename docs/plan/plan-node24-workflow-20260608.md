# Plan: Update Release Workflow to Node 24 - 2026-06-08

## Goal

Update the release workflow so GitHub Actions uses Node 24-compatible actions and builds with Node.js 24.

## Steps

- [x] Confirm the working tree is clean on `main`.
- [x] Check current release workflow configuration.
- [x] Verify current official action versions support Node 24.
- [x] Update `.github/workflows/release.yml`.
- [x] Validate the workflow syntax enough for this repository.
- [ ] Commit and push to `1spread/main`.
- [x] Record final result.

## Notes

- `actions/checkout@v6` uses `node24`.
- `actions/setup-node@v6` uses `node24`.
- `actions/attest@v4` already uses `node24`.

## Verification

- Parsed `.github/workflows/release.yml` with Ruby YAML successfully.
- `git diff --check` passed.
