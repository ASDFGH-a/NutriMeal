import assert from 'node:assert/strict';
import test from 'node:test';
import '../src/ui/screens/statistics/statistics-screen.js';

test('statistics screen renders period navigation and all overview groups', () => {
  const html = globalThis.NutriMealUI.renderStatisticsScreen({
    periodLabel: 'Неделя',
    periodRangeLabel: '12–18 нояб.',
    canMoveForward: true,
    foodRange: '12 — 18 ноября',
    coverageMarkup: '<section>Покрытие</section>',
    calorieCard: '<section>Калории</section>',
    macroCard: '<section>БЖУ</section>',
    waterCard: '<section>Вода</section>',
    varietyCard: '<section>Полнота</section>',
    microCard: '<section>Микронутриенты</section>',
    weightCard: '<section>Вес</section>',
    measuresCard: '<section>Замеры</section>',
    footerNote: 'Примечание'
  });

  assert.match(html, /stats-period-trigger/);
  assert.match(html, /stats-period-prev/);
  assert.match(html, /stats-period-next/);
  assert.match(html, /Покрытие/);
  assert.match(html, /Состояние тела/);
  assert.match(html, /Калории/);
  assert.match(html, /Замеры/);
});

test('statistics screen disables forward navigation at the latest period', () => {
  const html = globalThis.NutriMealUI.renderStatisticsScreen({
    periodLabel: 'Неделя',
    periodRangeLabel: '12–18 нояб.',
    canMoveForward: false,
    foodRange: '',
    coverageMarkup: '',
    calorieCard: '',
    macroCard: '',
    waterCard: '',
    varietyCard: '',
    microCard: '',
    weightCard: '',
    measuresCard: '',
    footerNote: ''
  });
  assert.match(html, /id="stats-period-next"[^>]*disabled/);
});
