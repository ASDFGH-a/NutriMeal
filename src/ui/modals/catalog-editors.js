(function registerCatalogEditors(root) {
  const ui = root.NutriMealUI || {};

  ui.renderRecipeEditorModal = function renderRecipeEditorModal({
    existing,
    draft,
    ingredientMarkup,
    componentMarkup,
    metadataMarkup,
    nutritionPreview,
    escapeHtml
  }) {
    const body = `<div class="recipe-editor-form"><div class="form-grid"><div class="field full"><label for="recipe-edit-name">Название блюда</label><input id="recipe-edit-name" maxlength="120" value="${escapeHtml(draft.name || '')}" placeholder="Например, рис с овощами"></div><div class="field"><label for="recipe-edit-emoji">Значок, если нет фото</label><input id="recipe-edit-emoji" maxlength="8" value="${escapeHtml(draft.emoji || '🍽️')}"></div><div class="field"><label for="recipe-edit-time">Время готовки, минут</label><input id="recipe-edit-time" type="number" min="0" max="1440" value="${draft.time || 0}"></div><div class="field"><label for="recipe-edit-difficulty">Сложность</label><select id="recipe-edit-difficulty"><option ${draft.difficulty === 'Легко' ? 'selected' : ''}>Легко</option><option ${draft.difficulty === 'Средне' ? 'selected' : ''}>Средне</option><option ${draft.difficulty === 'Сложно' ? 'selected' : ''}>Сложно</option></select></div>${metadataMarkup}<div class="field"><label for="recipe-edit-yield">Вес готового блюда, г</label><input id="recipe-edit-yield" type="number" min="1" step="1" value="${draft.totalWeight || 300}"></div><div class="field"><label for="recipe-edit-portion">Обычная порция, г</label><input id="recipe-edit-portion" type="number" min="1" step="1" value="${draft.portionGrams || 200}"></div></div>
 <section class="recipe-editor-section"><div class="recipe-detail-section-head"><h3>Фотография блюда</h3><span>Необязательно</span></div><div class="recipe-image-editor"><div id="recipe-image-preview">${draft.imageData ? `<img src="${escapeHtml(draft.imageData)}" alt="Предпросмотр блюда">` : escapeHtml(draft.emoji || '🍽️')}</div><label class="btn" for="recipe-edit-image-file">Выбрать изображение</label><input id="recipe-edit-image-file" type="file" accept="image/*" hidden><div class="field-help">Изображение будет использоваться в карточке рецепта.</div></div></section>
 <section class="recipe-editor-section"><div class="recipe-detail-section-head"><h3>Ингредиенты</h3><span>Продукт и количество</span></div><div id="recipe-editor-ingredients">${ingredientMarkup}</div><button type="button" class="btn recipe-add-ingredient" id="recipe-add-ingredient">＋ Выбрать продукты</button><p class="recipe-picker-selection-note">Откроется раздел «Мои продукты». Выбранные продукты вернутся сюда, где можно указать количество в граммах или миллилитрах.</p></section>
 <section class="recipe-editor-section"><div class="recipe-detail-section-head"><h3>Микронутриенты</h3><span>На 100 г готового блюда</span></div><div id="recipe-component-list" class="product-nutrient-list">${componentMarkup || '<div class="filter-admin-note">Пока нутриенты не добавлены.</div>'}</div><button type="button" class="btn" id="recipe-add-component">＋ Добавить нутриент</button><div class="field-help" style="margin-top:8px">Укажи содержание витаминов, минералов и других нутриентов на 100 г готового блюда.</div></section>
 <section class="recipe-editor-section"><div class="recipe-detail-section-head"><h3>Пищевая ценность</h3><span>КБЖУ рассчитывается по составу</span></div><div id="recipe-editor-nutrition-preview">${nutritionPreview}</div></section>
 <section class="recipe-editor-section"><div class="recipe-detail-section-head"><h3>Пошаговое приготовление</h3><span>Один шаг — одна строка</span></div><div class="field"><label for="recipe-edit-steps">Шаги приготовления</label><textarea id="recipe-edit-steps" rows="5" placeholder="Шаг 1…&#10;Шаг 2…">${escapeHtml(draft.steps.join('\n'))}</textarea></div></section></div>`;
    return {
      title: existing ? 'Редактирование рецепта' : 'Новый рецепт',
      body,
      actions: '<button class="btn" id="recipe-editor-cancel">Отмена</button><button class="btn-primary" id="recipe-editor-save">Сохранить</button>'
    };
  };

  ui.renderProductEditorModal = function renderProductEditorModal({
    existing,
    draft,
    brandField,
    categoriesField,
    allergensField,
    stateField,
    tagsField,
    customFieldsMarkup,
    componentRows,
    escapeHtml
  }) {
    const body = `<div class="product-editor-form"><div class="form-grid">
  <div class="field full"><label for="my-product-name">Название продукта</label><input id="my-product-name" type="text" maxlength="100" placeholder="Например, овсяные хлопья" value="${escapeHtml(draft.name || '')}"></div>
  ${brandField}
  <div class="field full"><div class="card-desc">Пищевая ценность</div></div>
  <div class="field full"><label for="my-product-basis">Основа расчёта</label><select id="my-product-basis"><option value="г" ${draft.basisUnit !== 'мл' ? 'selected' : ''}>На 100 г</option><option value="мл" ${draft.basisUnit === 'мл' ? 'selected' : ''}>На 100 мл</option></select></div><div class="field full"><label for="my-product-density">Плотность, г/мл</label><input id="my-product-density" type="number" min="0.0001" max="100" step="0.001" value="${draft.density ?? ''}" placeholder="Необязательно; нужно для перевода г ↔ мл"><div class="field-help">Укажи плотность, если продукт понадобится пересчитывать между граммами и миллилитрами.</div></div>
  <div class="field"><label for="my-product-kcal">Калории, ккал</label><input id="my-product-kcal" type="number" min="0" max="1000" step="0.1" value="${draft.kcal ?? 0}"></div>
  <div class="field"><label for="my-product-p">Белки, г</label><input id="my-product-p" type="number" min="0" max="100" step="0.1" value="${draft.p ?? 0}"></div>
  <div class="field"><label for="my-product-f">Жиры, г</label><input id="my-product-f" type="number" min="0" max="100" step="0.1" value="${draft.f ?? 0}"></div>
  <div class="field"><label for="my-product-c">Углеводы, г</label><input id="my-product-c" type="number" min="0" max="100" step="0.1" value="${draft.c ?? 0}"></div>
  ${categoriesField}
  ${allergensField}
  ${stateField}
  ${tagsField}
  ${customFieldsMarkup}
 </div>
 <section class="recipe-editor-section"><div class="recipe-detail-section-head"><h3>Полезные компоненты</h3><span>Количество на 100 ${draft.basisUnit === 'мл' ? 'мл' : 'г'}</span></div><div id="product-nutrient-list" class="product-nutrient-list">${componentRows || '<div class="filter-admin-note">Пока компоненты не добавлены.</div>'}</div><button type="button" class="btn" id="product-add-nutrient">＋ Добавить компонент</button><div class="field-help" style="margin-top:8px">Для каждого компонента укажи содержание и единицу измерения на выбранную основу.</div></section>
 </div>`;
    return {
      title: existing ? 'Редактирование продукта' : 'Новый продукт',
      body,
      actions: '<button class="btn" id="my-product-cancel">Отмена</button><button class="btn-primary" id="my-product-save">Сохранить</button>'
    };
  };

  root.NutriMealUI = ui;
})(globalThis);
