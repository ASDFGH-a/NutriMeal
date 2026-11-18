import assert from 'node:assert/strict';
import test from 'node:test';
import '../src/ui/modals/planning-modals.js';

const ui = globalThis.NutriMealUI;
const escapeHtml = (value) => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

test('create nutrition set modal preserves initial name and comment fields', () => {
  const modal = ui.renderCreateNutritionSetModal();
  assert.equal(modal.title, 'Создать набор · Название');
  assert.match(modal.body, /nutrition-set-name/);
  assert.match(modal.body, /nutrition-set-comment/);
  assert.match(modal.actions, /nutrition-set-next/);
});

test('create weeks modal reflects populated and skipped weeks', () => {
  const modal = ui.renderCreateNutritionSetWeeksModal({
    name: '<Набор>',
    weekRows: [
      { index: 0, completionCount: 2 },
      { index: 1, completionCount: 0, skipped: true },
      { index: 2, completionCount: 0 },
      { index: 3, completionCount: 0 }
    ],
    escapeHtml
  });
  assert.match(modal.title, /&lt;Набор&gt;/);
  assert.match(modal.body, /2 блюд добавлено/);
  assert.match(modal.body, /Пропущена · останется пустой/);
  assert.match(modal.body, /data-create-set-week-open="0"/);
  assert.match(modal.body, /data-create-set-week-skip="1"/);
  assert.match(modal.actions, /nutrition-set-to-orientations/);
  assert.doesNotMatch(modal.actions, /nutrition-set-create-empty/);
});

test('edit weeks modal keeps escaped metadata and week navigation controls', () => {
  const modal = ui.renderEditNutritionSetWeeksModal({
    draft: { name: '<План>', comment: 'Комментарий & цель' },
    weekRows: [{ index: 0, completionCount: 1 }, { index: 1, completionCount: 0 }, { index: 2, completionCount: 0 }, { index: 3, completionCount: 0 }],
    escapeHtml
  });
  assert.match(modal.title, /&lt;План&gt;/);
  assert.match(modal.body, /value="&lt;План&gt;"/);
  assert.match(modal.body, /Комментарий &amp; цель/);
  assert.match(modal.body, /data-edit-set-week-open="0"/);
  assert.match(modal.actions, /nutrition-set-edit-next/);
});

test('nutrition week editor renders dishes, snacks, empty groups, and event hooks', () => {
  const modal = ui.renderNutritionWeekEditModal({
    setName: 'Набор',
    index: 1,
    mainDishes: [{ id: 'dish-1', recipeId: 'recipe-1' }],
    snackDishes: [],
    recipes: [{ id: 'recipe-1', name: '<Каша>' }],
    escapeHtml
  });
  assert.equal(modal.title, 'Неделя 2 · Набор');
  assert.match(modal.body, /&lt;Каша&gt;/);
  assert.match(modal.body, /data-week-dish-pick/);
  assert.match(modal.body, /data-week-dish-remove/);
  assert.match(modal.body, /data-week-dish-add="snacks"/);
  assert.match(modal.body, /Пока нет закусок/);
  assert.match(modal.actions, /week-edit-save/);
});

test('orientation review modal preserves week selection, category controls, and mode labels', () => {
  const modal = ui.renderNutritionSetOrientationsModal({
    mode: 'edit',
    setName: '<План>',
    weekIndex: 2,
    weekCount: 4,
    tabsMarkup: '<button data-nutrition-review-week="3" aria-pressed="true">Неделя 3</button>',
    categoriesMarkup: '<div data-planner-category-add="vegetables"></div>',
    escapeHtml
  });
  assert.match(modal.title, /&lt;План&gt;/);
  assert.match(modal.body, /ШАГ 2 ИЗ 2/);
  assert.match(modal.body, /Неделя 3/);
  assert.match(modal.body, /data-planner-category-add="vegetables"/);
  assert.match(modal.body, /weekly-goals-open/);
  assert.match(modal.actions, /Сохранить изменения/);
});

test('weekly goals modal renders both goal groups and save controls', () => {
  const modal = ui.renderWeeklyGoalsModal({
    completenessRows: '<div data-weekly-completeness="vegetables"></div>',
    diversityRows: '<div data-weekly-diversity="vegetables"></div>'
  });
  assert.equal(modal.title, 'Мои ориентиры питания');
  assert.match(modal.body, /Полнота/);
  assert.match(modal.body, /Разнообразие/);
  assert.match(modal.body, /data-weekly-completeness/);
  assert.match(modal.body, /data-weekly-diversity/);
  assert.match(modal.actions, /weekly-goals-save/);
});

test('plan preset save and edit dialogs render their form controls safely', () => {
  const save = ui.renderPlanPresetSaveModal();
  assert.match(save.body, /plan-preset-name/);
  assert.match(save.actions, /plan-preset-save/);

  const edit = ui.renderPlanPresetEditModal({
    name: '<План>',
    escapeHtml
  });
  assert.match(edit.title, /Переименовать пресет/);
  assert.match(edit.body, /value="&lt;План&gt;"/);
  assert.match(edit.actions, /preset-rename-save/);
});

test('plan preset list renders empty and populated states with existing actions', () => {
  const empty = ui.renderPlanPresetsModal({
    presets: [],
    fmt: String,
    escapeHtml
  });
  assert.match(empty.body, /Сохранённых пресетов пока нет/);

  const populated = ui.renderPlanPresetsModal({
    presets: [{ id: 'preset-1', name: '<Поддержание>', plan: { goal: 'Поддержание', targetWeight: 65 } }],
    fmt: (value) => String(value),
    escapeHtml
  });
  assert.match(populated.body, /&lt;Поддержание&gt;/);
  assert.match(populated.body, /data-preset-apply="preset-1"/);
  assert.match(populated.body, /data-preset-edit="preset-1"/);
  assert.match(populated.body, /data-preset-delete="preset-1"/);
  assert.match(populated.body, /65 кг/);
});

test('nutrition set deletion dialog escapes its name and keeps confirmation hooks', () => {
  const modal = ui.renderDeleteNutritionSetModal({
    name: '<Набор>',
    escapeHtml
  });
  assert.equal(modal.title, 'Удалить набор?');
  assert.match(modal.body, /&lt;Набор&gt;/);
  assert.match(modal.body, /все четыре недели/);
  assert.match(modal.actions, /nutrition-set-delete-cancel/);
  assert.match(modal.actions, /nutrition-set-delete-confirm/);
});

test('planner category placement escapes selected recipes and preserves placement options', () => {
  const modal = ui.renderPlannerCategoryPlacementModal({
    categoryLabel: '<Овощи>',
    chosenItems: [{ id: 'recipe-1', name: '<Салат>' }, { id: 'recipe-2', name: 'Суп' }],
    selectedWeek: 3,
    escapeHtml
  });
  assert.equal(modal.title, 'Куда добавить рецепты?');
  assert.match(modal.body, /&lt;Овощи&gt;/);
  assert.match(modal.body, /&lt;Салат&gt;/);
  assert.match(modal.body, /value="3" selected>Неделя 3/);
  assert.match(modal.body, /data-planner-place-group="mainDishes"/);
  assert.match(modal.body, /data-planner-place-group="snacks"/);
  assert.match(modal.body, /2 рецепта будут добавлены/);
  assert.match(modal.actions, /planner-category-place-confirm/);
});

test('plan setup modal renders all settings and calculation preview', () => {
  const modal = ui.renderPlanSetupModal({
    targetWeight: 65,
    adjustment: -400,
    proteinPerKg: 1.6,
    fatPercent: 30,
    calculationPreview: '<strong>Текущая оценка: 1800 ккал/день</strong>',
    locale: 'ru-RU'
  });
  assert.equal(modal.title, 'Настройки плана');
  assert.match(modal.body, /value="65"/);
  assert.match(modal.body, /value="-400"/);
  assert.match(modal.body, /value="auto" >/);
  assert.match(modal.body, /value="1\.6" selected>1,6 г\/кг/);
  assert.match(modal.body, /value="30" selected/);
  assert.match(modal.body, /1800 ккал\/день/);
  assert.match(modal.body, /setup-goal/);
  assert.match(modal.actions, /save-setup/);

  const automatic = ui.renderPlanSetupModal({
    targetWeight: 65,
    adjustment: 0,
    proteinPerKg: null,
    fatPercent: 30,
    calculationPreview: '<strong>Расчёт недоступен</strong>',
    locale: 'ru-RU'
  });
  assert.match(automatic.body, /value="auto" selected/);
});
