# Obsidian Terminal Error Plan 2026-06-09

## Goal

Obsidian の右上に出る `Terminal exited: 1` 通知と、左側 Terminal ペイン内で繰り返し表示される hook error の原因を特定し、見えるエラーを止める。

## Follow-up Goal

ユーザー許可に基づき、不要な通知・音声・古い prompt 型 hook を削除して、Obsidian 内 Terminal のノイズをさらに減らす。

## Current Evidence

- Obsidian の Terminal ペインに `UserPromptSubmit hook error` が表示されている。
- エラー本文に `/Applications/superwhisper.app/Contents/Resources/claude-hook: No such file or directory` が含まれている。
- 右上通知は Terminal プラグインが終了コード 1 のプロセス終了を通知している可能性が高い。

## Steps

1. Obsidian vault と user-level の hook 設定を確認する。
2. 存在しない `superwhisper` hook 参照を特定する。
3. 非必須の通知 hook を無効化または安全化して、Terminal が失敗終了しないようにする。
4. 設定変更後に原因と残る確認事項をまとめる。

## Progress

- [x] 画面上のエラーメッセージを確認。
- [x] 過去メモから同種の hook noise の既知対応を確認。
- [x] hook 設定ファイルを確認。
- [x] 必要な設定修正を実施。
- [x] JSON と該当 hook 種別を検証。
- [x] 結果を報告。
- [x] 不要 hook の追加削除。
- [x] 追加削除後の検証。

## Changes Made

- `/Users/das/.claude/settings.json`
  - `superwhisper@superwhisper` を無効化。
  - 理由: `/Applications/superwhisper.app/Contents/Resources/claude-hook` が存在せず、`UserPromptSubmit` 時に失敗していたため。
- `/Users/das/.claude/plugins/cache/agricidaniel-claude-obsidian/claude-obsidian/1.9.2/hooks/hooks.json`
  - `SessionStart` の prompt 型 hook を削除し、command 型 hook のみに変更。
  - 理由: prompt 型 hook は `SessionStart` ではサポートされず、起動時に失敗していたため。
- `/Users/das/.claude/plugins/marketplaces/AgriciDaniel-claude-obsidian/hooks/hooks.json`
  - 同じ `SessionStart` prompt 型 hook を削除。

## Verification

- JSON parse: OK
- `superwhisper@superwhisper`: `false`
- claude-obsidian `SessionStart` hook types: `command,command`

## Follow-up Changes

- `/Users/das/.claude/settings.json`
  - `Notification` hook を削除。
  - `SessionStart` / `SessionEnd` / `UserPromptSubmit` / `Stop` / `PostToolUseFailure` / `PermissionRequest` から Superset 通知 hook を削除。
  - `PostToolUse` から Superset 通知 hook を削除。
- claude-obsidian plugin hook files
  - `PostCompact` prompt 型 hook を削除。

## Follow-up Verification

- JSON parse: OK
- `superwhisper@superwhisper`: `false`
- 残存 user hook events: `PreToolUse,PostToolUse`
- claude-obsidian hook events: `SessionStart,PostToolUse,Stop`
- 対象ファイル内に `SUPERSET_HOME_DIR`、有効状態の `superwhisper@superwhisper`、`/Applications/superwhisper.app`、`PostCompact`、prompt 型 hook が残っていないことを確認。
