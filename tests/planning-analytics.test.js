import assert from 'node:assert/strict';
import test from 'node:test';
import '../src/ui/screens/planning/planning-analytics.js';

test('planning analytics renders categories, period, nutrients and meal targets', () => {
  const html = globalThis.NutriMealUI.renderPlannerCategoryAndMeals({
    activeSet: { id: 'set-1', name: 'Набор' },
    selectedWeek: 2,
    categoryMarkup: '<div>Овощи</div>',
    period: {
      mode: 'day',
      label: 'Среднее за сутки',
      heading: 'СРЕДНЯЯ ЭНЕРГИЯ',
      valueUnit: 'ккал / сутки',
      kcalText: '2200',
      targetText: '2200'
    },
    periodData: { kcal: 2200 },
    targetKcalPeriod: 2200,
    rdaText: '84%',
    nutrientStats: { averageCoverage: 84 },
    macroMarkup: '<div>Белки</div>',
    vitaminMarkup: '<div>Витамины</div>',
    mineralMarkup: '<div>Железо</div>',
    nutritionFootText: 'Примечание',
    mealCards: '<article>Завтрак</article>',
    escapeHtml: (value) => String(value)
  });
  assert.match(html, /Мои ориентиры/);
  assert.match(html, /Среднее за сутки/);
  assert.match(html, /84%/);
  assert.match(html, /КБЖУ по приёмам пищи/);
  assert.match(html, /Завтрак/);
});

test('planning analytics renders empty category state', () => {
  const html = globalThis.NutriMealUI.renderPlannerCategoryAndMeals({
    activeSet: null,
    selectedWeek: 1,
    categoryMarkup: '',
    period: { mode: 'week', label: '', heading: '', valueUnit: '', kcalText: '0', targetText: '0' },
    periodData: { kcal: 0 },
    targetKcalPeriod: 0,
    rdaText: '—',
    nutrientStats: { averageCoverage: null },
    macroMarkup: '',
    vitaminMarkup: '',
    mineralMarkup: '',
    nutritionFootText: '',
    mealCards: '',
    escapeHtml: (value) => String(value)
  });
  assert.match(html, /Ориентиры появятся здесь после выбора набора/);
  assert.match(html, /Цель не задана/);
});
