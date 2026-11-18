(function registerPlanningModals(root) {
  const ui = root.NutriMealUI || {};

  const dishPositionLabel = (group, index) => {
    if (group === 'snacks') return `Закуска ${index + 1}`;
    const words = ['Первое', 'Второе', 'Третье', 'Четвёртое', 'Пятое', 'Шестое', 'Седьмое', 'Восьмое', 'Девятое', 'Десятое'];
    return `${words[index] || `${index + 1}-е`} блюдо`;
  };

  function renderNutritionSetWeekRows(weekRows, mode) {
    return weekRows.map(({ index, completionCount, skipped = false }) => {
      if (mode === 'create') {
        const status = completionCount
          ? `${completionCount} ${completionCount === 1 ? 'блюдо' : 'блюд'} добавлено`
          : skipped ? 'Пропущена · останется пустой' : 'Пока пустая';
        return `<div class="nutrition-set-week-option"><div class="nutrition-set-week-copy"><strong>Неделя ${index + 1}</strong><span>${status}</span></div><div class="nutrition-set-week-actions"><button type="button" class="btn" data-create-set-week-open="${index}">＋ Добавить</button>${completionCount ? '' : `<button type="button" class="btn-quiet" data-create-set-week-skip="${index}">${skipped ? 'Вернуть' : 'Пропустить'}</button>`}</div></div>`;
      }
      const status = completionCount
        ? `${completionCount} ${completionCount === 1 ? 'блюдо' : 'блюд'} в меню`
        : 'Пока пустая';
      return `<div class="nutrition-set-week-option"><div class="nutrition-set-week-copy"><strong>Неделя ${index + 1}</strong><span>${status}</span></div><div class="nutrition-set-week-actions"><button type="button" class="btn" data-edit-set-week-open="${index}">Изменить ↗</button></div></div>`;
    }).join('');
  }

  ui.renderCreateNutritionSetModal = function renderCreateNutritionSetModal() {
    return {
      title: 'Создать набор · Название',
      body: '<div class="nutrition-set-wizard"><div class="nutrition-set-wizard-step"><span>ШАГ 1 ИЗ 2</span><b>Назови набор</b><small>Добавь пояснение, чтобы позже помнить назначение этого набора.</small></div><div class="field"><label for="nutrition-set-name">Название набора</label><input id="nutrition-set-name" maxlength="48" placeholder="Например, Набор D"></div><div class="field"><label for="nutrition-set-comment">Комментарий к набору</label><textarea id="nutrition-set-comment" rows="3" maxlength="300" placeholder="Например, меню на период набора массы или рацион на рабочие смены"></textarea></div></div>',
      actions: '<button class="btn" id="nutrition-set-cancel">Отмена</button><button class="btn-primary" id="nutrition-set-next">Далее ↗</button>'
    };
  };

  ui.renderCreateNutritionSetWeeksModal = function renderCreateNutritionSetWeeksModal({
    name,
    weekRows,
    escapeHtml
  }) {
    const hasAnyContent = weekRows.some((week) => week.completionCount > 0);
    const weeksMarkup = renderNutritionSetWeekRows(weekRows, 'create');
    return {
      title: `Новый набор · ${escapeHtml(name)}`,
      body: `<div class="nutrition-set-wizard"><div class="nutrition-set-wizard-step"><span>ШАГ 2 ИЗ 3</span><b>Наполни недели</b><small>Добавь блюда в нужные недели. Любую неделю можно оставить пустой и заполнить позже.</small></div><div class="nutrition-set-week-list">${weeksMarkup}</div><div class="nutrition-set-wizard-note">${hasAnyContent ? 'После наполнения проверь ориентиры питания для каждой недели.' : 'Можно пропустить все недели — дальше всё равно можно посмотреть ориентиры и создать пустой набор.'}</div></div>`,
      actions: `<button class="btn" id="nutrition-set-wizard-cancel">Отмена</button>${hasAnyContent ? '' : '<button class="btn-quiet" id="nutrition-set-create-empty">Пропустить всё</button>'}<button class="btn-primary" id="nutrition-set-to-orientations">Далее · Ориентиры ↗</button>`
    };
  };

  ui.renderEditNutritionSetWeeksModal = function renderEditNutritionSetWeeksModal({
    draft,
    weekRows,
    escapeHtml
  }) {
    const weeksMarkup = renderNutritionSetWeekRows(weekRows, 'edit');
    return {
      title: `Редактировать набор · ${escapeHtml(draft.name)}`,
      body: `<div class="nutrition-set-wizard"><div class="nutrition-set-wizard-step"><span>ШАГ 1 ИЗ 2</span><b>Редактирование набора</b><small>Измени название, пояснение или состав недель. После этого проверь ориентиры всего набора.</small></div><div class="field"><label for="nutrition-set-edit-name">Название набора</label><input id="nutrition-set-edit-name" maxlength="48" value="${escapeHtml(draft.name)}"></div><div class="field"><label for="nutrition-set-edit-comment">Комментарий к набору</label><textarea id="nutrition-set-edit-comment" rows="3" maxlength="300" placeholder="Для чего нужен этот набор?">${escapeHtml(draft.comment || '')}</textarea></div><div class="nutrition-set-week-list">${weeksMarkup}</div><div class="nutrition-set-wizard-note">Изменения пока хранятся как черновик. Они сохранятся после проверки ориентиров.</div></div>`,
      actions: '<button class="btn" id="nutrition-set-edit-cancel">Отмена</button><button class="btn-primary" id="nutrition-set-edit-next">Далее · Ориентиры ↗</button>'
    };
  };

  ui.renderNutritionWeekEditModal = function renderNutritionWeekEditModal({
    setName,
    index,
    mainDishes,
    snackDishes,
    recipes,
    escapeHtml
  }) {
    const renderGroup = (group, title) => {
      const dishes = group === 'snacks' ? snackDishes : mainDishes;
      const rows = dishes.map((dish, dishIndex) => {
        const recipe = recipes.find((item) => String(item.id) === String(dish.recipeId));
        const position = dishPositionLabel(group, dishIndex);
        return `<div class="planner-week-edit-row"><button type="button" class="planner-week-edit-pick" data-week-dish-pick data-week-dish-group="${group}" data-week-dish-id="${escapeHtml(dish.id)}"><span class="planner-week-edit-number">${group === 'snacks' ? 'З' : dishIndex + 1}</span><span class="planner-week-edit-copy"><small>${escapeHtml(position)}</small><strong>${escapeHtml(recipe?.name || 'Выбрать рецепт')}</strong></span><span class="planner-week-edit-action">${recipe ? 'Изменить' : '＋ Выбрать'} ↗</span></button><button type="button" class="planner-week-edit-remove" data-week-dish-remove data-week-dish-group="${group}" data-week-dish-id="${escapeHtml(dish.id)}" aria-label="Удалить позицию ${escapeHtml(position)}">×</button></div>`;
      }).join('');
      return `<section class="planner-week-edit-group"><div class="planner-week-edit-group-head"><div><strong>${title}</strong><span>${dishes.length} позиций</span></div><button type="button" class="btn" data-week-dish-add="${group}">＋ ${group === 'snacks' ? 'Добавить закуску' : 'Добавить блюдо'}</button></div>${rows || `<div class="planner-week-edit-empty">Пока нет ${group === 'snacks' ? 'закусок' : 'основных блюд'}.</div>`}</section>`;
    };
    return {
      title: `Неделя ${index + 1} · ${escapeHtml(setName)}`,
      body: `<div class="planner-week-editor"><p class="planner-week-edit-intro">Нажми на позицию, чтобы выбрать для неё рецепт из библиотеки. Количество позиций можно менять отдельно в каждой группе.</p>${renderGroup('mainDishes', 'Основные блюда')}${renderGroup('snacks', 'Закуски')}</div>`,
      actions: '<button class="btn" id="week-edit-cancel">Отмена</button><button class="btn-primary" id="week-edit-save">Сохранить</button>'
    };
  };

  ui.renderNutritionSetOrientationsModal = function renderNutritionSetOrientationsModal({
    mode,
    setName,
    weekIndex,
    weekCount,
    tabsMarkup,
    categoriesMarkup,
    escapeHtml
  }) {
    const isEdit = mode === 'edit';
    const weekNumber = weekIndex + 1;
    const title = `Ориентиры · ${escapeHtml(setName)}`;
    const finishLabel = isEdit ? 'Сохранить изменения' : 'Готово · Создать набор';
    return {
      title,
      body: `<div class="nutrition-set-wizard nutrition-review-wizard"><div class="nutrition-set-wizard-step"><span>ШАГ ${isEdit ? '2 ИЗ 2' : '3 ИЗ 3'}</span><b>Проверь ориентиры питания</b><small>Посмотри, сколько блюд каждой недели содержат овощи, фрукты, зерновые и другие группы. При нехватке нажми плюс — после выбора рецептов вернёшься сюда, а показатели обновятся.</small></div><div class="nutrition-review-week-tabs" role="group" aria-label="Неделя для проверки">${tabsMarkup}</div><div class="nutrition-review-current"><div><strong>Неделя ${weekNumber}</strong><span>Ориентиры рассчитываются по рецептам и их ингредиентам в этой неделе.</span></div><span class="tag active">${weekCount} блюд</span></div><div class="planner48-category-legend"><span>КАТЕГОРИЯ И ЦЕЛЬ</span><span>БЛЮДА В МЕНЮ</span><span>РАЗНООБРАЗИЕ</span></div><div class="planner48-category-list nutrition-review-category-list">${categoriesMarkup}</div><div style="display:flex;justify-content:flex-end;margin-top:12px"><button type="button" class="btn" id="weekly-goals-open">Настроить ориентиры этого набора</button></div><div class="nutrition-set-wizard-note">Можно завершить создание или сохранение и с недостающими категориями. Ориентиры помогают оценить меню, но не блокируют дальнейшую работу.</div></div>`,
      actions: `<button type="button" class="btn" id="nutrition-review-back">← К неделям</button><button type="button" class="btn-primary" id="nutrition-review-finish">${finishLabel}</button>`
    };
  };

  ui.renderWeeklyGoalsModal = function renderWeeklyGoalsModal({
    completenessRows,
    diversityRows
  }) {
    return {
      title: 'Мои ориентиры питания',
      body: `<div class="field-help" style="margin-bottom:12px">Личные цели применяются ко всем неделям выбранного набора и показываются отдельно от справочных ориентиров. Если цель полноты не задана, используется справочный минимум; если не задана цель разнообразия, отображается только фактическое количество продуктов.</div><h3 class="subsection-title">Полнота</h3><div class="weekly-goal-edit-list">${completenessRows}</div><h3 class="subsection-title" style="margin-top:18px">Разнообразие</h3><div class="weekly-goal-edit-list">${diversityRows}</div>`,
      actions: '<button class="btn" id="weekly-goals-cancel">Отмена</button><button class="btn-primary" id="weekly-goals-save">Сохранить ориентиры</button>'
    };
  };

  ui.renderPlanPresetSaveModal = function renderPlanPresetSaveModal() {
    return {
      title: 'Сохранить план как пресет',
      body: '<div class="field"><label for="plan-preset-name">Название пресета</label><input id="plan-preset-name" type="text" maxlength="48" placeholder="Например, Поддержание веса"></div><div class="field-help">Сохраняются цель, целевой вес, настройки КБЖУ и личные недельные ориентиры.</div>',
      actions: '<button class="btn" id="plan-preset-cancel">Отмена</button><button class="btn-primary" id="plan-preset-save">Сохранить</button>'
    };
  };

  ui.renderPlanPresetEditModal = function renderPlanPresetEditModal({
    name,
    escapeHtml
  }) {
    return {
      title: 'Переименовать пресет',
      body: `<div class="field"><label for="plan-preset-rename">Название</label><input id="plan-preset-rename" type="text" maxlength="48" value="${escapeHtml(name)}"></div>`,
      actions: '<button class="btn" id="preset-rename-cancel">Отмена</button><button class="btn-primary" id="preset-rename-save">Сохранить</button>'
    };
  };

  ui.renderPlanPresetsModal = function renderPlanPresetsModal({
    presets,
    fmt,
    escapeHtml
  }) {
    const list = presets.length
      ? `<div class="plan-preset-list">${presets.map((item) => `<div class="plan-preset-row"><div><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.plan.goal)} · цель ${fmt(item.plan.targetWeight)} кг</small></div><div class="plan-preset-actions"><button class="btn" data-preset-apply="${item.id}">Применить</button><button class="btn-quiet" data-preset-edit="${item.id}" title="Переименовать">✎</button><button class="btn-quiet danger" data-preset-delete="${item.id}" title="Удалить">×</button></div></div>`).join('')}</div>`
      : '<div class="empty-state">Сохранённых пресетов пока нет.</div>';
    return {
      title: 'Сохранённые пресеты',
      body: list,
      actions: '<button class="btn" id="plan-presets-close">Закрыть</button>'
    };
  };

  ui.renderDeleteNutritionSetModal = function renderDeleteNutritionSetModal({
    name,
    escapeHtml
  }) {
    return {
      title: 'Удалить набор?',
      body: `<div class="nutrition-set-delete-confirm"><strong>${escapeHtml(name)}</strong><p>Набор и все четыре недели будут удалены из библиотеки. Это действие нельзя отменить.</p></div>`,
      actions: '<button class="btn" id="nutrition-set-delete-cancel">Отмена</button><button class="btn-danger" id="nutrition-set-delete-confirm">Удалить набор</button>'
    };
  };

  ui.renderPlannerCategoryPlacementModal = function renderPlannerCategoryPlacementModal({
    categoryLabel,
    chosenItems,
    selectedWeek,
    escapeHtml
  }) {
    const selectedNames = chosenItems
      .map((item) => `<span class="planner-category-picked-chip">${escapeHtml(item.name)}</span>`)
      .join('');
    const weekOptions = [1, 2, 3, 4]
      .map((week) => `<option value="${week}" ${week === selectedWeek ? 'selected' : ''}>Неделя ${week}</option>`)
      .join('');
    const recipeLabel = chosenItems.length === 1
      ? 'рецепт будет добавлен'
      : chosenItems.length >= 2 && chosenItems.length <= 4
        ? 'рецепта будут добавлены'
        : 'рецептов будут добавлены';
    return {
      title: 'Куда добавить рецепты?',
      body: `<div class="planner-category-placement"><div class="planner-category-placement-context"><span>Категория</span><strong>${escapeHtml(categoryLabel)}</strong></div><div class="field"><label for="planner-category-target-week">В какую неделю добавить?</label><select id="planner-category-target-week">${weekOptions}</select></div><div class="planner-category-placement-group"><div class="field-label">В какую группу добавить?</div><div class="planner-category-placement-options"><button type="button" class="planner-category-place-option is-selected" data-planner-place-group="mainDishes"><strong>Основные блюда</strong><span>Добавить в конец списка</span></button><button type="button" class="planner-category-place-option" data-planner-place-group="snacks"><strong>Закуски</strong><span>Добавить в конец списка</span></button></div></div><div class="planner-category-picked-list"><div class="field-label">Выбранные рецепты · ${chosenItems.length}</div><div>${selectedNames}</div></div><p class="field-help">${chosenItems.length} ${recipeLabel} последовательно в выбранную группу.</p></div>`,
      actions: '<button type="button" class="btn" id="planner-category-place-cancel">Отмена</button><button type="button" class="btn-primary" id="planner-category-place-confirm">Добавить</button>'
    };
  };

  ui.renderPlanSetupModal = function renderPlanSetupModal({
    targetWeight,
    adjustment,
    proteinPerKg,
    fatPercent,
    calculationPreview,
    locale
  }) {
    const proteinOptions = [0.8, 1, 1.2, 1.4, 1.6, 1.8, 2].map((value) => (
      `<option value="${value}" ${Number(proteinPerKg) === value ? 'selected' : ''}>${value.toLocaleString(locale)} г/кг</option>`
    )).join('');
    const fatOptions = [20, 25, 30, 35].map((value) => (
      `<option value="${value}" ${Number(fatPercent) === value ? 'selected' : ''}>${value}%</option>`
    )).join('');
    return {
      title: 'Настройки плана',
      body: `<div class="form-grid">
  <div class="field full"><label for="setup-goal">Цель</label><select id="setup-goal"><option value="Поддержание веса">Поддержание веса</option><option value="Снижение веса">Снижение веса</option><option value="Набор веса">Набор веса</option></select></div>
  <div class="field full"><label for="setup-target">Целевой вес, кг</label><input id="setup-target" type="number" min="1" max="500" step="0.1" value="${targetWeight}"></div>
  <div class="field"><label for="setup-adjustment">Коррекция относительно TDEE, ккал</label><input id="setup-adjustment" type="number" min="-1500" max="1500" step="50" value="${adjustment}"></div>
  <div class="field"><label for="setup-protein-rate">Белок, г на кг веса</label><select id="setup-protein-rate"><option value="auto" ${proteinPerKg === null ? 'selected' : ''}>Автоматически по активности тренировок</option>${proteinOptions}</select></div>
  <div class="field"><label for="setup-fat-share">Доля энергии из жиров</label><select id="setup-fat-share">${fatOptions}</select></div>
 </div>
 <div class="planning-settings-preview" id="setup-calc-preview">${calculationPreview}</div>
 <div class="field-help" style="margin-top:10px">Стартовая коррекция: поддержание — 0 ккал, снижение — −400 ккал, набор — +300 ккал. Значение можно настроить вручную. Белок при регулярных тренировках автоматически рассчитывается по ориентиру 1,6 г/кг, без регулярных тренировок — 0,8 г/кг. Жиры по умолчанию составляют 30% энергии, углеводы заполняют оставшуюся калорийность.</div>`,
      actions: '<button class="btn" id="cancel-setup">Отмена</button><button class="btn-primary" id="save-setup">Сохранить план</button>'
    };
  };

  root.NutriMealUI = ui;
})(globalThis);
