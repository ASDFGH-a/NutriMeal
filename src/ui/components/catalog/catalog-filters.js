(function registerCatalogFilters(root) {
  const ui = root.NutriMealUI || {};

  ui.renderRecipeFilterPanel = function renderRecipeFilterPanel({
    open,
    count,
    mode,
    standardCategoriesMarkup,
    customTagsMarkup
  }) {
    return `<div class="filter-panel ${open || count ? 'open' : ''}" id="filter-panel">
  <div class="filter-panel-head"><div><div class="filter-panel-title">Фильтры рецептов</div><div class="filter-panel-note">Выбери режим. Настройка категорий и значений доступна прямо в панели.</div></div><button type="button" class="btn-quiet" id="reset-recipe-filters">Сбросить всё</button></div>
  <div class="filter-mode-switch" role="tablist" aria-label="Группа фильтров"><button type="button" role="tab" aria-selected="${mode === 'standard'}" class="${mode === 'standard' ? 'active' : ''}" data-filter-mode="standard">Стандартные</button><button type="button" role="tab" aria-selected="${mode === 'custom'}" class="${mode === 'custom' ? 'active' : ''}" data-filter-mode="custom">Пользовательские</button></div>
  ${mode === 'standard' ? `<div class="filter-mode-content"><div class="filter-mode-intro"><span>Стандартные категории</span><button type="button" class="btn" id="add-standard-filter-category">＋ Добавить категорию</button></div><div class="filter-standard-grid">${standardCategoriesMarkup || '<div class="filter-empty-note">Категории удалены. Добавь новую категорию.</div>'}</div></div>` : `<div class="filter-mode-content">${customTagsMarkup}</div>`}
 </div>`;
  };

  ui.renderProductFilterPanel = function renderProductFilterPanel({
    open,
    count,
    mode,
    standardCategoriesMarkup,
    customTagsMarkup
  }) {
    return `<div class="filter-panel ${open || count ? 'open' : ''}" id="product-filter-panel"><div class="filter-panel-head"><div><div class="filter-panel-title">Фильтры продуктов</div><div class="filter-panel-note">Стандартные характеристики и собственные теги продуктов.</div></div><button type="button" class="btn-quiet" id="reset-product-filters">Сбросить всё</button></div><div class="filter-mode-switch" role="tablist" aria-label="Группа фильтров продуктов"><button type="button" role="tab" aria-selected="${mode === 'standard'}" class="${mode === 'standard' ? 'active' : ''}" data-product-filter-mode="standard">Стандартные</button><button type="button" role="tab" aria-selected="${mode === 'custom'}" class="${mode === 'custom' ? 'active' : ''}" data-product-filter-mode="custom">Пользовательские</button></div>${mode === 'standard' ? `<div class="filter-mode-content"><div class="filter-mode-intro"><span>Стандартные категории</span><button type="button" class="btn" id="add-standard-product-filter-category">＋ Добавить категорию</button></div><div class="filter-standard-grid">${standardCategoriesMarkup || '<div class="filter-empty-note">Категории удалены. Добавь новую категорию.</div>'}</div></div>` : `<div class="filter-mode-content">${customTagsMarkup}</div>`}</div>`;
  };

     ui.renderRecipeFilterCategoryCreateModal = function renderRecipeFilterCategoryCreateModal() {
       return {
         title: 'Новая категория фильтра',
         body: '<div class="field"><label for="new-filter-category-name">Название категории</label><input id="new-filter-category-name" maxlength="64" placeholder="Например, Способ приготовления"></div><div class="filter-admin-note">Категория появится в стандартных фильтрах и в редакторе рецептов. Для неё можно будет создавать и выбирать собственные значения.</div>',
         actions: '<button type="button" class="btn" id="new-filter-category-cancel">Отмена</button><button type="button" class="btn-primary" id="new-filter-category-save">Создать</button>'
       };
     };

     ui.renderProductFilterCategoryCreateModal = function renderProductFilterCategoryCreateModal() {
       return {
         title: 'Новая категория фильтра продуктов',
         body: '<div class="field"><label for="new-product-filter-category-name">Название категории</label><input id="new-product-filter-category-name" maxlength="64" placeholder="Например, Способ обработки"></div><div class="filter-admin-note">Категория появится в фильтрах и редакторе продуктов. Для неё можно будет создавать и выбирать собственные значения.</div>',
         actions: '<button type="button" class="btn" id="new-product-filter-category-cancel">Отмена</button><button type="button" class="btn-primary" id="new-product-filter-category-save">Создать</button>'
       };
     };

     ui.renderRecipeFilterCategoryEditorModal = function renderRecipeFilterCategoryEditorModal({
       categoryLabel,
       isCustomTags,
       isProductCategory,
       isRangeCategory,
       values,
       canDelete,
       escapeHtml
     }) {
       const rows = values.map((value, index) => (
         `<div class="filter-admin-value-row"><input type="text" data-admin-value-input="${index}" value="${escapeHtml(value)}" aria-label="Значение ${escapeHtml(value)}"><button type="button" class="btn-quiet" data-save-admin-value="${index}">Заменить</button><button type="button" class="btn-quiet filter-admin-delete" data-delete-admin-value="${index}">Удалить</button></div>`
       )).join('');
       const addValue = isProductCategory
         ? '<div class="filter-admin-note">Список вариантов берётся из каталога «Мои продукты» и управляется там.</div>'
         : isRangeCategory
           ? '<div class="filter-admin-note">У этой категории числовой диапазон. Изменяется название категории; диапазоны остаются частью фильтра.</div>'
           : '<div class="filter-admin-add"><input type="text" id="filter-admin-new-value" maxlength="48" placeholder="Новое значение"><button type="button" class="btn" id="filter-admin-add-value">＋ Добавить</button></div>';
       const deleteButton = canDelete
         ? '<button type="button" class="btn-danger" id="filter-admin-delete-category">Удалить категорию</button>'
         : '';
       return {
         title: 'Настройка фильтра',
         body: `<div class="filter-admin-form"><div class="field"><label for="filter-admin-category-name">Название категории</label><input id="filter-admin-category-name" maxlength="64" value="${escapeHtml(categoryLabel)}"></div><div class="filter-admin-section"><div class="filter-admin-section-head"><div><strong>${isCustomTags ? 'Список пользовательских тегов' : 'Значения категории'}</strong><small>Переименование обновит привязки в рецептах и фильтрах.</small></div><span class="tag">${values.length} знач.</span></div>${rows || '<div class="filter-admin-note">Пока нет значений.</div>'}${addValue}</div></div>`,
         actions: `${deleteButton}<button type="button" class="btn" id="filter-admin-cancel">Отмена</button><button type="button" class="btn-primary" id="filter-admin-save-category">Сохранить</button>`
       };
     };

     ui.renderProductFilterCategoryEditorModal = function renderProductFilterCategoryEditorModal({
       categoryLabel,
       isCustomTags,
       isRange,
       values,
       canDelete,
       escapeHtml
     }) {
       const rows = values.map((value, index) => (
         `<div class="filter-admin-value-row"><input type="text" data-product-admin-value-input="${index}" value="${escapeHtml(value)}" aria-label="Значение ${escapeHtml(value)}"><button type="button" class="btn-quiet" data-product-save-admin-value="${index}">Заменить</button><button type="button" class="btn-quiet filter-admin-delete" data-product-delete-admin-value="${index}">Удалить</button></div>`
       )).join('');
       const addValue = isRange
         ? '<div class="filter-admin-note">Числовые значения задаются диапазонами в фильтре. Здесь можно изменить название категории.</div>'
         : '<div class="filter-admin-add"><input type="text" id="product-filter-admin-new-value" maxlength="64" placeholder="Новое значение"><button type="button" class="btn" id="product-filter-admin-add-value">＋ Добавить</button></div>';
       const deleteButton = canDelete
         ? '<button type="button" class="btn-danger" id="product-filter-admin-delete-category">Удалить категорию</button>'
         : '';
       return {
         title: 'Настройка фильтра продуктов',
         body: `<div class="filter-admin-form"><div class="field"><label for="product-filter-admin-category-name">Название категории</label><input id="product-filter-admin-category-name" maxlength="64" value="${escapeHtml(categoryLabel)}"></div><div class="filter-admin-section"><div class="filter-admin-section-head"><div><strong>${isCustomTags ? 'Список пользовательских тегов' : 'Значения категории'}</strong><small>Изменения синхронизируются с карточками продуктов и фильтрами.</small></div><span class="tag">${values.length} знач.</span></div>${rows || '<div class="filter-admin-note">Пока нет значений.</div>'}${addValue}</div></div>`,
         actions: `${deleteButton}<button type="button" class="btn" id="product-filter-admin-cancel">Отмена</button><button type="button" class="btn-primary" id="product-filter-admin-save">Сохранить</button>`
       };
     };

  ui.renderCatalogCardSettingsModal = function renderCatalogCardSettingsModal({
    isProducts,
    options,
    settings,
    escapeHtml
  }) {
    const optionMarkup = options.map(([key, label, description]) => (
      `<label class="card-display-option"><span><strong>${escapeHtml(label)}</strong><small>${escapeHtml(description)}</small></span><input type="checkbox" data-card-display-key="${escapeHtml(key)}" ${settings[key] ? 'checked' : ''}></label>`
    )).join('');
    const body = `<div class="card-display-settings"><p class="filter-admin-note">${isProducts ? 'Выбери, какие характеристики продуктов показывать на карточках. Используются только параметры раздела «Мои продукты».' : 'Выбери, какие характеристики рецептов показывать на карточках. Используются параметры раздела «Рецепты».'}</p><section class="card-display-group"><div class="card-display-group-head"><strong>${isProducts ? 'Карточки продуктов' : 'Карточки рецептов'}</strong><span>${isProducts ? 'Мои продукты · Избранное · Подборки' : 'Рецепты · Избранное · Подборки'}</span></div>${optionMarkup}</section></div>`;
    return {
      title: 'Настройки отображения карточек',
      body,
      actions: '<button type="button" class="btn" id="card-display-cancel">Отмена</button><button type="button" class="btn-primary" id="card-display-save">Сохранить</button>'
    };
  };

  root.NutriMealUI = ui;
})(globalThis);
