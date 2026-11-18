(function registerStatisticsScreen(root) {
  const ui = root.NutriMealUI || {};

  ui.renderStatisticsScreen = function renderStatisticsScreen({
    periodLabel,
    periodRangeLabel,
    canMoveForward,
    foodRange,
    coverageMarkup,
    calorieCard,
    macroCard,
    waterCard,
    varietyCard,
    microCard,
    weightCard,
    measuresCard,
    footerNote
  }) {
    return `<header class="stats-page-head"><div class="stats-period-toolbar" aria-label="Период статистики">
   <button type="button" class="stats-period-trigger" id="stats-period-trigger" aria-haspopup="dialog" aria-label="Выбрать период статистики"><span class="stats-period-trigger-copy"><strong>${periodLabel}</strong><small>${periodRangeLabel}</small></span><span class="stats-period-trigger-chevron" aria-hidden="true">⌄</span></button>
   <div class="stats-period-nav" role="group" aria-label="Перемещение по периодам"><button type="button" id="stats-period-prev" aria-label="Предыдущий период" title="Предыдущий период">‹</button><button type="button" id="stats-period-next" aria-label="Следующий период" title="Следующий период" ${canMoveForward ? '' : 'disabled'}>›</button></div>
  </div></header>
  <div class="stats-group-heading"><span>01</span><div><b>Питание</b><small>Фактическое потребление · ${foodRange}</small></div></div>
  ${coverageMarkup}
  <div class="stats-card-list">${calorieCard}${macroCard}${waterCard}${varietyCard}${microCard}</div>
  <div class="stats-group-heading"><span>02</span><div><b>Состояние тела</b><small>Изменения физических параметров профиля</small></div></div>
  <div class="stats-card-list">${weightCard}${measuresCard}</div>
  <div class="stats-footer-note">${footerNote}</div>`;
  };

  root.NutriMealUI = ui;
})(globalThis);
