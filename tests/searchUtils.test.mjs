import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { Script } from 'node:vm';
import ts from 'typescript';

function loadSearchUtilsModule() {
  const source = readFileSync(new URL('../src/searchUtils.ts', import.meta.url), 'utf8');
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

const {
  getHighlightSegments,
  isSearchMode,
  normalizeFavoriteFolderPaths,
  normalizeSearchQuery,
  shouldSearchContent,
} = loadSearchUtilsModule();

function sameRealm(value) {
  return JSON.parse(JSON.stringify(value));
}

test('validates supported search modes', () => {
  assert.equal(isSearchMode('name'), true);
  assert.equal(isSearchMode('full-text'), true);
  assert.equal(isSearchMode('recent'), false);
  assert.equal(isSearchMode(null), false);
});

test('normalizes search query', () => {
  assert.equal(normalizeSearchQuery('  XLSX  '), 'xlsx');
});

test('content search only runs in full-text mode', () => {
  assert.equal(shouldSearchContent('name'), false);
  assert.equal(shouldSearchContent('full-text'), true);
});

test('splits label into case-insensitive highlight segments', () => {
  assert.deepEqual(sameRealm(getHighlightSegments('March_1-15.xlsx', 'XLS')), [
    { text: 'March_1-15.', match: false },
    { text: 'xls', match: true },
    { text: 'x', match: false },
  ]);
});

test('returns a single non-match segment for empty query', () => {
  assert.deepEqual(sameRealm(getHighlightSegments('skill.md', '')), [
    { text: 'skill.md', match: false },
  ]);
});

test('deduplicates favorite paths while preserving order', () => {
  assert.deepEqual(
    sameRealm(normalizeFavoriteFolderPaths(['', '00_Base', 'skills', '00_Base', '  ', 12, 'team-skills'])),
    ['', '00_Base', 'skills', 'team-skills']
  );
});
