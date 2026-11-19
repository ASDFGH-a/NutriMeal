import assert from 'node:assert/strict';
import test from 'node:test';
import { createMealAddFlow } from '../src/ui/app/meal-add-flow.js';

test('abandoning planner recipe selection clears its draft without resuming the editor', () => {
  const navigatedPages = [];
  let abandoned = false;
  const flow = createMealAddFlow({
    document: {},
    ui: {},
    data: { products: [], recipes: [], profile: {}, catalogCardSettings: {} },
    diaryServices: {},
    catalogServices: {},
    today: '2026-11-18',
    getSelectedDate: () => '2026-11-18',
    openModal: () => {},
    closeModal: () => {},
    navigatePage: (page) => navigatedPages.push(page),
    renderDiary: () => {},
    showToast: () => {},
    escapeHtml: String
  });

  flow.startPlannerRecipeSelection({
    title: 'Выбор рецепта',
    onSelect: () => {},
    onCancel: () => assert.fail('Abandoning selection must not resume the editor'),
    onAbandon: () => { abandoned = true; }
  });

  assert.equal(flow.isPicking(), true);
  assert.equal(flow.abandonPlannerRecipeSelection(), true);
  assert.equal(abandoned, true);
  assert.equal(flow.isPicking(), false);
  assert.equal(flow.abandonPlannerRecipeSelection(), false);
  assert.deepEqual(navigatedPages, ['recipes']);
});
