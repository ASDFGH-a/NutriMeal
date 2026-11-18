(function registerDiaryModals(root) {
  const ui = root.NutriMealUI || {};

  ui.renderCalendarMonthContent = function renderCalendarMonthContent({
    blankCount,
    days,
    escapeHtml
  }) {
    const blanks = Array.from({ length: blankCount }, () => (
      '<span class="calendar-empty" aria-hidden="true"></span>'
    )).join('');
    const dayMarkup = days.map((item) => {
      const classes = ['calendar-day'];
      const state = [];
      if (item.isToday) {
        classes.push('today');
        state.push('сегодня');
      }
      if (item.isSelected) {
        classes.push('selected');
        state.push('выбрана');
      }
      if (item.hasEntries) {
        classes.push('has-entries');
        state.push('есть записи');
      }
      const ariaLabel = `${item.day} ${item.monthYearLabel}${state.length ? `, ${state.join(', ')}` : ''}`;
      return `<button type="button" class="${classes.join(' ')}" data-calendar-day="${escapeHtml(item.key)}" aria-label="${escapeHtml(ariaLabel)}" aria-pressed="${item.isSelected}"><span class="calendar-number">${item.day}</span><span class="calendar-dot" aria-hidden="true"></span></button>`;
    }).join('');
    const months = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
    const monthOptions = months.map((name, index) => `<option value="${index}">${name}</option>`).join('');
    return `<div class="calendar-weekdays">${['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'].map((day) => `<span class="calendar-weekday">${day}</span>`).join('')}</div><div class="calendar-days">${blanks}${dayMarkup}</div><div class="calendar-legend"><div class="calendar-legend-info"><span class="calendar-legend-dot"></span><span>В этот день есть записи</span></div><button type="button" class="calendar-jump-toggle" id="calendar-jump-toggle" aria-expanded="false" aria-controls="calendar-jump-menu">Перейти к дате</button></div><div class="calendar-jump-menu" id="calendar-jump-menu" hidden><div class="calendar-jump-fields"><div class="calendar-jump-field"><label for="calendar-jump-year">Год</label><input id="calendar-jump-year" type="number" min="1900" max="9999" step="1" inputmode="numeric"></div><div class="calendar-jump-field"><label for="calendar-jump-month">Месяц</label><select id="calendar-jump-month">${monthOptions}</select></div><div class="calendar-jump-field"><label for="calendar-jump-day">Число</label><select id="calendar-jump-day"></select></div></div><div class="calendar-jump-actions"><button type="button" class="calendar-jump-go" id="calendar-jump-go">Перейти</button></div></div>`;
  };

  ui.renderQuickAddMenuModal = function renderQuickAddMenuModal() {
    return {
      title: 'Быстрая запись',
      body: '<div class="mass-entry-stack"><div class="mass-entry-intro">Выбери обычное добавление еды или заполни дневник сразу за несколько дней.</div><div class="mass-entry-choice-list"><button type="button" class="mass-entry-choice" id="quick-add-single"><span class="mass-entry-choice-icon">＋</span><span class="mass-entry-choice-copy"><strong>Обычная запись</strong><small>Добавить продукт или рецепт в один приём пищи</small></span><b aria-hidden="true">›</b></button><button type="button" class="mass-entry-choice" id="quick-add-mass"><span class="mass-entry-choice-icon">▦</span><span class="mass-entry-choice-copy"><strong>Массовая запись</strong><small>Заполнить один или несколько дней за один раз</small></span><b aria-hidden="true">›</b></button></div></div>',
      actions: '<button class="btn" id="quick-add-menu-close">Отмена</button>'
    };
  };

  ui.renderMassDatePickerModal = function renderMassDatePickerModal({ mode }) {
    return {
      title: 'Выбор дат',
      body: `<div class="mass-entry-stack"><div class="mass-entry-intro">Выбери период целиком или отметь отдельные дни. Будущие даты недоступны.</div><div class="mass-entry-toggle"><button type="button" data-mass-mode="range" class="${mode === 'range' ? 'active' : ''}">Период</button><button type="button" data-mass-mode="days" class="${mode === 'days' ? 'active' : ''}">Отдельные дни</button></div><div class="mass-entry-calendar"><div class="mass-entry-calendar-head"><button type="button" id="mass-calendar-prev" aria-label="Предыдущий месяц">‹</button><strong id="mass-calendar-title"></strong><button type="button" id="mass-calendar-next" aria-label="Следующий месяц">›</button></div><div class="mass-entry-calendar-grid" id="mass-calendar-grid"></div></div><div class="mass-entry-summary" id="mass-date-summary"></div></div>`,
      actions: '<button type="button" class="btn" id="mass-date-cancel">Отмена</button><button type="button" class="btn-primary" id="mass-date-continue" disabled>Далее</button>'
    };
  };

  ui.renderMassSourceModal = function renderMassSourceModal({ count }) {
    return {
      title: 'Способ заполнения',
      body: `<div class="mass-entry-stack"><div class="mass-entry-summary"><span>Выбранный период</span><strong>${count} ${count === 1 ? 'день' : count < 5 ? 'дня' : 'дней'}</strong></div><div class="mass-entry-intro">Как заполнить питание на каждый выбранный день?</div><div class="mass-entry-choice-list"><button type="button" class="mass-entry-choice" data-mass-source="calories"><span class="mass-entry-choice-icon">♨</span><span class="mass-entry-choice-copy"><strong>Только калории</strong><small>Ввести общую калорийность периода или значение за один день</small></span><b aria-hidden="true">›</b></button><button type="button" class="mass-entry-choice" data-mass-source="library"><span class="mass-entry-choice-icon">▤</span><span class="mass-entry-choice-copy"><strong>Из библиотеки питания</strong><small>Рецепты, продукты, избранное, подборки и другие доступные позиции</small></span><b aria-hidden="true">›</b></button><button type="button" class="mass-entry-choice" data-mass-source="set"><span class="mass-entry-choice-icon">▦</span><span class="mass-entry-choice-copy"><strong>Питание по набору</strong><small>Выбрать набор из раздела «Планирование»</small></span><b aria-hidden="true">›</b></button></div></div>`,
      actions: '<button type="button" class="btn" id="mass-source-back">Назад</button><button type="button" class="btn" id="mass-source-cancel">Отмена</button>'
    };
  };

  ui.renderMassCaloriesModal = function renderMassCaloriesModal({
    mode,
    value,
    dateCount,
    escapeHtml
  }) {
    return {
      title: 'Только калории',
      body: `<div class="mass-entry-stack"><div class="mass-entry-intro">Калории будут записаны как дневной итог. Распределять их по завтраку, обеду и ужину приложение не будет, поскольку состав питания неизвестен.</div><div class="mass-entry-toggle"><button type="button" data-mass-calorie-mode="daily" class="${mode === 'daily' ? 'active' : ''}">На день</button><button type="button" data-mass-calorie-mode="period" class="${mode === 'period' ? 'active' : ''}">За весь период</button></div><div class="mass-entry-field"><label for="mass-calorie-value">${mode === 'daily' ? 'Ккал в день' : 'Всего ккал за выбранный период'}</label><input id="mass-calorie-value" type="number" min="1" max="1000000" step="1" inputmode="numeric" value="${escapeHtml(value)}" placeholder="Например, 2000"></div><div class="mass-entry-warning">${mode === 'daily' ? `Значение будет записано на каждый из ${dateCount} выбранных дней.` : `Общее значение будет равномерно разделено на ${dateCount} выбранных дней.`} Белки, жиры, углеводы и микронутриенты останутся неизвестными, а не нулевыми.</div></div>`,
      actions: '<button type="button" class="btn" id="mass-calorie-back">Назад</button><button type="button" class="btn-primary" id="mass-calorie-preview">Предпросмотр</button>'
    };
  };

  ui.renderMassSetModal = function renderMassSetModal({ rows, hasAny }) {
    return {
      title: 'Выбор набора',
      body: `<div class="mass-entry-stack"><div class="mass-entry-intro">Выбери набор, созданный в разделе «Планирование». Его суточные показатели будут записаны на каждый выбранный день.</div><div class="mass-entry-choice-list">${rows || ''}</div>${hasAny ? '' : '<div class="mass-entry-empty">Пока нет наборов с рецептами, по которым можно рассчитать дневную пищевую ценность.</div>'}</div>`,
      actions: '<button type="button" class="btn" id="mass-set-back">Назад</button><button type="button" class="btn-primary" id="mass-set-preview" disabled>Предпросмотр</button>'
    };
  };

  ui.renderMassEntryPreviewModal = function renderMassEntryPreviewModal({
    periodLabel,
    dateCount,
    sourceTitle,
    content,
    conflictOptionsMarkup,
    collision,
    toWrite,
    skippedCount,
    escapeHtml
  }) {
    const summary = collision === 'skip'
      ? 'Будет пропущено заполненных дней'
      : collision === 'replace' ? 'Питание будет заменено за дни' : 'Будут добавлены новые записи';
    const summaryCount = collision === 'skip' ? skippedCount : toWrite;
    const applyLabel = collision === 'replace' ? 'Заменить питание' : `Записать на ${toWrite} дн.`;
    return {
      title: 'Предпросмотр массовой записи',
      body: `<div class="mass-entry-stack"><div class="mass-entry-summary"><span>${periodLabel}</span><strong>${dateCount} дн.</strong></div><div class="mass-entry-preview"><div class="mass-entry-preview-row"><span>Способ</span><strong>${escapeHtml(sourceTitle)}</strong></div>${content}</div><div class="mass-entry-field"><label for="mass-collision-mode">Если в выбранный день уже есть записи</label><select id="mass-collision-mode">${conflictOptionsMarkup}</select></div><div class="mass-entry-summary"><span>${summary}</span><strong>${summaryCount} дн.</strong></div></div>`,
      actions: `<button type="button" class="btn" id="mass-preview-back">Назад</button><button type="button" class="btn-primary" id="mass-entry-apply" ${toWrite ? '' : 'disabled'}>${applyLabel}</button>`
    };
  };

  ui.renderDiaryEntryEditModal = function renderDiaryEntryEditModal({
    contextDate,
    name,
    mealOptionsMarkup,
    supportsPortions,
    quantityMode,
    initialQuantity,
    quantityHelp,
    quantityUnit,
    escapeHtml
  }) {
    const safeName = escapeHtml(String(name || 'Запись'));
    return {
      title: 'Редактировать запись',
      body: `
  <div class="diary-entry-edit-context"><span>${contextDate}</span><strong>${safeName}</strong></div>
  <div class="diary-entry-edit-fields">
   <section class="diary-entry-edit-field">
    <div class="diary-entry-edit-heading"><span class="diary-entry-edit-icon" aria-hidden="true">↔</span><div class="diary-entry-edit-copy"><label for="entry-meal">Замена приёма пищи</label><small>Измени, к какому приёму пищи относится эта запись.</small></div></div>
    <select id="entry-meal" class="diary-entry-edit-select">${mealOptionsMarkup}</select>
   </section>
   <section class="diary-entry-edit-field">
    <div class="diary-entry-edit-heading"><span class="diary-entry-edit-icon" aria-hidden="true">⚖</span><div class="diary-entry-edit-copy"><label for="entry-quantity">Количество</label><small>Укажи количество для этой записи.</small></div></div>
    <div class="diary-entry-edit-quantity-row">
     <div class="entry-unit-switch" id="entry-quantity-switch" ${supportsPortions ? '' : 'hidden'}><button type="button" data-entry-unit="grams" class="${quantityMode === 'grams' ? 'active' : ''}">Граммы</button><button type="button" data-entry-unit="portions" class="${quantityMode === 'portions' ? 'active' : ''}">Порции</button></div>
     <label class="diary-entry-edit-amount-wrap"><input class="diary-entry-edit-amount" id="entry-quantity" type="number" value="${Number(initialQuantity.toFixed(2))}" min="0.1" max="30000" step="${quantityMode === 'portions' ? '0.1' : '1'}" inputmode="decimal"><span class="diary-entry-edit-unit" id="entry-quantity-unit">${quantityMode === 'portions' ? 'порц.' : quantityUnit}</span></label>
    </div>
    <small class="diary-entry-edit-quantity-help" id="entry-quantity-help">${quantityHelp || ''}</small>
   </section>
  </div>`,
      actions: '<button class="btn" id="cancel-modal">Отмена</button><button class="btn-primary" id="save-entry">Сохранить</button>'
    };
  };

  ui.renderDiaryEntryAddModal = function renderDiaryEntryAddModal({
    dateText,
    optionsMarkup,
    catalogCount,
    mealOptionsMarkup,
    quantityMode,
    initialQuantity,
    showPortionSwitch
  }) {
    return {
      title: 'Добавить запись',
      body: `<div class="field full"><label for="entry-date">Дата записи</label><input id="entry-date" type="text" value="${dateText}" readonly></div><div class="field full"><label for="entry-search">Поиск продукта или блюда</label><input id="entry-search" type="search" placeholder="Начни вводить название…" autocomplete="off"></div><div class="field full"><label for="entry-item">Продукт или блюдо</label><select id="entry-item">${optionsMarkup}</select><div class="field-help" id="entry-search-status">${catalogCount} позиций в каталоге</div></div><div class="form-grid"><div class="field"><label for="entry-meal">Приём пищи</label><select id="entry-meal">${mealOptionsMarkup}</select></div><div class="field"><label>Количество</label><div class="entry-unit-switch" id="entry-quantity-switch" ${showPortionSwitch ? '' : 'hidden'}><button type="button" data-entry-unit="grams" class="${quantityMode === 'grams' ? 'active' : ''}">Граммы</button><button type="button" data-entry-unit="portions" class="${quantityMode === 'portions' ? 'active' : ''}">Порции</button></div><div class="entry-quantity-input"><input id="entry-quantity" type="number" value="${initialQuantity}" min="0.1" max="30000" step="${quantityMode === 'portions' ? '0.1' : '1'}"><span id="entry-quantity-unit">${quantityMode === 'portions' ? 'порций' : 'г'}</span></div><div class="entry-quantity-help" id="entry-quantity-help"></div></div></div><div class="muted-box" style="margin-top:12px" id="entry-preview">КБЖУ будет рассчитано по выбранному продукту и количеству.</div>`,
      actions: '<button class="btn" id="cancel-modal">Отмена</button><button class="btn-primary" id="save-entry">Добавить</button>'
    };
  };

  ui.renderMealDraftMarkup = function renderMealDraftMarkup({
    draftItems,
    standardMeals,
    isLibrarySource,
    replaceEntry,
    fmt,
    nutritionNumber,
    escapeHtml
  }) {
    if (!draftItems.length) return '';
    const rows = draftItems.map((item, index) => {
      const grams = Number(item.grams) || 0;
      const hasPortion = item.kind === 'recipe' && Number(item.portionGrams) > 0;
      const mode = item.quantityMode || 'grams';
      const value = mode === 'portions'
        ? Number(item.quantityValue) || grams / (Number(item.portionGrams) || 1)
        : grams;
      const quantityUnit = mode === 'portions' ? 'порц.' : item.quantityUnit === 'мл' ? 'мл' : 'г';
      const mealOptions = isLibrarySource
        ? `<select class="mass-entry-item-meal" data-draft-meal="${index}" aria-label="Приём пищи: ${escapeHtml(item.name)}">${[...standardMeals, 'Перекус'].map((meal) => `<option value="${escapeHtml(meal)}" ${meal === (item.meal || standardMeals[0]) ? 'selected' : ''}>${escapeHtml(meal)}</option>`).join('')}</select>`
        : '';
      const portionControls = hasPortion
        ? `<div class="entry-unit-switch meal-draft-unit-switch"><button type="button" data-draft-unit="grams" data-draft-index="${index}" class="${mode === 'grams' ? 'active' : ''}">г</button><button type="button" data-draft-unit="portions" data-draft-index="${index}" class="${mode === 'portions' ? 'active' : ''}">порции</button></div>`
        : '';
      const portionNote = hasPortion
        ? `<small class="meal-draft-quantity-note">1 порция = ${nutritionNumber(item.portionGrams)} г · всего ${fmt(grams)} г</small>`
        : '';
      return `<div class="meal-draft-row" data-draft-row="${index}"><div class="meal-draft-info"><strong>${escapeHtml(item.name)}</strong><small>${fmt(item.kcal * grams / 100)} ккал · Б ${(item.p * grams / 100).toFixed(1)} · Ж ${(item.f * grams / 100).toFixed(1)} · У ${(item.c * grams / 100).toFixed(1)}</small></div><div class="meal-draft-quantity">${mealOptions}${portionControls}<label class="meal-draft-grams"><input type="number" min="0.1" max="30000" step="${mode === 'portions' ? '0.1' : '1'}" value="${replaceEntry && !value ? '' : Number(value.toFixed(2))}" data-draft-quantity="${index}" aria-label="Количество: ${escapeHtml(item.name)}"><span>${quantityUnit}</span></label>${portionNote}</div><button type="button" class="meal-draft-remove" data-remove-draft="${index}" aria-label="Убрать ${escapeHtml(item.name)}">×</button></div>`;
    }).join('');
    return `<div class="meal-draft-block"><div class="meal-draft-heading"><strong>${replaceEntry ? 'Новое блюдо' : 'Добавлено'}</strong><span>${draftItems.length} поз.</span></div><div class="meal-draft-list">${rows}</div></div>`;
  };

  ui.renderMealAddPlateModal = function renderMealAddPlateModal({
    meal,
    dateLabel,
    replaceEntry,
    replaceName,
    isLibrarySource,
    libraryDateCount,
    draftMarkup,
    hasDraft,
    escapeHtml
  }) {
    const context = replaceEntry
      ? `Замена «${escapeHtml(replaceName)}» · ${escapeHtml(dateLabel)}`
      : `${escapeHtml(meal)} · ${escapeHtml(dateLabel)}`;
    const contextMarkup = isLibrarySource
      ? `Один дневной рацион · повторится на ${libraryDateCount} выбранных датах`
      : context;
    const primaryLabel = replaceEntry
      ? 'Заменить запись'
      : isLibrarySource
        ? 'Предпросмотр массовой записи'
        : `Добавить в ${escapeHtml(meal)}`;
    return {
      title: replaceEntry
        ? 'Заменить еду'
        : isLibrarySource
          ? 'Массовое питание · один день'
          : 'Добавить еду',
      body: `<div class="food-picker-context">${contextMarkup}</div><div class="food-picker-search"><span aria-hidden="true">⌕</span><input id="meal-food-search" type="search" placeholder="Поиск продуктов" autocomplete="off" aria-label="Поиск продуктов"></div><div class="food-picker-results" id="meal-food-results" aria-live="polite"></div><button type="button" class="btn meal-open-catalog" id="open-meal-recipe-catalog">Открыть рецепты <span aria-hidden="true">›</span></button><div id="meal-draft-container">${draftMarkup}</div>`,
      actions: `<button type="button" class="btn" id="meal-picker-cancel">Отмена</button><button type="button" class="btn-primary" id="meal-picker-save" ${hasDraft ? '' : 'disabled'}>${primaryLabel}</button>`
    };
  };

  ui.renderMealProductSearchResults = function renderMealProductSearchResults({
    products,
    chosenKeys,
    fmt,
    escapeHtml
  }) {
    if (!products.length) return '<div class="empty">Ничего не найдено</div>';
    return products.map((item) => {
      const key = `p-${item.id}`;
      const chosen = chosenKeys.includes(key);
      const name = escapeHtml(item.name);
      return `<div class="food-picker-row"><div class="food-picker-info"><strong>${name}</strong><small>${fmt(item.kcal)} ккал · Б ${escapeHtml(item.p)} · Ж ${escapeHtml(item.f)} · У ${escapeHtml(item.c)} на 100 ${escapeHtml(item.basisUnit || 'г')}</small></div><button type="button" class="food-picker-plus ${chosen ? 'selected' : ''}" data-add-product="${escapeHtml(item.id)}" ${chosen ? 'disabled' : ''} aria-label="${chosen ? 'Уже добавлено' : `Добавить ${name}`}">${chosen ? '✓' : '＋'}</button></div>`;
    }).join('');
  };

  ui.renderWaterEntryModal = function renderWaterEntryModal({ dateLabel }) {
    return {
      title: 'Добавить воду',
      body: `<div class="food-picker-context">Обычная питьевая вода · ${dateLabel}</div><div class="field"><label for="water-amount">Количество, мл</label><input id="water-amount" type="number" min="1" max="5000" step="1" value="250" inputmode="numeric"></div>`,
      actions: '<button class="btn" id="water-cancel">Отмена</button><button class="btn-primary" id="water-save">Добавить</button>'
    };
  };

  ui.renderQuickMealChooserModal = function renderQuickMealChooserModal({
    dateLabel,
    optionsMarkup
  }) {
    return {
      title: 'Куда добавить?',
      body: `<div class="food-picker-context">Выбери приём пищи для записи за ${dateLabel}</div><div class="recipe-picker-list quick-meal-picker-list">${optionsMarkup}</div>`,
      actions: '<button class="btn" id="quick-meal-cancel">Отмена</button>'
    };
  };

  root.NutriMealUI = ui;
})(globalThis);
