# Plan: Fix Display Deprecation Review - 2026-06-08

## Goal

Fix the Obsidian community review warning for deprecated `PluginSettingTab.display()` usage and publish patch release `1.1.1`.

## Steps

- [x] Confirm current source warning and release state.
- [x] Update the Obsidian API dependency to `1.13.0`.
- [x] Migrate the settings tab from imperative `display()` rendering to declarative `getSettingDefinitions()`.
- [x] Bump release metadata to `1.1.1` with `minAppVersion` `1.13.0`.
- [x] Run tests, build, and source cleanup checks.
- [ ] Commit, push to `1spread/main`, tag `1.1.1`, and verify the GitHub Release.

## Notes

- The clipboard recommendation is expected because Folder Focus has a deliberate "Copy path(s)" command.
- No dual support is planned for Obsidian versions older than `1.13.0`.

## Verification

- `rg -n "display\\(|this\\.display" src/main.ts` returned no matches.
- `rg -n "getSettingDefinitions|SettingDefinitionItem" src/main.ts` confirms the declarative settings API is used.
- `npm run test` passed.
- `npm run build` passed.
- Manual Obsidian settings UI smoke testing was not run in this automated workspace.
