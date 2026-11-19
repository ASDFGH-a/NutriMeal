import assert from 'node:assert/strict';
import test from 'node:test';
import { createDiaryViewModel } from '../src/ui/screens/diary/diary-presenter.js';

function createData(overrides = {}) {
  return {
    diaryEntries: [
      { id: 1, date: '2026-11-18', meal: 'Завтрак', name: 'Овсянка', kcal: 200, p: 8, f: 5, c: 30, grams: 100 },
      { id: 2, date: '2026-11-18', meal: 'Перекус', name: 'Яблоко', kcal: 80, p: 0.3, f: 0.2, c: 21, grams: 100 }
    ],
    waterEntries: [{ id: 'w1', date: '2026-11-18', ml: 250 }],
    profile: { mealCount: 3, currentWeight: 65, height: 166 },
    plan: { kcal: 2000, p: 100, f: 60, c: 250, targetWeight: 65, goal: 'Поддержание веса' },
    measurements: [{ name: 'Талия', value: 80 }, { name: 'Бёдра', value: 100 }],
    measurementHistory: [{ date: '2026-11-18', values: { height: 166, 'Талия': 80, 'Бёдра': 100 } }],
    ...overrides
  };
}

test('diary presenter composes date-specific entries, meals, totals, and water', () => {
  const model = createDiaryViewModel({
    data: createData(),
    selectedDate: '2026-11-18',
    today: '2026-11-18'
  });

  assert.equal(model.futureDate, false);
  assert.deepEqual(model.displayMeals, ['Завтрак', 'Обед', 'Ужин']);
  assert.equal(model.entriesByMeal['Завтрак'].length, 1);
  assert.equal(model.snackEntries.length, 1);
  assert.deepEqual(model.dailyTotals, { kcal: 280, p: 8.3, f: 5.2, c: 51 });
  assert.deepEqual(
    Object.fromEntries(Object.entries(model.dailyProgress).map(([key, value]) => [key, Number(value.toFixed(2))])),
    { kcal: 14, p: 8.3, f: 8.67, c: 20.4 }
  );
  assert.equal(model.mealSummaries['Завтрак'].total.kcal, 200);
  assert.equal(model.mealSummaries['Завтрак'].targetKcal, 667);
  assert.equal(model.mealSummaries['Завтрак'].progress, 200 / 667 * 100);
  assert.equal(model.snackKcal, 80);
  assert.equal(model.waterTotal, 250);
  assert.equal(model.waterLitres, '0,25');
  assert.deepEqual(model.weightStatus, {
    label: 'Поддержание веса',
    note: 'Целевой вес соблюдается'
  });
  assert.deepEqual(model.bmi, { value: '23,6', label: 'Нормальный диапазон' });
  assert.match(model.measurementCardSummary, /Талия \/ рост/);
});

test('diary presenter keeps future dates read-only and appends legacy meal names', () => {
  const model = createDiaryViewModel({
    data: createData({
      diaryEntries: [{ id: 3, date: '2026-11-20', meal: 'Поздний обед', name: 'Суп', kcal: 100, p: 4, f: 2, c: 12, grams: 200 }]
    }),
    selectedDate: '2026-11-20',
    today: '2026-11-18'
  });

  assert.equal(model.futureDate, true);
  assert.equal(model.displayMeals[model.displayMeals.length - 1], 'Поздний обед');
  assert.equal(model.entriesByMeal['Поздний обед'][0].name, 'Суп');
});

test('diary presenter labels calorie-only, set-average, and portion entries distinctly', () => {
  const model = createDiaryViewModel({
    data: createData({
      diaryEntries: [
        { id: 1, date: '2026-11-18', meal: 'Завтрак', name: 'Калории', kcal: 300, calorieOnly: true },
        { id: 2, date: '2026-11-18', meal: 'Обед', name: 'Набор', kcal: 500, quantityMode: 'set-average' },
        { id: 3, date: '2026-11-18', meal: 'Ужин', name: 'Каша', grams: 200, quantityMode: 'portions', quantityValue: 1, portionGrams: 200 }
      ]
    }),
    selectedDate: '2026-11-18',
    today: '2026-11-18'
  });

  assert.equal(model.diaryEntryQuantityLabel(model.dayEntries[0]), 'Введённые калории · БЖУ и микронутриенты неизвестны');
  assert.equal(model.diaryEntryQuantityLabel(model.dayEntries[1]), 'Суточное значение из набора питания');
  assert.equal(model.diaryEntryQuantityLabel(model.dayEntries[2]), '1 порц. · 200 г');
});

test('diary presenter rejects invalid dates and missing state collections', () => {
  assert.throws(() => createDiaryViewModel({
    data: createData(),
    selectedDate: '2026-02-30'
  }), /Valid selected and current dates/);
  assert.throws(() => createDiaryViewModel({
    data: { ...createData(), diaryEntries: null },
    selectedDate: '2026-11-18'
  }), /Diary and water entries must be arrays/);
});
