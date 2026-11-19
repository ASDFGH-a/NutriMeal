(function registerNutritionSetLibrary(root) {
  const ui = root.NutriMealUI || {};

  ui.renderNutritionSetCard = function renderNutritionSetCard({
    set,
    index,
    selected,
    dishCount,
    groupCount,
    averageKcal,
    averageCoverage,
    productCount,
    hasWarnings,
    totals,
    escapeHtml,
    fmt
  }) {
    const dishLabel = dishCount === 1 ? 'блюдо' : dishCount >= 2 && dishCount <= 4 ? 'блюда' : 'блюд';
    return `<div class="planner48-set-wrap">
   <button type="button" class="planner48-set-card ${selected ? 'is-selected' : ''}" data-nutrition-set-select="${escapeHtml(set.id)}" aria-pressed="${selected}">
    <div class="planner48-set-top"><span class="planner48-set-code">${String.fromCharCode(65 + index)}</span>${selected ? '<span class="tag active">Выбран</span>' : '<span class="planner48-set-open">Открыть набор ↗</span>'}</div>
    <strong class="planner48-set-name">${escapeHtml(set.name)}</strong><span class="planner48-set-note">4 недели · ${dishCount} ${dishLabel}${hasWarnings ? ' · есть неполные составы' : ''}</span>
    ${set.comment ? `<div class="planner48-set-comment"><span class="planner48-set-comment-label">Комментарий</span><span class="planner48-set-comment-text">${escapeHtml(set.comment)}</span></div>` : ''}
    <div class="planner48-set-kcal"><b>${fmt(totals.kcal || 0)}</b><span>ккал / весь набор</span></div>
    <div class="planner48-set-average">${dishCount ? `В среднем ${fmt(averageKcal)} ккал в день` : 'Нет записей для расчёта среднего'}</div>
    <div class="planner48-set-stats"><span><b>${averageCoverage === null ? '—' : `${averageCoverage}%`}</b><small>RDA / AI</small></span><span><b>${groupCount}/7</b><small>групп продуктов</small></span><span><b>${productCount}</b><small>продуктов</small></span><span><b>${dishCount}</b><small>блюд</small></span></div>
    <div class="planner48-set-macros"><span>Б ${fmt(Math.round(totals.p || 0))} г</span><span>Ж ${fmt(Math.round(totals.f || 0))} г</span><span>У ${fmt(Math.round(totals.c || 0))} г</span></div>
   </button>
   <button type="button" class="planner48-set-edit" data-nutrition-set-edit="${escapeHtml(set.id)}" aria-label="Редактировать набор ${escapeHtml(set.name)}" title="Редактировать набор">Редактировать</button>
   <button type="button" class="planner48-set-delete" data-nutrition-set-delete="${escapeHtml(set.id)}" aria-label="Удалить набор ${escapeHtml(set.name)}" title="Удалить набор">×</button>
  </div>`;
  };

  root.NutriMealUI = ui;
})(globalThis);
