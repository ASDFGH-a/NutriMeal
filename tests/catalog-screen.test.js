import assert from 'node:assert/strict';
import test from 'node:test';
import '../src/ui/screens/catalog/catalog-screen.js';

test('catalog screen composes normal catalog shell', () => {
  const html = globalThis.NutriMealUI.renderCatalogScreen({
    pickMode: false,
    toolbarMarkup: '<div>Поиск</div>',
    combinedFiltersPanel: '<div>Фильтры</div>',
    tabsMarkup: '<div>Вкладки</div>',
    detailHeader: '',
    headingMarkup: '<div>Рецепты</div>',
    content: '<div>Карточки</div>'
  });
  assert.match(html, /Поиск/);
  assert.match(html, /Фильтры/);
  assert.match(html, /Вкладки/);
  assert.match(html, /Рецепты/);
  assert.match(html, /Карточки/);
});

test('catalog screen composes selection mode without combined filters', () => {
  const html = globalThis.NutriMealUI.renderCatalogScreen({
    pickMode: true,
    selectionBanner: '<div>Режим выбора</div>',
    tabsMarkup: '<div>Продукты</div>',
    toolbarMarkup: '<div>Поиск</div>',
    filtersPanel: '<div>Фильтр выбора</div>',
    headingMarkup: '<div>Мои продукты</div>',
    content: '<div>Список</div>'
  });
  assert.match(html, /Режим выбора/);
  assert.match(html, /Продукты/);
  assert.match(html, /Фильтр выбора/);
  assert.doesNotMatch(html, /undefined/);
});

test('catalog tabs render normal and selection layouts', () => {
  const normal = globalThis.NutriMealUI.renderCatalogTabs({
    view: 'recipes',
    pickMode: false
  });
  assert.match(normal, /catalog-tabs-row/);
  assert.match(normal, /data-tab="recipes"/);
  assert.match(normal, /catalog-card-settings/);

  const pick = globalThis.NutriMealUI.renderCatalogTabs({
    view: 'myProducts',
    pickMode: true,
    recipeIngredientPickContext: { draft: {} }
  });
  assert.match(pick, /Мои продукты/);
  assert.match(pick, /meal-pick-tabs/);
});

test('catalog toolbar escapes search values and includes actions', () => {
  const html = globalThis.NutriMealUI.renderCatalogToolbar({
    searchPlaceholder: 'Поиск рецептов',
    searchValue: 'яйцо "с сыром"',
    filterButton: '<button>Фильтры</button>',
    actionButton: '<button>Новый рецепт</button>'
  });
  assert.match(html, /Поиск рецептов/);
  assert.match(html, /яйцо &quot;с сыром&quot;/);
  assert.match(html, /Фильтры/);
  assert.match(html, /Новый рецепт/);
});
