(function registerCatalogScreen(root) {
  const ui = root.NutriMealUI || {};

  ui.renderCatalogScreen = function renderCatalogScreen({
    pickMode,
    selectionBanner = '',
    tabsMarkup = '',
    detailHeader = '',
    toolbarMarkup = '',
    filtersPanel = '',
    combinedFiltersPanel = '',
    headingMarkup = '',
    content = ''
  }) {
    if (pickMode) {
      return `${selectionBanner}${tabsMarkup}${detailHeader}${toolbarMarkup}${filtersPanel}${headingMarkup}${content}`;
    }
    return `${toolbarMarkup}${combinedFiltersPanel}${tabsMarkup}${detailHeader}${headingMarkup}${content}`;
  };

  ui.renderCatalogTabs = function renderCatalogTabs({
    view,
    pickMode,
    collectionAddContext,
    recipeIngredientPickContext,
    plannerSelectionContext,
    plannerDishAddContext,
    plannerCategoryAddContext
  }) {
    if (pickMode) {
      if (plannerSelectionContext) {
        return '<div class="tabs meal-pick-tabs"><button class="tab active" data-pick-catalog="recipes">Рецепты</button></div>';
      }
      if (recipeIngredientPickContext) {
        return '<div class="tabs meal-pick-tabs"><button class="tab active" data-pick-catalog="myProducts">Мои продукты</button></div>';
      }
      if (plannerDishAddContext || plannerCategoryAddContext) {
        return '<div class="tabs meal-pick-tabs"><button class="tab active" data-pick-catalog="recipes">Рецепты</button></div>';
      }
      return `<div class="tabs meal-pick-tabs"><button class="tab ${view === 'recipes' ? 'active' : ''}" data-pick-catalog="recipes">Рецепты</button><button class="tab ${view === 'myProducts' ? 'active' : ''}" data-pick-catalog="myProducts">Мои продукты</button><button class="tab ${view === 'favorite' ? 'active' : ''}" data-pick-catalog="favorite">Избранное</button>${collectionAddContext ? '' : `<button class="tab ${view === 'collections' ? 'active' : ''}" data-pick-catalog="collections">Подборки</button>`}</div>`;
    }
    const tabs = `<div class="tabs"><button class="tab ${view === 'recipes' ? 'active' : ''}" data-tab="recipes">Рецепты</button><button class="tab ${view === 'myProducts' ? 'active' : ''}" data-tab="myProducts">Мои продукты</button><button class="tab ${view === 'favorite' ? 'active' : ''}" data-tab="favorite">Избранное</button><button class="tab ${view === 'collections' ? 'active' : ''}" data-tab="collections">Подборки</button></div>`;
    return `<div class="catalog-tabs-row">${tabs}<button type="button" class="icon-btn catalog-card-settings-btn" id="catalog-card-settings" title="Настройки отображения карточек" aria-label="Настройки отображения карточек">⚙</button></div>`;
  };

  ui.renderCatalogToolbar = function renderCatalogToolbar({
    searchPlaceholder,
    searchValue,
    filterButton = '',
    actionButton = ''
  }) {
    return `<div class="toolbar"><div class="search"><span>⌕</span><input id="recipe-search" placeholder="${searchPlaceholder}" value="${String(searchValue).replace(/"/g, '&quot;')}"></div>${filterButton}${actionButton}</div>`;
  };

  root.NutriMealUI = ui;
})(globalThis);
