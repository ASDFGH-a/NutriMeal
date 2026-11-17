import test from 'node:test';
import assert from 'node:assert/strict';
import { UI_TRANSLATIONS } from '../src/domain/localization/ui-translations.js';
import { translateText } from '../src/domain/localization/ui-translation-functions.js';

test('dictionary contains the reviewed source-derived phrase set', () => {
  assert.equal(Object.keys(UI_TRANSLATIONS).length, 227);
});

test('English exact-match translation works', () => {
  assert.equal(translateText('Отмена', 'en'), 'Cancel');
  assert.equal(translateText('Запись удалена', 'en'), 'Entry deleted');
});

test('matching is case-insensitive and preserves surrounding whitespace', () => {
  assert.equal(translateText('  ОТМЕНА  ', 'en'), '  Cancel  ');
});

test('Russian locale passes source text through unchanged', () => {
  assert.equal(translateText('Отмена', 'ru'), 'Отмена');
});

test('unknown text is preserved, including user-authored data', () => {
  const userText = 'Мой уникальный рецепт: гречка и яблоко';
  assert.equal(translateText(userText, 'en'), userText);
});

test('unsupported locales fall back to original text', () => {
  assert.equal(translateText('Отмена', 'fr'), 'Отмена');
});
