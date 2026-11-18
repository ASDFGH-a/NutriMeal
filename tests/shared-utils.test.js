import assert from 'node:assert/strict';
import test from 'node:test';
import { dateKey, isValidDateKey, todayLocalDate } from '../src/domain/shared/date-utils.js';
import {
  normalizeRecipeFilterValue,
  recipeArray,
  uniqueProductValues,
  uniqueRecipeValues
} from '../src/domain/shared/filter-utils.js';
import { I18N_LOCALES, I18N_MONTHS, I18N_WEEKDAYS_SHORT } from '../src/domain/localization/locale-data.js';
import { localeTags, translateMeal } from '../src/domain/localization/locale-functions.js';
import { escapeHtml } from '../src/ui/utils/escape-html.js';
import { dateLabel, monthLabel, readableDate } from '../src/ui/utils/date-format.js';
import { formatInteger } from '../src/ui/utils/format-number.js';
import { bmiSummary, weightGoalStatus } from '../src/domain/profile/profile-calculations.js';

test('date helpers use local calendar dates and validate leap days', () => {
  const source = new Date(2026, 10, 17, 14, 35);
  const today = todayLocalDate(source);

  assert.equal(dateKey(source), '2026-11-17');
  assert.equal(dateKey(today), '2026-11-17');
  assert.equal(today.getHours(), 0);
  assert.equal(source.getHours(), 14);
  assert.equal(isValidDateKey('2024-02-29'), true);
  assert.equal(isValidDateKey('2026-02-29'), false);
  assert.equal(isValidDateKey('2026-2-09'), false);
});

test('shared filter helpers preserve first value and normalize case and whitespace', () => {
  const original = ['Овсянка'];

  assert.strictEqual(recipeArray(original), original);
  assert.deepEqual(recipeArray(null), []);
  assert.equal(normalizeRecipeFilterValue('  ГРЕЧКА  '), 'гречка');
  assert.deepEqual(
    uniqueRecipeValues([' Овсянка ', 'овсянка', 'Кефир', '', null]),
    ['Овсянка', 'Кефир']
  );
  assert.strictEqual(uniqueProductValues, uniqueRecipeValues);
});

test('locale data and pure meal translation match the existing supported values', () => {
  assert.deepEqual(Object.keys(I18N_LOCALES), ['ru', 'en', 'es', 'fr']);
  assert.equal(I18N_MONTHS.en[0], 'January');
  assert.deepEqual(I18N_WEEKDAYS_SHORT.ru, ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']);
  assert.equal(localeTags('ru'), 'ru-RU');
  assert.equal(localeTags('en'), 'en');
  assert.equal(translateMeal('Завтрак', 'en'), 'Breakfast');
  assert.equal(translateMeal('Неизвестный приём', 'en'), 'Неизвестный приём');
  assert.throws(() => localeTags('de'), /Unsupported locale/);
});

test('presentation formatters retain the existing date, number, and HTML escaping behavior', () => {
  const date = new Date(2026, 10, 17);

  assert.equal(dateLabel(date, 'en-US'), 'November 17, 2026');
  assert.equal(readableDate('2026-11-17', 'en-US'), 'November 17, 2026');
  assert.equal(readableDate('invalid', 'en-US'), 'invalid');
  assert.equal(monthLabel(date, 'en-US'), 'November, 2026');
  assert.equal(formatInteger(1234.5, 'en-US'), '1,235');
  assert.equal(escapeHtml(`<a title="x">&'`), '&lt;a title=&quot;x&quot;&gt;&amp;&#39;');
});

test('profile calculations preserve BMI and weight-goal statuses', () => {
  assert.deepEqual(bmiSummary({ height: 166, currentWeight: 65.5 }), {
    value: '23,8',
    label: 'Нормальный диапазон'
  });
  assert.deepEqual(bmiSummary({ height: 0, currentWeight: 65 }), {
    value: '—',
    label: 'Укажи рост и вес'
  });
  assert.deepEqual(weightGoalStatus(
    { currentWeight: 65 },
    { targetWeight: 65, goal: 'Поддержание веса' }
  ), { label: 'Поддержание веса', note: 'Целевой вес соблюдается' });
  assert.deepEqual(weightGoalStatus(
    { currentWeight: 65 },
    { targetWeight: 70, goal: 'Набор веса' }
  ), { label: 'Осталось набрать 5,0 кг', note: '' });
  assert.deepEqual(weightGoalStatus(
    { currentWeight: 65 },
    { targetWeight: 70, goal: 'Снижение веса' }
  ), {
    label: 'Проверь целевой вес',
    note: 'Для снижения целевой вес должен быть ниже текущего'
  });
});
