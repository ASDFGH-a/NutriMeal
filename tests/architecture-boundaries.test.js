import assert from 'node:assert/strict';
import test from 'node:test';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const sourceRoot = fileURLToPath(new URL('../src/', import.meta.url));

function sourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return entry.isFile() && entry.name.endsWith('.js') ? [path] : [];
  });
}

function importedFiles(file) {
  const source = readFileSync(file, 'utf8');
  const specifiers = [...source.matchAll(/(?:\bfrom\s*|\bimport\s*(?:\(\s*)?)['"]([^'"]+)['"]/g)]
    .map((match) => match[1]);
  return specifiers
    .filter((specifier) => specifier.startsWith('.'))
    .map((specifier) => resolve(dirname(file), specifier));
}

function assertLayerDoesNotImport(layer, forbiddenLayers) {
  const root = join(sourceRoot, layer);
  for (const file of sourceFiles(root)) {
    const fileName = relative(sourceRoot, file);
    for (const importedFile of importedFiles(file)) {
      const importedPath = relative(sourceRoot, importedFile);
      for (const forbiddenLayer of forbiddenLayers) {
        assert.ok(
          !importedPath.startsWith(`${forbiddenLayer}${sep}`),
          `${fileName} must not import ${importedPath}`
        );
      }
    }

    const source = readFileSync(file, 'utf8');
    assert.doesNotMatch(
      source,
      /\b(?:window|document|localStorage)\s*(?:\.|\[)|\bglobalThis\.localStorage\b/,
      `${fileName} must not access browser APIs`
    );
  }
}

test('domain has no dependencies on contracts, application, infrastructure, or UI', () => {
  assertLayerDoesNotImport('domain', ['contracts', 'application', 'infrastructure', 'ui']);
});

test('application depends on domain and contracts, not infrastructure or UI', () => {
  assertLayerDoesNotImport('application', ['infrastructure', 'ui']);
});

test('UI persistence access is limited to the composition root', () => {
  const uiRoot = join(sourceRoot, 'ui');
  const compositionRoot = join(uiRoot, 'app', 'standalone-entry.js');
  for (const file of sourceFiles(uiRoot)) {
    if (file === compositionRoot) continue;

    const fileName = relative(sourceRoot, file);
    for (const importedFile of importedFiles(file)) {
      const importedPath = relative(sourceRoot, importedFile);
      assert.ok(
        !importedPath.startsWith(`infrastructure${sep}`),
        `${fileName} must not import ${importedPath}`
      );
    }

    const source = readFileSync(file, 'utf8');
    assert.doesNotMatch(
      source,
      /\blocalStorage\s*(?:\.|\[)|\bglobalThis\.localStorage\b/,
      `${fileName} must not access persistent storage`
    );
  }
});
