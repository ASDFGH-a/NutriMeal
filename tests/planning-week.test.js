import assert from 'node:assert/strict';
import test from 'node:test';
import '../src/ui/screens/planning/planning-week.js';

test('planning week renders tabs, dishes and snacks', () => {
  const html = globalThis.NutriMealUI.renderPlanningWeek({
    activeSet: { id: 'set-1', name: 'Набор' },
    selectedWeek: 2,
    dates: ['9–15', '16–22', '23–29', '30–6'],
    mainDishes: [{ recipeId: 'r1' }, { recipeId: '' }],
    snackDishes: [{ recipeId: 'r2' }],
    recipes: [
      { id: 'r1', name: 'Каша' },
      { id: 'r2', name: 'Йогурт' }
    ],
    recipeSummary: (recipe) => recipe ? '200 ккал' : '',
    escapeHtml: (value) => String(value),
    locale: 'ru-RU'
  });
  assert.match(html, /data-planner-week-select="2"/);
  assert.match(html, /Неделя 2/);
  assert.match(html, /Каша/);
  assert.match(html, /Йогурт/);
  assert.match(html, /1 из 2 заполнено/);
});

test('planning week renders empty state without active set', () => {
  const html = globalThis.NutriMealUI.renderPlanningWeek({
    activeSet: null,
    selectedWeek: 1,
    dates: ['','','',''],
    mainDishes: [],
    snackDishes: [],
    recipes: [],
    recipeSummary: () => '',
    escapeHtml: (value) => String(value),
    locale: 'ru-RU'
  });
  assert.match(html, /Пока нечего редактировать/);
  assert.doesNotMatch(html, /planner48-week-tabs/);
});
