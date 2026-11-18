import assert from 'node:assert/strict';
import test from 'node:test';
import '../src/ui/modals/diary-modals.js';

const ui = globalThis.NutriMealUI;
const escapeHtml = (value) => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

test('calendar renderer preserves date state, accessibility labels, and jump controls', () => {
  const html = ui.renderCalendarMonthContent({
    blankCount: 2,
    days: [
      {
        day: 18,
        key: '2026-11-18',
        monthYearLabel: 'ноября 2026 г.',
        isToday: true,
        isSelected: true,
        hasEntries: true
      },
      {
        day: 19,
        key: '<invalid>',
        monthYearLabel: 'ноября 2026 г.',
        isToday: false,
        isSelected: false,
        hasEntries: false
      }
    ],
    escapeHtml
  });
  assert.equal((html.match(/class="calendar-empty"/g) || []).length, 2);
  assert.match(html, /data-calendar-day="2026-11-18" aria-label="18 ноября 2026 г\., сегодня, выбрана, есть записи" aria-pressed="true"/);
  assert.match(html, /data-calendar-day="&lt;invalid&gt;"/);
  assert.match(html, /id="calendar-jump-toggle"/);
  assert.match(html, /id="calendar-jump-year"/);
  assert.match(html, /<option value="10">Ноябрь<\/option>/);
});

test('meal add plate renders safe context, portion controls, and library states', () => {
  const draftMarkup = ui.renderMealDraftMarkup({
    draftItems: [{
      name: '<Овсянка>',
      kind: 'recipe',
      grams: 150,
      kcal: 200,
      p: 10,
      f: 5,
      c: 20,
      quantityMode: 'portions',
      quantityValue: 1,
      portionGrams: 150,
      meal: 'Обед'
    }],
    standardMeals: ['Завтрак', 'Обед'],
    isLibrarySource: true,
    replaceEntry: false,
    fmt: String,
    nutritionNumber: String,
    escapeHtml
  });
  assert.match(draftMarkup, /&lt;Овсянка&gt;/);
  assert.match(draftMarkup, /data-draft-meal="0"/);
  assert.match(draftMarkup, /value="Обед" selected/);
  assert.match(draftMarkup, /data-draft-unit="portions"/);
  assert.match(draftMarkup, /data-draft-quantity="0"/);
  assert.match(draftMarkup, /data-remove-draft="0"/);

  const replacement = ui.renderMealAddPlateModal({
    meal: 'Ужин',
    dateLabel: '17 ноября 2026 г.',
    replaceEntry: true,
    replaceName: '<Исходное блюдо>',
    isLibrarySource: false,
    libraryDateCount: 0,
    draftMarkup,
    hasDraft: true,
    escapeHtml
  });
  assert.equal(replacement.title, 'Заменить еду');
  assert.match(replacement.body, /Замена «&lt;Исходное блюдо&gt;» · 17 ноября/);
  assert.match(replacement.body, /meal-food-search/);
  assert.doesNotMatch(replacement.actions, /disabled/);

  const library = ui.renderMealAddPlateModal({
    meal: 'Ужин',
    dateLabel: '17 ноября 2026 г.',
    replaceEntry: false,
    isLibrarySource: true,
    libraryDateCount: 4,
    draftMarkup: '',
    hasDraft: false,
    escapeHtml
  });
  assert.equal(library.title, 'Массовое питание · один день');
  assert.match(library.body, /повторится на 4 выбранных датах/);
  assert.match(library.actions, /disabled/);
});

test('meal product search results escape catalog data and mark already selected products', () => {
  const html = ui.renderMealProductSearchResults({
    products: [
      { id: '<p-1>', name: '<Йогурт>', kcal: 61, p: 3.2, f: 2.5, c: 4.7, basisUnit: 'г' },
      { id: 'p-2', name: 'Творог', kcal: 120, p: 18, f: 5, c: 2, basisUnit: 'г' }
    ],
    chosenKeys: ['p-p-2'],
    fmt: String,
    escapeHtml
  });
  assert.match(html, /&lt;Йогурт&gt;/);
  assert.match(html, /data-add-product="&lt;p-1&gt;"/);
  assert.match(html, /aria-label="Добавить &lt;Йогурт&gt;"/);
  assert.match(html, /data-add-product="p-2" disabled aria-label="Уже добавлено"/);
  assert.equal(ui.renderMealProductSearchResults({
    products: [],
    chosenKeys: [],
    fmt: String,
    escapeHtml
  }), '<div class="empty">Ничего не найдено</div>');
});

test('quick-add and mass date dialogs retain both paths and calendar hooks', () => {
  const quickAdd = ui.renderQuickAddMenuModal();
  assert.match(quickAdd.body, /quick-add-single/);
  assert.match(quickAdd.body, /quick-add-mass/);
  assert.match(quickAdd.actions, /quick-add-menu-close/);

  const dates = ui.renderMassDatePickerModal({ mode: 'days' });
  assert.match(dates.body, /data-mass-mode="days" class="active"/);
  assert.match(dates.body, /mass-calendar-grid/);
  assert.match(dates.actions, /mass-date-continue/);
});

test('mass source and calorie dialogs preserve source selection and period wording', () => {
  const source = ui.renderMassSourceModal({ count: 3 });
  assert.match(source.body, /3 дня/);
  assert.match(source.body, /data-mass-source="calories"/);
  assert.match(source.body, /data-mass-source="library"/);
  assert.match(source.body, /data-mass-source="set"/);

  const calories = ui.renderMassCaloriesModal({
    mode: 'period',
    value: '<2000>',
    dateCount: 3,
    escapeHtml
  });
  assert.match(calories.body, /Всего ккал за выбранный период/);
  assert.match(calories.body, /&lt;2000&gt;/);
  assert.match(calories.body, /разделено на 3 выбранных дней/);
  assert.match(calories.actions, /mass-calorie-preview/);
});

test('mass set and preview dialogs expose empty, collision, and disabled states', () => {
  const set = ui.renderMassSetModal({ rows: '', hasAny: false });
  assert.match(set.body, /Пока нет наборов с рецептами/);
  assert.match(set.actions, /mass-set-preview/);

  const preview = ui.renderMassEntryPreviewModal({
    periodLabel: '18 ноября — 20 ноября',
    dateCount: 3,
    sourceTitle: '<Рацион>',
    content: '<div>Калорийность</div>',
    conflictOptionsMarkup: '<option value="skip">Пропустить</option>',
    collision: 'skip',
    toWrite: 2,
    skippedCount: 1,
    escapeHtml
  });
  assert.match(preview.body, /&lt;Рацион&gt;/);
  assert.match(preview.body, /mass-collision-mode/);
  assert.match(preview.body, /Будет пропущено заполненных дней/);
  assert.match(preview.body, /Будет пропущено заполненных дней<\/span><strong>1 дн\./);
  assert.match(preview.actions, /Записать на 2 дн\./);
  assert.doesNotMatch(preview.actions, /disabled/);
});

test('diary entry editor renders safe context and portion-aware controls', () => {
  const edit = ui.renderDiaryEntryEditModal({
    contextDate: '18 ноября 2026 г.',
    name: '<Каша>',
    mealOptionsMarkup: '<option selected>Завтрак</option>',
    supportsPortions: true,
    quantityMode: 'portions',
    initialQuantity: 1.5,
    quantityHelp: 'Обычная порция по рецепту: 200 г.',
    quantityUnit: 'г',
    escapeHtml
  });
  assert.match(edit.body, /&lt;Каша&gt;/);
  assert.match(edit.body, /value="1.5"/);
  assert.match(edit.body, /data-entry-unit="portions" class="active"/);
  assert.match(edit.body, /Обычная порция по рецепту: 200 г/);
  assert.match(edit.actions, /save-entry/);
});

test('diary quick-add form keeps catalog search, meal, quantity, and preview fields', () => {
  const add = ui.renderDiaryEntryAddModal({
    dateText: '18 ноября 2026 г.',
    optionsMarkup: '<option value="p-1">Йогурт</option>',
    catalogCount: 1,
    mealOptionsMarkup: '<option selected>Завтрак</option>',
    quantityMode: 'grams',
    initialQuantity: 100,
    showPortionSwitch: false
  });
  assert.match(add.body, /entry-search/);
  assert.match(add.body, /Йогурт/);
  assert.match(add.body, /1 позиций в каталоге/);
  assert.match(add.body, /entry-meal/);
  assert.match(add.body, /entry-quantity/);
  assert.match(add.body, /entry-preview/);
  assert.match(add.body, /entry-quantity-switch" hidden/);
});

test('water and meal chooser dialogs preserve their existing event hooks', () => {
  const water = ui.renderWaterEntryModal({ dateLabel: '18 ноября 2026 г.' });
  assert.match(water.body, /Обычная питьевая вода/);
  assert.match(water.body, /min="1" max="5000"/);
  assert.match(water.actions, /water-save/);

  const chooser = ui.renderQuickMealChooserModal({
    dateLabel: '18 ноября 2026 г.',
    optionsMarkup: '<button class="history-row" data-quick-meal="Завтрак"><strong>Завтрак</strong><span class="muted">›</span></button>'
  });
  assert.match(chooser.body, /записи за 18 ноября 2026 г\.<\/div>/);
  assert.doesNotMatch(chooser.body, /г\.\./);
  assert.match(chooser.body, /data-quick-meal="Завтрак"/);
  assert.match(chooser.body, /class="history-row"/);
  assert.match(chooser.actions, /quick-meal-cancel/);
});
