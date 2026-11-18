import assert from 'node:assert/strict';
import test from 'node:test';
import '../src/ui/screens/planning/nutrition-set-library.js';

test('nutrition-set library card preserves selection and nutrition summary', () => {
  const html = globalThis.NutriMealUI.renderNutritionSetCard({
    set: { id: 'set-1', name: 'Мой набор', comment: 'На неделю' },
    index: 0,
    selected: true,
    dishCount: 12,
    groupCount: 5,
    averageKcal: 2200,
    averageCoverage: 84,
    productCount: 18,
    hasWarnings: false,
    totals: { kcal: 61600, p: 3000, f: 1800, c: 7000 },
    escapeHtml: (value) => String(value),
    fmt: (value) => String(value)
  });
  assert.match(html, /is-selected/);
  assert.match(html, /Мой набор/);
  assert.match(html, /84%/);
  assert.match(html, /2200 ккал в день/);
  assert.match(html, /data-nutrition-set-edit="set-1"/);
});

test('nutrition-set library card handles empty set and warnings', () => {
  const html = globalThis.NutriMealUI.renderNutritionSetCard({
    set: { id: 'empty', name: 'Пустой' },
    index: 1,
    selected: false,
    dishCount: 0,
    groupCount: 0,
    averageKcal: 0,
    averageCoverage: null,
    productCount: 0,
    hasWarnings: true,
    totals: {},
    escapeHtml: (value) => String(value),
    fmt: () => '0'
  });
  assert.match(html, /Нет записей для расчёта среднего/);
  assert.match(html, /есть неполные составы/);
  assert.match(html, /Открыть набор/);
});
