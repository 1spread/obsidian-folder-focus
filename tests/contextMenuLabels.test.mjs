import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { Script } from 'node:vm';
import ts from 'typescript';

function loadContextMenuLabelsModule() {
  const source = readFileSync(new URL('../src/contextMenuLabels.ts', import.meta.url), 'utf8');
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText;

  const module = { exports: {} };
  const script = new Script(`((exports, module) => { ${transpiled}\n})`);
  script.runInNewContext()(module.exports, module);
  return module.exports;
}

const { getRenameMenuTitle } = loadContextMenuLabelsModule();

test('uses explicit rename labels for folder and file rows', () => {
  assert.equal(getRenameMenuTitle('folder'), 'Rename folder');
  assert.equal(getRenameMenuTitle('file'), 'Rename file');
});
