import assert from 'node:assert/strict';
import test from 'node:test';
import '../src/ui/screens/planning/planning-screen.js';

const base = {
  plan: { goal: 'Снижение веса', targetWeight: 63 },
  profile: { currentWeight: 65.5 },
  planPresets: [{ id: 'p1', name: 'Сушка' }],
  ready: true,
  calc: { bmr: 1500, tdee: 2200, kcal: 1800, protein: 110, fat: 60, carbs: 220, adjustment: -400 },
  targetKcal: 2200,
  targetP: 110,
  targetF: 70,
  targetC: 275,
  fmt: (value) => String(Math.round(value)),
  locale: 'ru-RU',
  escapeHtml: (value) => String(value)
};

test('planning overview renders goal, profile weights and target macros', () => {
  const html = globalThis.NutriMealUI.renderPlanningOverview(base);
  assert.match(html, /Цель и стратегия/);
  assert.match(html, /Снижение веса/);
  assert.match(html, /65,5 кг/);
  assert.match(html, /63 кг/);
  assert.match(html, /-400 ккал к TDEE/);
  assert.match(html, /Сушка/);
});

test('planning overview shows profile notice and fallback targets when data is incomplete', () => {
  const html = globalThis.NutriMealUI.renderPlanningOverview({
    ...base,
    ready: false,
    calc: null
  });
  assert.match(html, /Для точного персонального расчёта проверь Профиль/);
  assert.match(html, /Текущий ориентир плана/);
  assert.match(html, /2200/);
});
