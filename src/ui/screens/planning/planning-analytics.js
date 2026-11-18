(function registerPlanningAnalytics(root) {
  const ui = root.NutriMealUI || {};

  ui.renderPlannerCategoryAndMeals = function renderPlannerCategoryAndMeals({
    activeSet,
    selectedWeek,
    categoryMarkup,
    period,
    periodData,
    targetKcalPeriod,
    rdaText,
    nutrientStats,
    macroMarkup,
    vitaminMarkup,
    mineralMarkup,
    nutritionFootText,
    mealCards,
    escapeHtml
  }) {
    const categories = activeSet
      ? `<div class="planner48-category-legend"><span>КАТЕГОРИЯ И ЦЕЛЬ</span><span>БЛЮДА В МЕНЮ</span><span>РАЗНООБРАЗИЕ</span></div><div class="planner48-category-list">${categoryMarkup}</div>`
      : '<div class="planner48-library-empty">Ориентиры появятся здесь после выбора набора и недели.</div>';
    const kcalPercent = targetKcalPeriod > 0
      ? Math.round((periodData.kcal || 0) / targetKcalPeriod * 100)
      : null;
    const kcalTrack = targetKcalPeriod > 0
      ? Math.min(100, (periodData.kcal || 0) / targetKcalPeriod * 100)
      : 0;
    const rdaTrack = Math.min(100, nutrientStats.averageCoverage || 0);

    return `<section class="card planner48-categories">
  <div class="planner48-section-head"><div><div class="planner48-eyebrow">03 / ПОЛНОТА И РАЗНООБРАЗИЕ</div><h2>Мои ориентиры</h2><p>Показатели рассчитываются по блюдам и продуктам выбранной недели.</p></div>${activeSet ? `<div class="planner48-set-heading-actions"><span class="tag active">Неделя ${selectedWeek}</span><button type="button" class="btn" id="planner-weekly-goals-open">Настроить ориентиры</button></div>` : ''}</div>
  ${categories}
 </section>
 <section class="card planner48-analytics">
  <div class="planner48-section-head"><div><div class="planner48-eyebrow">04 / АНАЛИТИКА РАЦИОНА</div><h2>Питательная ценность</h2><p>Фактическое КБЖУ блюд выбранного набора и недели в сравнении с целями профиля.</p></div></div>
  <div class="planner48-period-row"><div class="planner-period-switch" role="group" aria-label="Период аналитики"><button type="button" data-planner-period="day" class="${period.mode === 'day' ? 'active' : ''}" aria-pressed="${period.mode === 'day'}">Среднее за день</button><button type="button" data-planner-period="week" class="${period.mode === 'week' ? 'active' : ''}" aria-pressed="${period.mode === 'week'}">Итого за неделю</button></div><span class="planner48-period-caption">${escapeHtml(period.label)}</span></div>
  <div class="planner48-analytics-overview">
   <div class="planner48-kcal-card"><div class="planner48-kcal-top"><span>${escapeHtml(period.heading)}</span><span class="tag active">${kcalPercent === null ? 'Цель не задана' : `${kcalPercent}% цели`}</span></div><div class="planner48-kcal-number">${period.kcalText} <small>${escapeHtml(period.valueUnit)}</small></div><div class="planner48-kcal-target">Персональный ориентир: ${period.targetText} ${escapeHtml(period.valueUnit)}</div><div class="planner48-kcal-track"><i style="width:${kcalTrack}%"></i></div></div>
   <div class="planner48-rda-card"><span>СРЕДНЕЕ ПОКРЫТИЕ RDA / AI</span><strong>${escapeHtml(rdaText)}</strong><small>${nutrientStats.averageCoverage === null ? 'Нет сопоставимых нутриентов или данных Профиля' : 'Среднее по нутриентам с заполненными значениями, за сутки'}</small><div class="planner48-kcal-track"><i style="width:${rdaTrack}%"></i></div></div>
  </div>
  <div class="planner48-macro-grid">${macroMarkup}</div>
  <div class="planner48-nutrients-grid">
   <div class="planner48-nutrient-card"><div class="planner48-subhead"><h3>Витамины</h3><span>Факт / RDA</span></div>${vitaminMarkup}</div>
   <div class="planner48-nutrient-card"><div class="planner48-subhead"><h3>Минералы и другие нутриенты</h3><span>Факт / RDA</span></div>${mineralMarkup}</div>
  </div>
  <div class="planner48-analysis-foot">${nutritionFootText}</div>
 </section>
 <section class="planner-meals-section planner48-meals">
  <div class="planner48-section-head"><div><div class="planner48-eyebrow">05 / РАСПРЕДЕЛЕНИЕ</div><h2>КБЖУ по приёмам пищи</h2><p>Среднее суточное КБЖУ выбранной недели распределяется по приёмам пищи с учётом структуры из Профиля.</p></div><span class="tag active">Неделя ${selectedWeek}</span></div>
  <div class="planner-meal-target-grid">${mealCards}</div>
 </section>`;
  };

  root.NutriMealUI = ui;
})(globalThis);
