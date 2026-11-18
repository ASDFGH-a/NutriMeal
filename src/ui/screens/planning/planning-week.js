(function registerPlanningWeek(root) {
  const ui = root.NutriMealUI || {};

  ui.renderPlanningWeek = function renderPlanningWeek({
    activeSet,
    selectedWeek,
    dates,
    mainDishes,
    snackDishes,
    recipes,
    recipeSummary,
    escapeHtml,
    locale
  }) {
    if (!activeSet) {
      return '<div class="planner48-library-empty">Пока нечего редактировать. Создай набор в библиотеке — в нём всегда будет четыре недели.</div>';
    }
    const tabs = [1, 2, 3, 4].map((week) =>
      `<button type="button" data-planner-week-select="${week}" class="${week === selectedWeek ? 'active' : ''}" aria-pressed="${week === selectedWeek}"><b>0${week}</b><small>${dates[week - 1]}</small></button>`
    ).join('');
    const dishLabels = ['Первое', 'Второе', 'Третье', 'Четвёртое', 'Пятое', 'Шестое', 'Седьмое', 'Восьмое', 'Девятое', 'Десятое'];
    const renderDishCards = (dishes, snack = false) => dishes.map((dish, index) => {
      const recipe = recipes.find((item) => String(item.id) === String(dish.recipeId));
      const label = snack
        ? `ЗАКУСКА ${index + 1}`
        : `${(dishLabels[index] || `${index + 1}-е`).toLocaleUpperCase(locale)} БЛЮДО`;
      return `<article class="planner48-dish-card ${snack ? 'planner48-snack-card' : ''}"><div class="planner48-dish-icon">${index + 1}</div><div class="planner48-dish-body"><span>${label}</span><strong>${escapeHtml(recipe?.name || 'Рецепт не выбран')}</strong><small>${escapeHtml(recipeSummary(recipe))}</small></div></article>`;
    }).join('');
    const mainFilled = mainDishes.filter((dish) => dish.recipeId).length;
    const snackFilled = snackDishes.filter((dish) => dish.recipeId).length;
    const mainCards = renderDishCards(mainDishes);
    const snackCards = renderDishCards(snackDishes, true);

    return `<div class="planner48-week-tabs" role="group" aria-label="Переключение недель">${tabs}</div>
  <div class="planner48-week-heading"><div><h3>Неделя ${selectedWeek}</h3><span>${dates[selectedWeek - 1]} 2026</span></div><button type="button" class="btn" data-edit-nutrition-week="${selectedWeek - 1}">Изменить блюда ↗</button></div>
  <section class="planner48-dish-section"><div class="planner48-dish-section-head"><h3>Основные блюда</h3><span class="tag">${mainFilled} из ${mainDishes.length} заполнено</span></div>${mainCards ? `<div class="planner48-dish-grid">${mainCards}</div>` : '<div class="planner48-empty-dishes">Пока нет основных блюд. Нажми «Изменить блюда», чтобы добавить позиции.</div>'}</section>
  <section class="planner48-dish-section planner48-snacks-section"><div class="planner48-dish-section-head"><h3>Закуски</h3><span class="tag">${snackFilled} из ${snackDishes.length} заполнено</span></div>${snackCards ? `<div class="planner48-dish-grid">${snackCards}</div>` : '<div class="planner48-empty-dishes">Пока нет закусок. При необходимости добавь их в режиме редактирования.</div>'}</section>`;
  };

  root.NutriMealUI = ui;
})(globalThis);
