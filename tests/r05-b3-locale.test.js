import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_LOCALE, LOCALE_STORAGE_KEY, normalizeLocale } from '../src/domain/localization/locale.constants.js';
import { createLocaleStorage } from '../src/infrastructure/persistence/localization/locale-storage.js';
import { createLocaleService } from '../src/application/localization/locale-service.js';

test('normalization accepts only ru/en and defaults to ru', () => {
  assert.equal(normalizeLocale('ru'), 'ru');
  assert.equal(normalizeLocale('en'), 'en');
  assert.equal(normalizeLocale('es'), DEFAULT_LOCALE);
  assert.equal(normalizeLocale(null), DEFAULT_LOCALE);
});

test('storage uses the legacy nutrition-locale key', () => {
  const values = new Map([[LOCALE_STORAGE_KEY, 'en']]);
  const adapter = createLocaleStorage(() => ({
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value)
  }));
  assert.equal(adapter.read(), 'en');
  assert.equal(adapter.write('ru'), true);
  assert.equal(values.get(LOCALE_STORAGE_KEY), 'ru');
});

test('invalid stored value falls back to ru', () => {
  assert.equal(createLocaleStorage(() => ({ getItem: () => 'fr' })).read(), 'ru');
});

test('storage exceptions do not escape', () => {
  const adapter = createLocaleStorage(() => { throw new Error('blocked'); });
  assert.equal(adapter.read(), 'ru');
  assert.equal(adapter.write('en'), false);
});

test('service restores state and emits only real locale changes', () => {
  const writes = [], changes = [];
  const service = createLocaleService({
    storage: { read: () => 'en', write: value => writes.push(value) },
    onChange: value => changes.push(value)
  });
  assert.equal(service.getLocale(), 'en');
  assert.equal(service.initialize(), 'en');
  assert.deepEqual(changes, ['en']);
  assert.equal(service.setLocale('en').reason, 'unchanged');
  assert.equal(service.setLocale('ru').changed, true);
  assert.equal(service.setLocale('es').reason, 'unsupported-locale');
  assert.deepEqual(writes, ['ru']);
  assert.deepEqual(changes, ['en', 'ru']);
});
