# Copy Folder Path Button Plan

## Overview

- Task name: Add one-click folder path copy button
- Created: 2026-06-19
- Repository: `tool_obsidian-folder-focus`
- Current version observed: `1.1.2`
- Requested outcome: Add a button that copies the currently focused folder path, then publish it as a version update on GitHub.
- Background: The Folder Focus sidebar currently shows the focused folder path as text, but copying it requires manual selection or another workaround.
- Current context: The existing repository has prior release flow memory around tag-driven version updates. Current live version and branch state must be verified before release.

## Goal / KPI

- Final goal: Users can copy the currently focused folder path with one click from the Folder Focus UI.
- Success conditions:
  - A visible copy button is added near the current folder path display.
  - Clicking the button copies the full folder path, not the truncated display text.
  - The UI gives clear feedback after copy success or failure.
  - Existing sorting, filtering, and file list behavior are not regressed.
  - Version is bumped consistently across `package.json`, `manifest.json`, and `versions.json` if required by the repo release flow.
  - Build and tests pass.
  - Changes are committed and pushed to GitHub.

## Deliverables

- Code change for the copy-folder-path button.
- Styling update if needed.
- Tests or focused verification for copy behavior where feasible.
- Version bump and changelog/update notes if the repo convention requires it.
- Git commit and GitHub push.

## Scope

- Add a copy action for the currently focused folder path.
- Use the existing Obsidian/plugin UI patterns already present in this repo.
- Preserve the existing compact sidebar layout shown in the provided screenshot.
- Verify with the repo's existing test/build commands.
- Publish as a version update through the repo's current GitHub workflow.

## Non-Scope

- Redesigning the whole Folder Focus toolbar.
- Changing search behavior, sorting behavior, or file result rendering.
- Adding a generalized command palette action unless the existing code structure makes it trivial and low risk.
- Changing unrelated existing files or the untracked `docs/plan/plan-gh-account-ignite-20260610.md`.

## Requirements

- P0: Copy the actual full folder path to clipboard.
- P0: Button must be easy to discover and usable in the narrow sidebar layout.
- P0: Do not break existing folder navigation or current file listing behavior.
- P0: Run build/tests before release.
- P0: Push to GitHub after implementation and version update.
- P1: Add success/failure feedback using Obsidian-native notice or existing local pattern.
- P1: Keep visual style consistent with existing icon buttons.
- P1: Avoid layout overflow at mobile/narrow widths similar to the screenshot.
- P2: Add/update tests for helper behavior if the clipboard interaction can be tested without brittle DOM mocking.

## Priority

- P0: Locate current folder path rendering and clipboard-safe implementation point.
- P0: Implement copy button and version bump.
- P0: Build/test and commit/push.
- P1: UX polish and narrow-width check.
- P2: Additional automated coverage if practical.

## Task Breakdown

1. Inspect current UI rendering code for the focused folder header/path area.
2. Identify existing helper patterns for icon buttons, notices, and clipboard access.
3. Implement a compact copy path button near the folder path display.
4. Ensure the copied value uses the full folder path source, not the truncated UI label.
5. Add or adjust styles to preserve narrow sidebar layout.
6. Run tests and build.
7. Perform a focused code review and Red Team review.
8. Bump version and update release metadata as required.
9. Commit and push to GitHub.

## Agent Assignment

- Main session: Requirements, design decisions, final review, release judgment.
- Execution Agent: Code implementation, version metadata update, local verification.
- Review Agent: Diff review for regressions and release readiness.
- Red Team Agent: Check for weak assumptions such as clipboard API compatibility, truncated path bugs, and layout overflow.

## Facts / Hypotheses / Opinions

### Facts

- User requested a one-click button to copy the folder path.
- Screenshot shows a current path text row in the Folder Focus sidebar.
- `package.json` and `manifest.json` currently show version `1.1.2`.
- There is an unrelated untracked plan file: `docs/plan/plan-gh-account-ignite-20260610.md`.
- Work is currently on `codex/folder-path-search`, which already contains a pending folder-path search feature not present on `main`.

### Hypotheses

- The path row is rendered in the main plugin view code under `src/`.
- Obsidian's clipboard behavior can be handled through `navigator.clipboard.writeText` or an existing local abstraction.
- A patch version bump is likely appropriate unless the repo's release convention says otherwise.

### Opinions

- The button should sit beside the path text, likely as an icon-only button with tooltip/title, to avoid crowding the sidebar.
- Copy success should use a short native notice rather than persistent in-panel text.
- The release should be kept tight: one UI feature, one version bump, one push.

## Risks

- Clipboard API may behave differently in Obsidian desktop/mobile contexts.
- Narrow sidebar layout may overflow if the button is placed poorly.
- Copying displayed/truncated text instead of the real folder path would silently fail the user need.
- Version metadata may need consistent updates in more than one file.
- Existing untracked file must not be accidentally included in the release commit.

## Open Questions

- Exact button placement: beside the visible folder path row or in the header toolbar.
- Exact copy text format: vault-relative folder path is assumed because the UI displays vault-relative paths.
- Release method: confirm current branch/tag workflow before pushing.

## Decision Log

| Date | Decision | Reason | Alternatives | Impact |
|---|---|---|---|---|
| 2026-06-19 | Use a compact icon button near the folder path display | Matches the screenshot context and keeps the action close to the target path | Add command palette command only; add toolbar button only | Better discoverability and fewer clicks |
| 2026-06-19 | Treat copied path as full vault-relative path | UI appears to show vault-relative folder path and this is most useful inside Obsidian | Copy absolute filesystem path | Avoids exposing local machine paths and matches displayed context |
| 2026-06-19 | Implement after user approval via `DOIT` | User explicitly approved execution after plan creation | Keep plan-only state | Allows implementation, version bump, verification, commit, and push |
| 2026-06-19 | Release as `1.1.3` patch update | This is a small additive UI feature over `1.1.2` | Minor version bump | Keeps versioning proportional to change size |
| 2026-06-19 | Include the pending folder-path search item in the `1.1.3` changelog | The active branch already contains that feature, so the release notes should match shipped code | Omit the note and mention only copy path | Avoids an incomplete release note if this branch is tagged |

## Review Criteria

- The button is visible and does not crowd the sidebar.
- The copied path is the full path.
- Empty/root folder state behaves sensibly.
- Clipboard failure is handled gracefully.
- Existing tests/build pass.
- Version bump is consistent.
- Commit includes only intended files.
- GitHub push succeeds.

## Completion Criteria

- Plan is approved by the user.
- Implementation is complete.
- Build/tests pass or any failure is explicitly explained.
- Red Team review has no P0/P1 unresolved issues.
- Version bump is committed.
- Changes are pushed to GitHub.
