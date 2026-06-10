import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { Script } from 'node:vm';
import ts from 'typescript';

function loadSortUtilsModule() {
  const source = readFileSync(new URL('../src/sortUtils.ts', import.meta.url), 'utf8');
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

const { sortVaultItems } = loadSortUtilsModule();

function names(items) {
  return JSON.parse(JSON.stringify(items.map((item) => item.name)));
}

const options = {
  isFolder: (item) => item.kind === 'folder',
  getModifiedTime: (item) => item.mtime ?? 0,
  getCreatedTime: (item) => item.ctime ?? 0,
};

test('sorts matched search results by created time', () => {
  const items = [
    { kind: 'file', name: 'older.html', ctime: 10, mtime: 30 },
    { kind: 'file', name: 'newer.html', ctime: 30, mtime: 10 },
    { kind: 'file', name: 'middle.html', ctime: 20, mtime: 20 },
  ];

  assert.deepEqual(
    names(sortVaultItems(items, { ...options, sortOrder: 'created', sortDirection: 'desc' })),
    ['newer.html', 'middle.html', 'older.html']
  );
});

test('sorts matched search results by modified time', () => {
  const items = [
    { kind: 'file', name: 'old-modified.html', ctime: 30, mtime: 10 },
    { kind: 'file', name: 'new-modified.html', ctime: 10, mtime: 30 },
  ];

  assert.deepEqual(
    names(sortVaultItems(items, { ...options, sortOrder: 'modified', sortDirection: 'desc' })),
    ['new-modified.html', 'old-modified.html']
  );
});

test('keeps folders before files when sorting filtered items', () => {
  const items = [
    { kind: 'file', name: 'aaa.html', ctime: 30, mtime: 30 },
    { kind: 'folder', name: 'zzz-folder', ctime: 0, mtime: 0 },
  ];

  assert.deepEqual(
    names(sortVaultItems(items, { ...options, sortOrder: 'name', sortDirection: 'asc' })),
    ['zzz-folder', 'aaa.html']
  );
});
