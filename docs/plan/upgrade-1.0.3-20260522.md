# Upgrade 1.0.3 plan

- [x] Repo側のバージョン状態を確認する
  - `manifest.json`
  - `package.json`
  - `package-lock.json`
  - `versions.json`
  - `CHANGELOG.md`
- [x] ローカルObsidian plugin側の反映状態を確認する
  - `/Users/das/Documents/mac-obsidian/.obsidian/plugins/folder-focus/manifest.json`
  - `/Users/das/Documents/mac-obsidian/.obsidian/plugins/folder-focus/main.js`
  - `/Users/das/Documents/mac-obsidian/.obsidian/plugins/folder-focus/styles.css`
  - `/Users/das/Documents/mac-obsidian/.obsidian/community-plugins.json`
- [x] 必要な差分があれば `1.0.3` へ更新し、ローカルpluginフォルダへ反映する
- [x] `npm run build` でビルド確認する
- [x] `git diff --check` で差分の空白エラーを確認する
- [x] 結果をサマリーし、必要ならGit branch cleanupを実施する
