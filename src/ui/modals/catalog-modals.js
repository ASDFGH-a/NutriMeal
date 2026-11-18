(function registerCatalogModals(root) {
  const ui = root.NutriMealUI || {};

  ui.renderCollectionModal = function renderCollectionModal({
    existing = null,
    escapeHtml = (value) => String(value)
  } = {}) {
    return {
      title: existing ? 'Переименовать подборку' : 'Новая подборка',
      body: `<div class="field"><label for="collection-name">Название подборки</label><input id="collection-name" type="text" maxlength="60" placeholder="Например, Завтраки или Набор массы" value="${existing ? escapeHtml(existing.name).replace(/"/g, '&quot;') : ''}"></div><div class="field-help" style="margin-top:9px">Внутри можно собрать любые рецепты и продукты. Один объект можно включать в несколько подборок.</div>`,
      actions: '<button class="btn" id="collection-cancel">Отмена</button><button class="btn-primary" id="collection-save">Сохранить</button>'
    };
  };

  ui.renderCollectionSourceModal = function renderCollectionSourceModal({
    collectionName,
    escapeHtml = (value) => String(value)
  }) {
    return {
      title: `Добавить в «${escapeHtml(collectionName)}»`,
      body: '<div class="tabs collection-source-tabs"><button class="tab active" data-collection-source-tab="recipes">Рецепты</button><button class="tab" data-collection-source-tab="products">Мои продукты</button></div><div class="search" style="max-width:none"><span>⌕</span><input id="collection-source-search" type="search" placeholder="Поиск"></div><div class="collection-source-list" id="collection-source-list"></div>',
      actions: '<button class="btn" id="collection-source-done">Готово</button>'
    };
  };

  root.NutriMealUI = ui;
})(globalThis);
