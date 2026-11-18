(function registerCatalogCards(root) {
  const ui = root.NutriMealUI || {};

  ui.renderRecipeCatalogCard = function renderRecipeCatalogCard({
    recipe,
    timeBadge = '',
    missingProducts = false,
    allergenMatches = [],
    mealMeta = '',
    cuisineMeta = '',
    dishTypeMeta = '',
    allergenMeta = '',
    categoriesMeta = '',
    compositionMeta = '',
    productMeta = '',
    customAttributeMeta = '',
    tagsMeta = '',
    pickAction = '',
    removeAction = '',
    escapeHtml
  }) {
    const allergenTitle = allergenMatches.length
      ? `Совпадение с аллергиями профиля: ${allergenMatches.join(', ')}`
      : '';
    return `<article class="card recipe-card" data-recipe="${recipe.id}"><div class="recipe-photo"><span>${escapeHtml(recipe.emoji || '🍽️')}</span>${timeBadge}<div class="recipe-alert-badges">${missingProducts ? '<span class="recipe-alert-badge" title="В составе есть продукт, отсутствующий в каталоге" aria-label="Неполный состав">!</span>' : ''}${allergenMatches.length ? `<span class="recipe-alert-badge allergen" title="${escapeHtml(allergenTitle)}" aria-label="Есть аллерген из профиля">!</span>` : ''}</div><button class="heart ${recipe.favorite ? 'on' : ''}" data-heart="${recipe.id}" aria-label="${recipe.favorite ? 'Убрать из избранного' : 'В избранное'}">${recipe.favorite ? '♥' : '♡'}</button></div><div class="recipe-body"><div class="recipe-name">${escapeHtml(recipe.name)}</div>${mealMeta}${cuisineMeta}${dishTypeMeta}${allergenMeta}${categoriesMeta}${compositionMeta}${productMeta}${customAttributeMeta}${tagsMeta}${pickAction}${removeAction}</div></article>`;
  };

  ui.renderProductCatalogCard = function renderProductCatalogCard({
    product,
    detail = '',
    energyMeta = '',
    macrosMeta = '',
    categoriesMeta = '',
    componentsMeta = '',
    allergensMeta = '',
    stateMeta = '',
    tagsMeta = '',
    customMeta = '',
    pickAction = '',
    manageActions = '',
    removeAction = '',
    escapeHtml
  }) {
    return `<article class="card recipe-card product-pick-card" data-product="${product.id}" tabindex="0" role="button" aria-label="Открыть продукт ${escapeHtml(product.name)}"><div class="recipe-photo"><span>▧</span>${pickAction ? '' : `<button class="heart ${product.favorite ? 'on' : ''}" data-product-heart="${product.id}" aria-label="${product.favorite ? 'Убрать из избранного' : 'В избранное'}">${product.favorite ? '♥' : '♡'}</button>`}</div><div class="recipe-body"><div class="recipe-name">${escapeHtml(product.name)}</div>${detail}${energyMeta}${macrosMeta}${categoriesMeta}${componentsMeta}${allergensMeta}${stateMeta}${tagsMeta}${customMeta}${pickAction}${manageActions}${removeAction}</div></article>`;
  };

  ui.renderCollectionCatalogCard = function renderCollectionCatalogCard({
    collection,
    itemCount,
    pickMode,
    escapeHtml
  }) {
    const itemLabel = itemCount === 1 ? 'позиция' : itemCount >= 2 && itemCount <= 4 ? 'позиции' : 'позиций';
    return `<article class="card collection-card" data-open-collection="${escapeHtml(collection.id)}"><div><div class="collection-card-icon">▤</div><div class="collection-card-title">${escapeHtml(collection.name)}</div><div class="collection-card-meta">${itemCount} ${itemLabel}</div></div>${pickMode ? '' : `<div class="collection-card-actions"><button class="btn-quiet" data-edit-collection="${escapeHtml(collection.id)}">Переименовать</button><button class="btn-quiet" data-delete-collection="${escapeHtml(collection.id)}">Удалить</button></div>`}</article>`;
  };

  root.NutriMealUI = ui;
})(globalThis);
