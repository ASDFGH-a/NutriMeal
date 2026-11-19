import assert from 'node:assert/strict';
import test from 'node:test';
import '../src/ui/screens/diary/diary-screen.js';

function renderDiary(overrides = {}) {
  const entry = {
    id: 1,
    date: '2026-11-18',
    meal: 'Завтрак',
    name: 'Овсянка',
    kcal: 200,
    p: 8,
    f: 5,
    c: 30,
    quantityLabel: '100 г'
  };
  return globalThis.NutriMealUI.renderDiaryScreen({
    dateLabel: '18 ноября 2026 г.',
    selectedDate: '2026-11-18',
    todayKey: '2026-11-18',
    futureDate: false,
    standardMeals: ['Завтрак', 'Обед'],
    displayMeals: ['Завтрак', 'Обед'],
    snackEntries: [],
    entriesByMeal: { Завтрак: [entry], Обед: [] },
    dayEntries: [entry],
    dailyTotals: { kcal: 200, p: 8, f: 5, c: 30 },
    dailyProgress: { kcal: 10, p: 8, f: 8.33, c: 12 },
    mealSummaries: {
      Завтрак: {
        total: { kcal: 200, p: 8, f: 5, c: 30 },
        targetKcal: 500,
        progress: 40
      },
      Обед: {
        total: { kcal: 0, p: 0, f: 0, c: 0 },
        targetKcal: 1500,
        progress: 0
      }
    },
    snackKcal: 0,
    plan: { kcal: 2000, p: 100, f: 60, c: 250, targetWeight: 65 },
    profile: { currentWeight: 65.5 },
    expandedMeals: new Set(),
    waterEntries: [],
    waterTotal: 250,
    waterLitres: '0,25',
    weightStatus: { label: 'Поддержание веса', note: 'Целевой вес соблюдается' },
    bmi: { value: '23,8', label: 'Нормальный диапазон' },
    measurementHistory: [],
    readableDate: (date) => date,
    measurementCardSummary: '<div>Рост 166 см</div>',
    fmt: (value) => String(Math.round(value)),
    nutritionNumber: (value) => String(value),
    escapeHtml: (value) => String(value),
    diaryEntryQuantityLabel: () => '100 г',
    ...overrides
  });
}

test('diary screen renders date, meals, water, weight and measurements', () => {
  const html = renderDiary();
  assert.match(html, /18 ноября 2026 г\./);
  assert.match(html, /Приёмы пищи/);
  assert.match(html, /Овсянка/);
  assert.match(html, /Записей воды пока нет/);
  assert.match(html, /Цель по весу/);
  assert.match(html, /65,5/);
  assert.match(html, /Замеры тела/);
});

test('diary screen exposes future-date and calorie-only states', () => {
  const html = renderDiary({
    futureDate: true,
    entriesByMeal: {
      Завтрак: [{ id: 2, date: '2026-11-18', meal: 'Завтрак', name: 'Калории за день', kcal: 500, p: 0, f: 0, c: 0, calorieOnly: true }],
      Обед: []
    },
    dayEntries: [{ id: 2, date: '2026-11-18', meal: 'Завтрак', name: 'Калории за день', kcal: 500, p: 0, f: 0, c: 0, calorieOnly: true }]
  });
  assert.match(html, /Это будущая дата/);
  assert.match(html, /Калории за день/);
  assert.match(html, /Часть калорий без распределения БЖУ/);
});
