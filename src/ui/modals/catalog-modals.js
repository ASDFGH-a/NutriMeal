(function registerCatalogModals(root) {
  const ui = root.NutriMealUI || {};

  ui.renderRecipeNutritionPanel = function renderRecipeNutritionPanel({
    nutrition,
    mode = 'per100',
    formatNumber = (value) => String(value),
    escapeHtml = (value) => String(value)
  }) {
    const selectedMode = ['total', 'portion'].includes(mode) ? mode : 'per100';
    const values = nutrition[selectedMode] || nutrition.per100;
    const caption = selectedMode === 'total'
      ? 'Во всём блюде'
      : selectedMode === 'portion'
        ? `Порция · ${formatNumber(nutrition.portionGrams)} г`
        : 'На 100 г';
    const nutrientRows = [
      ['fiber', 'Клетчатка', 'г'],
      ['sugar', 'Сахар', 'г'],
      ['sodium', 'Натрий', 'мг'],
      ['cholesterol', 'Холестерин', 'мг'],
      ['potassium', 'Калий', 'мг']
    ];
    const nutrientMarkup = nutrientRows.map(([key, label, unit]) => (
      `<div><span>${label}</span><b>${formatNumber(values[key])} ${unit}</b></div>`
    )).join('');
    const components = nutrition.components?.[selectedMode] || nutrition.components?.per100 || [];
    const componentMarkup = components.length
      ? `<details class="recipe-micro-details" open><summary><span>›</span> Витамины, минералы и другие нутриенты</summary><div class="recipe-micro-grid">${components.map((component) => `<div><span>${escapeHtml(component.name)}</span><b>${formatNumber(component.amount)} ${escapeHtml(component.unit)}</b></div>`).join('')}</div></details>`
      : '';
    const warningParts = [];
    if (nutrition.conversionIssues?.length) {
      warningParts.push(`Укажи плотность продукта для перевода г и мл: ${nutrition.conversionIssues.map((issue) => escapeHtml(issue.product.name)).join(', ')}.`);
    }
    if (nutrition.missingProducts?.length) {
      const names = nutrition.missingProducts.map((row) => escapeHtml(
        row.productName || row.name || row.productId || 'Неизвестный продукт'
      ));
      warningParts.push(`Не включены отсутствующие продукты: ${names.join(', ')}.`);
    }
    const warningMarkup = warningParts.length
      ? `<div class="field-help">${warningParts.join(' ')}</div>`
      : '';

    return `<div class="recipe-nutrition-main"><div class="recipe-nutrition-kcal"><strong>${Math.round(Number(values.kcal) || 0).toLocaleString('ru-RU')} ккал</strong><span>${caption}</span></div><div class="recipe-macro-grid"><div><span>Белки</span><b>${formatNumber(values.p)} г</b></div><div><span>Жиры</span><b>${formatNumber(values.f)} г</b></div><div><span>Углеводы</span><b>${formatNumber(values.c)} г</b></div></div><details class="recipe-micro-details"><summary><span>›</span> Питательные вещества</summary><div class="recipe-micro-grid">${nutrientMarkup}</div></details>${componentMarkup}${warningMarkup}</div>`;
  };

  ui.renderRecipeDetailModal = function renderRecipeDetailModal({
    recipe,
    nutrition,
    products = [],
    allergens = [],
    allergyMatches = [],
    formatNumber = (value) => String(value),
    escapeHtml = (value) => String(value)
  }) {
    const tags = (Array.isArray(recipe.tags) ? recipe.tags : [])
      .map((tag) => `<span class="recipe-meta-tag">${escapeHtml(tag)}</span>`)
      .join('');
    const allergenTags = allergens.length
      ? allergens.map((allergen) => `<span class="recipe-meta-tag">${escapeHtml(allergen)}</span>`).join('')
      : '<span class="recipe-meta-muted">Не указаны</span>';
    const ingredientRows = (Array.isArray(recipe.ingredientItems) ? recipe.ingredientItems : [])
      .map((row) => {
        const product = products.find((entry) => String(entry.id) === String(row.productId));
        const label = product?.name || row.productName || row.name || 'Неизвестный продукт';
        const amount = Number(row.amount ?? row.grams) || 0;
        const unit = row.unit || 'г';
        return `<div class="recipe-ingredient-row ${product ? '' : 'recipe-ingredient-missing'}"><span>${escapeHtml(label)}${product ? '' : ' <small>— отсутствует в каталоге</small>'}</span><b>${formatNumber(amount)} ${escapeHtml(unit)}</b></div>`;
      }).join('');
    const steps = (Array.isArray(recipe.steps) ? recipe.steps : [])
      .map((step, index) => {
        const text = typeof step === 'string' ? step : step?.text || step?.name || '';
        return `<div class="recipe-step"><span>${index + 1}</span><p>${escapeHtml(text)}</p></div>`;
      }).join('');
    const warnings = [
      nutrition.missingProducts?.length
        ? '<div class="recipe-warning-note">⚠ В составе есть продукты, отсутствующие в каталоге. Их пищевая ценность не включена в расчёт.</div>'
        : '',
      allergyMatches.length
        ? `<div class="recipe-warning-note recipe-allergen-note">⚠ Содержит аллергены из профиля: ${allergyMatches.map(escapeHtml).join(', ')}</div>`
        : ''
    ].join('');
    const image = recipe.imageData
      ? `<img src="${escapeHtml(recipe.imageData)}" alt="Фото блюда">`
      : escapeHtml(recipe.emoji || '🍽️');
    const body = `<div class="recipe-detail-hero"><div class="recipe-detail-image">${image}</div><div class="recipe-detail-hero-info"><div class="recipe-hero-metric"><span>Вес готового блюда</span><strong>${formatNumber(nutrition.weight)} г</strong></div><div class="recipe-hero-metric"><span>Энергетическая ценность</span><strong>${Math.round(Number(nutrition.per100.kcal) || 0)} <small>ккал / 100 г</small></strong></div><div class="recipe-hero-tags">${tags}</div></div></div><div class="recipe-meta-grid"><div><span>Время готовки</span><b>${Number(recipe.time) || 0} мин.</b></div><div><span>Сложность</span><b>${escapeHtml(recipe.difficulty || 'Не указана')}</b></div><div><span>Тип кухни</span><b>${escapeHtml(recipe.cuisine || 'Не указан')}</b></div><div class="recipe-meta-allergens"><span>Аллергены</span><div>${allergenTags}</div></div></div>${warnings}<section class="recipe-detail-section"><div class="recipe-detail-section-head"><h3>КБЖУ</h3><span>Пищевая ценность</span></div><div class="recipe-nutrition-switch" role="group" aria-label="Период расчёта КБЖУ"><button type="button" data-nutrition-mode="total">Всего</button><button type="button" class="active" data-nutrition-mode="per100">На 100 г</button><button type="button" data-nutrition-mode="portion">Порция · ${formatNumber(nutrition.portionGrams)} г</button></div><div id="recipe-nutrition-values">${ui.renderRecipeNutritionPanel({ nutrition, mode: 'per100', formatNumber, escapeHtml })}</div></section><details class="recipe-collapsible-section" open><summary><h3>Ингредиенты</h3><span class="recipe-collapse-meta">${Array.isArray(recipe.ingredientItems) ? recipe.ingredientItems.length : 0} поз. <b class="recipe-collapse-arrow">›</b></span></summary><div class="recipe-collapsible-content"><div class="recipe-ingredients-list">${ingredientRows || '<div class="field-help">Ингредиенты пока не добавлены.</div>'}</div></div></details><details class="recipe-collapsible-section" open><summary><h3>Пошаговое приготовление</h3><span class="recipe-collapse-meta">${steps ? recipe.steps.length : 0} шагов <b class="recipe-collapse-arrow">›</b></span></summary><div class="recipe-collapsible-content"><div class="recipe-steps-list">${steps || '<div class="field-help">Шаги приготовления пока не добавлены.</div>'}</div></div></details>`;

    return { body };
  };

  ui.renderProductDetailModal = function renderProductDetailModal({
    product,
    formatNumber = (value) => String(value),
    escapeHtml = (value) => String(value)
  }) {
    const basis = product.basisUnit === 'мл' ? '100 мл' : '100 г';
    const tags = (label, values) => Array.isArray(values) && values.length
      ? `<section class="recipe-detail-section"><div class="recipe-detail-section-head"><h3>${label}</h3></div><div class="recipe-hero-tags">${values.map((value) => `<span class="recipe-meta-tag">${escapeHtml(value)}</span>`).join('')}</div></section>`
      : '';
    const components = (Array.isArray(product.components) ? product.components : [])
      .map((component) => `<div class="recipe-ingredient-row"><span>${escapeHtml(component.name)}</span><b>${formatNumber(component.amount)} ${escapeHtml(component.unit)} / ${basis}</b></div>`)
      .join('');
    const image = product.imageData
      ? `<img src="${escapeHtml(product.imageData)}" alt="Фото продукта">`
      : escapeHtml(product.emoji || '▧');
    const body = `<div class="product-detail-hero"><div class="product-detail-image">${image}</div><div class="product-detail-main"><div class="product-detail-brand">${escapeHtml(product.brand || 'Производитель не указан')}</div><div class="product-detail-kcal">${formatNumber(product.kcal)} <small>ккал / ${basis}</small></div><div class="product-detail-sub">Пищевая ценность продукта</div>${Number(product.density) > 0 ? `<div class="product-detail-sub">Плотность: ${formatNumber(product.density)} г/мл</div>` : ''}</div></div><section class="recipe-detail-section"><div class="recipe-detail-section-head"><h3>КБЖУ на ${basis}</h3><span>На основе данных продукта</span></div><div class="recipe-macro-grid product-macro-grid"><div><span>Белки</span><b>${formatNumber(product.p)} г</b></div><div><span>Жиры</span><b>${formatNumber(product.f)} г</b></div><div><span>Углеводы</span><b>${formatNumber(product.c)} г</b></div></div></section>${tags('Категории', product.categories)}${tags('Состояние продукта', product.state)}${tags('Аллергены', product.allergens)}${tags('Пользовательские теги', product.tags)}${components ? `<section class="recipe-detail-section"><div class="recipe-detail-section-head"><h3>Полезные компоненты</h3><span>На ${basis}</span></div><div class="recipe-ingredients-list">${components}</div></section>` : ''}<div class="product-detail-note">Пищевая ценность и полезные компоненты указаны на ${basis} в зависимости от выбранной основы расчёта.</div>`;

    return { body };
  };

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
