import assert from 'node:assert/strict';
import test from 'node:test';
import '../src/ui/components/catalog/catalog-filters.js';

const ui = globalThis.NutriMealUI;

test('recipe filter panel preserves selected mode, reset, and empty-category state', () => {
  const html = ui.renderRecipeFilterPanel({
    open: false,
    count: 2,
    mode: 'standard',
    standardCategoriesMarkup: '',
    customTagsMarkup: '<div>Теги</div>'
  });

  assert.match(html, /filter-panel open/);
  assert.match(html, /data-filter-mode="standard"/);
  assert.match(html, /aria-selected="true"/);
  assert.match(html, /reset-recipe-filters/);
  assert.match(html, /Категории удалены/);
});

test('product filter panel renders custom tags mode and closed state', () => {
  const html = ui.renderProductFilterPanel({
    open: false,
    count: 0,
    mode: 'custom',
    standardCategoriesMarkup: '<section>Категории</section>',
    customTagsMarkup: '<div>Теги</div>'
  });

  assert.match(html, /id="product-filter-panel"/);
  assert.doesNotMatch(html, /filter-panel open/);
  assert.match(html, /data-product-filter-mode="custom"/);
  assert.match(html, /Теги/);
  assert.match(html, /reset-product-filters/);
});

test('catalog card settings modal escapes option data and reflects saved values', () => {
  const dialog = ui.renderCatalogCardSettingsModal({
    isProducts: true,
    options: [['custom', '<Марка>', 'Описание & параметры']],
    settings: { custom: true },
    escapeHtml: (value) => String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
  });

  assert.equal(dialog.title, 'Настройки отображения карточек');
  assert.match(dialog.body, /&lt;Марка&gt;/);
  assert.match(dialog.body, /Описание &amp; параметры/);
  assert.match(dialog.body, /data-card-display-key="custom" checked/);
  assert.match(dialog.body, /Карточки продуктов/);
  assert.match(dialog.actions, /card-display-save/);
});

test('recipe custom filter category dialog keeps editor guidance and action hooks', () => {
  const dialog = ui.renderRecipeFilterCategoryCreateModal();
  assert.equal(dialog.title, 'Новая категория фильтра');
  assert.match(dialog.body, /new-filter-category-name/);
  assert.match(dialog.body, /редакторе рецептов/);
  assert.match(dialog.actions, /new-filter-category-cancel/);
  assert.match(dialog.actions, /new-filter-category-save/);
});

test('product custom filter category dialog keeps editor guidance and action hooks', () => {
  const dialog = ui.renderProductFilterCategoryCreateModal();
  assert.equal(dialog.title, 'Новая категория фильтра продуктов');
  assert.match(dialog.body, /new-product-filter-category-name/);
  assert.match(dialog.body, /редакторе продуктов/);
  assert.match(dialog.actions, /new-product-filter-category-cancel/);
  assert.match(dialog.actions, /new-product-filter-category-save/);
});

test('recipe filter category editor escapes values and renders category-specific controls', () => {
  const escapeHtml = (value) => String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
  const dialog = ui.renderRecipeFilterCategoryEditorModal({
    categoryLabel: '<Метод>',
    isCustomTags: false,
    isProductCategory: false,
    isRangeCategory: false,
    values: ['<Запекание>'],
    canDelete: true,
    escapeHtml
  });
  assert.equal(dialog.title, 'Настройка фильтра');
  assert.match(dialog.body, /value="&lt;Метод&gt;"/);
  assert.match(dialog.body, /value="&lt;Запекание&gt;"/);
  assert.match(dialog.body, /filter-admin-add-value/);
  assert.match(dialog.actions, /filter-admin-delete-category/);
  assert.match(dialog.actions, /filter-admin-save-category/);

  const range = ui.renderRecipeFilterCategoryEditorModal({
    categoryLabel: 'Время',
    isCustomTags: false,
    isProductCategory: false,
    isRangeCategory: true,
    values: [],
    canDelete: false,
    escapeHtml
  });
  assert.match(range.body, /числовой диапазон/);
  assert.doesNotMatch(range.actions, /filter-admin-delete-category/);
});

test('product filter category editor preserves values, custom tags, and range guidance', () => {
  const escapeHtml = (value) => String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
  const dialog = ui.renderProductFilterCategoryEditorModal({
    categoryLabel: '<Бренд>',
    isCustomTags: true,
    isRange: false,
    values: ['Марка & знак'],
    canDelete: true,
    escapeHtml
  });
  assert.equal(dialog.title, 'Настройка фильтра продуктов');
  assert.match(dialog.body, /value="&lt;Бренд&gt;"/);
  assert.match(dialog.body, /Список пользовательских тегов/);
  assert.match(dialog.body, /Марка &amp; знак/);
  assert.match(dialog.body, /product-filter-admin-add-value/);
  assert.match(dialog.actions, /product-filter-admin-delete-category/);

  const range = ui.renderProductFilterCategoryEditorModal({
    categoryLabel: 'Состав',
    isCustomTags: false,
    isRange: true,
    values: [],
    canDelete: false,
    escapeHtml
  });
  assert.match(range.body, /Числовые значения задаются диапазонами/);
  assert.doesNotMatch(range.actions, /product-filter-admin-delete-category/);
});
