# README Update and Link Check Plan - 2026-06-08

## Goal

Update `README.md` so it reflects the current plugin state and does not contain broken links.

## Checklist

- [x] Inspect current README, changelog, manifest, and package metadata.
- [x] Update README with current features and release/install links.
- [x] Check local and external README links.
- [x] Run project verification where relevant.
- [x] Record final verification results.
- [x] Add README screenshots and supported file type list.
- [x] Convert provided MP4 demo to README-friendly GIF.
- [x] Add GIF demo to README and verify links/assets again.

## Notes

- Current package/manifest version: `1.0.7`.
- README currently omits recent fixes and file/import feature updates from `CHANGELOG.md`.
- Removed the broken Obsidian release submission PR link after it returned `404`.
- Confirmed `folder-focus` is present in Obsidian's official community plugin list, with the current "not manually reviewed by Obsidian staff" description.
- Added screenshots to `docs/assets/`:
  - `folder-focus-base-view.png`
  - `folder-focus-search-badges.png`
- Added supported file extension table based on `src/fileTypeBadge.ts`.
- Confirmed remaining README links:
  - `https://obsidian.md` returned `200`.
  - `https://github.com/1spread/obsidian-folder-focus/releases/latest` returned `302` to `1.0.7`.
  - `https://github.com/1spread/obsidian-folder-focus.git` returned `301` to the repository page.
  - `https://buymeacoffee.com/1spread` returned `200`.
  - `CHANGELOG.md` and `LICENSE` exist locally.
- Verification passed:
  - `npm run test`
  - `npm run build`
- Re-verified after adding screenshots and supported extensions:
  - README image files exist locally.
  - README external links still returned `200`, `301`, or `302`.
  - `CHANGELOG.md` and `LICENSE` still exist locally.
  - `npm run test`
  - `npm run build`
- New requested demo video:
  - Source: `/Users/das/Downloads/Obsidian - report_2026-05 - client_kokka - Obsidian 1.13.0 - 2 June 2026.mp4`
  - Duration: about 13.1 seconds.
  - Resolution: `472x1080`.
- Generated GIF:
  - Path: `docs/assets/folder-focus-demo.gif`
  - Output size: about `942K`.
  - Output resolution: `360x824`.
- Verification after GIF addition:
  - GIF file exists locally.
  - README image and local file references exist locally.
  - `npm run test`
  - `npm run build`
