import test from 'node:test';
import assert from 'node:assert/strict';
import {
  I18N_LOCALES,
  I18N_MONTHS,
  I18N_WEEKDAYS_SHORT,
  I18N_MEALS
} from '../src/domain/localization/locale-data.js';
import { localeTags, trMeal } from '../src/domain/localization/locale-functions.js';

test('locale dictionaries expose only Russian and English', () => {
  assert.deepEqual(I18N_LOCALES, { ru: 'Русский', en: 'English' });
  assert.deepEqual(Object.keys(I18N_MONTHS), ['ru', 'en']);
  assert.deepEqual(Object.keys(I18N_WEEKDAYS_SHORT), ['ru', 'en']);
  assert.deepEqual(Object.keys(I18N_MEALS), [
    'Завтрак', 'Второй завтрак', 'Обед', 'Полдник', 'Ужин', 'Поздний ужин', 'Перекус'
  ]);
});

test('month and weekday dictionaries retain v60 order and lengths', () => {
  for (const locale of ['ru', 'en']) {
    assert.equal(I18N_MONTHS[locale].length, 12);
    assert.equal(I18N_WEEKDAYS_SHORT[locale].length, 7);
  }
  assert.deepEqual(I18N_WEEKDAYS_SHORT.ru, ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']);
});

test('localeTags maps Russian to ru-RU and leaves other locale codes unchanged', () => {
  assert.equal(localeTags('ru'), 'ru-RU');
  assert.equal(localeTags('en'), 'en');
  assert.equal(localeTags('unknown'), 'unknown');
});

test('trMeal translates known meal names and preserves Russian or unknown names', () => {
  assert.equal(trMeal('Завтрак', 'ru'), 'Завтрак');
  assert.equal(trMeal('Завтрак', 'en'), 'Breakfast');
  assert.equal(trMeal('Обед', 'en'), 'Lunch');
  assert.equal(trMeal('Неизвестный приём', 'en'), 'Неизвестный приём');
  assert.equal(trMeal('Завтрак', 'de'), undefined);
});

test('locale dictionaries are immutable, including nested arrays and records', () => {
  assert.equal(Object.isFrozen(I18N_LOCALES), true);
  assert.equal(Object.isFrozen(I18N_MONTHS), true);
  assert.equal(Object.isFrozen(I18N_MONTHS.en), true);
  assert.equal(Object.isFrozen(I18N_WEEKDAYS_SHORT.en), true);
  assert.equal(Object.isFrozen(I18N_MEALS['Завтрак']), true);
});
