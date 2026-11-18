(function registerPlanningScreen(root) {
  const ui = root.NutriMealUI || {};

  ui.renderPlanningOverview = function renderPlanningOverview({
    plan,
    profile,
    planPresets,
    ready,
    calc,
    targetKcal,
    targetP,
    targetF,
    targetC,
    fmt,
    locale,
    escapeHtml
  }) {
    const currentWeight = Number(profile.currentWeight);
    const targetWeight = Number(plan.targetWeight);
    const difference = targetWeight - currentWeight;
    const presetOptions = planPresets.map((preset) =>
      `<option value="${escapeHtml(preset.id)}">${escapeHtml(preset.name)}</option>`
    ).join('');

    return `<section class="card planning-goal-card">
  <div class="card-head"><div><div class="card-title">Цель и стратегия</div><div class="card-desc">Цель и целевой вес задаются здесь, отдельно от Профиля.</div></div><button class="btn" id="edit-setup">Настроить план</button></div>
  <div class="planning-goal-summary"><div><span class="metric-label">Текущая цель</span><strong>${escapeHtml(plan.goal)}</strong></div><div><span class="metric-label">Текущий вес</span><strong>${currentWeight.toLocaleString(locale, { maximumFractionDigits: 1 })} кг</strong></div><div><span class="metric-label">Целевой вес</span><strong>${targetWeight.toLocaleString(locale, { maximumFractionDigits: 1 })} кг</strong></div><div><span class="metric-label">Разница</span><strong>${difference.toLocaleString(locale, { maximumFractionDigits: 1, signDisplay: 'always' })} кг</strong></div></div>
  <div class="plan-toolbar"><div class="field"><label for="plan-preset-select">Сохранённые настройки цели</label><select id="plan-preset-select"><option value="">Выбрать пресет…</option>${presetOptions}</select></div><button class="btn" id="plan-preset-save-open">Сохранить пресет</button><button class="btn-quiet" id="plan-presets-manage">Управление пресетами (${planPresets.length})</button></div>
 </section>
 ${ready ? '' : `<div class="notice-card"><strong>Для точного персонального расчёта проверь Профиль</strong><span>Персональные базовые и целевые значения рассчитываются по данным Профиля. Аналитика набора рассчитывается по составам добавленных рецептов.</span><button class="btn" id="planning-open-profile">Открыть Профиль</button></div>`}
 <section class="card planning-core-card">
  <div class="card-head"><div><div class="card-title">Расход и целевое потребление</div><div class="card-desc">Базовый расход и твои целевые КБЖУ.</div></div></div>
  <div class="planning-core-grid">
   <div class="planning-core-panel"><div class="planning-core-panel-head"><h3>Расход энергии</h3><span class="tag">BMR / TDEE</span></div><div class="planning-core-metrics"><div class="planning-core-metric"><div class="metric-label">BMR</div><div class="metric-value">${ready ? fmt(calc.bmr) : '—'} <span class="metric-unit">ккал / день</span></div><div class="metric-foot">Основной обмен</div></div><div class="planning-core-metric"><div class="metric-label">TDEE</div><div class="metric-value">${ready ? fmt(calc.tdee) : '—'} <span class="metric-unit">ккал / день</span></div><div class="metric-foot">С учётом уровня активности из Профиля</div></div></div></div>
   <div class="planning-core-panel"><div class="planning-core-panel-head"><h3>Целевое потребление</h3><span class="tag">Профиль и цель</span></div><div class="planning-core-metrics planning-target-metrics"><div class="planning-core-metric"><div class="metric-label">Калории</div><div class="metric-value">${ready ? fmt(calc.kcal) : fmt(targetKcal)} <span class="metric-unit">ккал / день</span></div><div class="metric-foot">${ready ? `${calc.adjustment > 0 ? '+' : ''}${calc.adjustment} ккал к TDEE` : 'Текущий ориентир плана'}</div></div><div class="planning-core-metric"><div class="metric-label">Белки</div><div class="metric-value">${ready ? calc.protein : targetP} <span class="metric-unit">г / день</span></div><div class="metric-foot">Целевое потребление</div></div><div class="planning-core-metric"><div class="metric-label">Жиры</div><div class="metric-value">${ready ? calc.fat : targetF} <span class="metric-unit">г / день</span></div><div class="metric-foot">Целевое потребление</div></div><div class="planning-core-metric"><div class="metric-label">Углеводы</div><div class="metric-value">${ready ? calc.carbs : targetC} <span class="metric-unit">г / день</span></div><div class="metric-foot">Целевое потребление</div></div></div></div>
  </div>
 </section>`;
  };

  root.NutriMealUI = ui;
})(globalThis);
