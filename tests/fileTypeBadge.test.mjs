import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { Script } from 'node:vm';
import ts from 'typescript';

function loadFileTypeBadgeModule() {
  const source = readFileSync(new URL('../src/fileTypeBadge.ts', import.meta.url), 'utf8');
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

const { getFileTypeBadge } = loadFileTypeBadgeModule();

test('returns explicit badges for Obsidian and common work file types', () => {
  const cases = [
    ['base', { label: 'base', type: 'base', title: 'Obsidian Base file' }],
    ['py', { label: 'py', type: 'python', title: 'Python file' }],
    ['pptx', { label: 'ppt', type: 'presentation', title: 'PowerPoint presentation' }],
    ['xlsx', { label: 'xls', type: 'spreadsheet', title: 'Excel spreadsheet' }],
    ['pages', { label: 'pgs', type: 'document', title: 'Pages document' }],
    ['numbers', { label: 'num', type: 'spreadsheet', title: 'Numbers spreadsheet' }],
    ['key', { label: 'key', type: 'presentation', title: 'Keynote presentation' }],
    ['drawio', { label: 'draw', type: 'diagram', title: 'Diagram file' }],
    ['excalidraw', { label: 'draw', type: 'diagram', title: 'Excalidraw file' }],
    ['epub', { label: 'book', type: 'ebook', title: 'Ebook file' }],
    ['sqlite', { label: 'db', type: 'database', title: 'SQLite database' }],
    ['fig', { label: 'fig', type: 'design', title: 'Figma design file' }],
    ['psd', { label: 'psd', type: 'design', title: 'Photoshop file' }],
    ['ttf', { label: 'font', type: 'font', title: 'Font file' }],
  ];

  for (const [extension, expected] of cases) {
    assert.deepEqual({ ...getFileTypeBadge(extension) }, expected);
  }
});
