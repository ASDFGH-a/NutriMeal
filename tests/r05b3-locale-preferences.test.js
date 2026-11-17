import test from 'node:test';
import assert from 'node:assert/strict';
import { SUPPORTED_LOCALES, isSupportedLocale, resolveLocale } from '../src/domain/localization/locale-validation.js';
import { createLocalePreferences } from '../src/application/localization/locale-preferences.js';
import { createLocalePreferencesRepository, LOCALE_PREFERENCE_STORAGE_KEY } from '../src/infrastructure/persistence/repositories/locale-preferences.repository.js';
import { applyLocaleToDocument } from '../src/ui/localization/locale-ui.js';

function createMemoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    values,
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); }
  };
}

test('only Russian and English are supported locale codes', () => {
  assert.deepEqual(SUPPORTED_LOCALES, ['ru', 'en']);
  assert.equal(isSupportedLocale('ru'), true);
  assert.equal(isSupportedLocale('en'), true);
  assert.equal(isSupportedLocale('fr'), false);
});

test('resolveLocale restores a supported value and falls back to Russian', () => {
  assert.equal(resolveLocale('en'), 'en');
  assert.equal(resolveLocale('ru'), 'ru');
  assert.equal(resolveLocale(null), 'ru');
  assert.equal(resolveLocale(''), 'ru');
  assert.equal(resolveLocale('fr'), 'ru');
});

test('repository reads and writes the raw legacy nutrition-locale value', () => {
  const storage = createMemoryStorage({ [LOCALE_PREFERENCE_STORAGE_KEY]: 'en' });
  const repository = createLocalePreferencesRepository(storage);
  assert.equal(repository.load(), 'en');
  assert.equal(repository.save('ru'), true);
  assert.equal(storage.getItem('nutrition-locale'), 'ru');
  assert.equal(storage.values.has('"nutrition-locale"'), false);
});

test('repository touches only the existing locale key', () => {
  const storage = createMemoryStorage({ 'nutrition-profile-v1': '{"height":166}' });
  const repository = createLocalePreferencesRepository(storage);
  repository.save('en');
  assert.equal(storage.getItem('nutrition-profile-v1'), '{"height":166}');
  assert.equal(storage.getItem('nutrition-locale'), 'en');
  assert.deepEqual([...storage.values.keys()].sort(), ['nutrition-locale', 'nutrition-profile-v1']);
});

test('application restores saved English locale at startup', () => {
  const repository = { load: () => 'en', save: () => true };
  const preferences = createLocalePreferences({ repository });
  assert.equal(preferences.loadInitialLocale(), 'en');
  assert.equal(preferences.getLocale(), 'en');
});

test('application uses Russian fallback for absent or invalid saved locale', () => {
  for (const saved of [null, '', 'fr']) {
    const preferences = createLocalePreferences({ repository: { load: () => saved, save: () => true } });
    assert.equal(preferences.loadInitialLocale(), 'ru');
  }
});

test('unsupported selection is rejected without saving or changing current locale', () => {
  let writes = 0;
  const preferences = createLocalePreferences({
    repository: { load: () => 'en', save: () => { writes += 1; return true; } }
  });
  preferences.loadInitialLocale();
  assert.deepEqual(preferences.setLocale('fr'), { accepted: false, locale: 'en', persisted: false });
  assert.equal(preferences.getLocale(), 'en');
  assert.equal(writes, 0);
});

test('valid selection updates current locale and persists it', () => {
  const saved = [];
  const preferences = createLocalePreferences({
    repository: { load: () => null, save: value => { saved.push(value); return true; } }
  });
  preferences.loadInitialLocale();
  assert.deepEqual(preferences.setLocale('en'), { accepted: true, locale: 'en', persisted: true });
  assert.deepEqual(saved, ['en']);
  assert.equal(preferences.getLocale(), 'en');
});

test('storage read failure falls back safely and write failure does not block session switch', () => {
  const preferences = createLocalePreferences({
    repository: {
      load() { throw new Error('read failed'); },
      save() { throw new Error('write failed'); }
    }
  });
  assert.equal(preferences.loadInitialLocale(), 'ru');
  assert.deepEqual(preferences.setLocale('en'), { accepted: true, locale: 'en', persisted: false });
  assert.equal(preferences.getLocale(), 'en');
});

test('storage adapter converts read/write exceptions into safe results', () => {
  const brokenStorage = {
    getItem() { throw new Error('denied'); },
    setItem() { throw new Error('denied'); }
  };
  const logger = { warn() {} };
  const repository = createLocalePreferencesRepository(brokenStorage, { logger });
  assert.equal(repository.load(), null);
  assert.equal(repository.save('en'), false);
});

test('UI adapter changes document language and invokes rerender exactly once', () => {
  const document = { documentElement: { lang: 'ru' } };
  let calls = 0;
  const result = applyLocaleToDocument('en', { document, rerender: () => { calls += 1; } });
  assert.equal(result, 'en');
  assert.equal(document.documentElement.lang, 'en');
  assert.equal(calls, 1);
});

test('UI adapter requires explicit document and rerender dependencies', () => {
  assert.throws(() => applyLocaleToDocument('en', { rerender() {} }), TypeError);
  assert.throws(() => applyLocaleToDocument('en', { document: { documentElement: {} } }), TypeError);
});
