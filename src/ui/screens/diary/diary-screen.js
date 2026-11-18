(function registerDiaryScreen(root) {
  const ui = root.NutriMealUI || {};

  ui.renderDiaryScreen = function renderDiaryScreen({
    dateLabel,
    selectedDate,
    todayKey,
    futureDate,
    standardMeals,
    displayMeals,
    snackEntries,
    entriesByMeal,
    dayEntries,
    macrosFor,
    diaryMealShare,
    plan,
    profile,
    expandedMeals,
    waterEntries,
    waterTotal,
    waterLitres,
    weightStatus,
    bmi,
    measurementHistory,
    readableDate,
    measurementCardSummary,
    fmt,
    nutritionNumber,
    escapeHtml,
    diaryEntryQuantityLabel
  }) {
    const isCalorieOnlyEntry = (entry) => Boolean(entry?.calorieOnly === true || entry?.quantityMode === 'calorie-only');
    const isMassSystemEntry = (entry) => Boolean(
      isCalorieOnlyEntry(entry)
      || entry?.isNutritionSetAverage === true
      || entry?.quantityMode === 'set-average'
    );
    const metricCard = (label, value, unit, foot, percent) => `<div class="card"><div class="metric-label">${label}</div><div class="metric-value">${value} <span class="metric-unit">${unit}</span></div><div class="metric-foot">${foot}</div><div class="progress"><span style="width:${Math.min(percent, 100)}%"></span></div></div>`;
    const total = macrosFor(dayEntries);
    const norm = { kcal: plan.kcal, p: plan.p, f: plan.f, c: plan.c };
    const entryRows = (items) => items.length
      ? items.map((entry) => {
        const system = isMassSystemEntry(entry);
        const macroLine = isCalorieOnlyEntry(entry)
          ? 'БЖУ не указано'
          : `Б ${nutritionNumber(entry.p)} · Ж ${nutritionNumber(entry.f)} · У ${nutritionNumber(entry.c)}`;
        return `<div class="meal-entry"><div class="meal-entry-name"><strong>${escapeHtml(entry.name)}</strong><div class="small muted">${diaryEntryQuantityLabel(entry)}</div></div><div class="entry-right"><b>${fmt(entry.kcal)} ккал</b><small>${macroLine}</small></div><div class="entry-actions">${system ? '' : `<button class="entry-action" data-edit-entry="${entry.id}" aria-label="Изменить ${escapeHtml(entry.name)}" title="Изменить количество и запись">✎</button><button class="entry-action" data-replace-entry="${entry.id}" aria-label="Заменить ${escapeHtml(entry.name)}" title="Заменить блюдо">↻</button>`}<button class="entry-action" data-remove-entry="${entry.id}" aria-label="Удалить ${escapeHtml(entry.name)}" title="Удалить">×</button></div></div>`;
      }).join('')
      : '<div class="empty">Добавленных продуктов и блюд пока нет</div>';
    const waterRows = waterEntries.map((entry) => `<div class="meal-entry"><div class="meal-entry-name"><strong>${fmt(entry.ml)} мл</strong><div class="small muted">Отдельная запись воды</div></div><div class="entry-actions"><button type="button" class="entry-action" data-water-remove="${entry.id}" aria-label="Удалить запись воды ${fmt(entry.ml)} мл" title="Удалить запись">×</button></div></div>`).join('');

    return `<div class="between"><div class="date-switch"><button data-date="prev" aria-label="Предыдущий день">‹</button><button class="date-open" id="open-calendar" aria-label="Открыть календарь">${dateLabel}</button><button data-date="next" aria-label="Следующий день">›</button></div><button class="btn-quiet" id="today-btn">Сегодня</button></div>
 <div class="grid grid-4">
 ${metricCard('Калории', fmt(total.kcal), 'ккал', `из ${fmt(norm.kcal)} ккал`, total.kcal / norm.kcal * 100)}
 ${dayEntries.some(isCalorieOnlyEntry) ? metricCard('Белки', '—', 'г', 'Часть калорий без распределения БЖУ', 0) : metricCard('Белки', total.p.toFixed(1), 'г', `из ${norm.p} г`, total.p / norm.p * 100)}
 ${dayEntries.some(isCalorieOnlyEntry) ? metricCard('Жиры', '—', 'г', 'Часть калорий без распределения БЖУ', 0) : metricCard('Жиры', total.f.toFixed(1), 'г', `из ${norm.f} г`, total.f / norm.f * 100)}
 ${dayEntries.some(isCalorieOnlyEntry) ? metricCard('Углеводы', '—', 'г', 'Часть калорий без распределения БЖУ', 0) : metricCard('Углеводы', total.c.toFixed(1), 'г', `из ${norm.c} г`, total.c / norm.c * 100)}
 </div>
 <div class="between"><div><div class="section-title">Приёмы пищи</div><div class="card-desc">${standardMeals.length} стандартных приёмов пищи · количество задаётся в Профиле</div></div></div>
 ${futureDate ? '<div class="muted-box">Это будущая дата. Её можно просматривать, но добавление записей в дневник доступно только за сегодняшний или прошедший день.</div>' : ''}
 <div class="meal-list">${displayMeals.map((meal, index) => {
   const items = entriesByMeal[meal] || [];
   const sum = macrosFor(items);
   const share = diaryMealShare(meal);
   const target = Number.isFinite(share) ? Math.round(plan.kcal * share) : null;
   const progress = target ? Math.min(sum.kcal / target * 100, 100) : 0;
   const expanded = expandedMeals.has(meal);
   const itemRows = entryRows(items);
   return `<section class="card meal"><div class="meal-summary"><div class="meal-main"><div class="meal-title">${escapeHtml(meal)}</div><div class="meal-controls"><div class="meal-kcal"><strong>${fmt(sum.kcal)}</strong><span>${target === null ? 'без ориентира' : `из ~${fmt(target)} ккал`}</span></div>${['Калории за день', 'Набор питания'].includes(meal) ? '' : `<button class="btn-quiet meal-add" data-add-meal="${escapeHtml(meal)}" ${futureDate ? 'disabled' : ''}>＋ Добавить</button>`}<button type="button" class="meal-toggle" data-toggle-meal="${escapeHtml(meal)}" aria-label="${expanded ? 'Свернуть' : 'Раскрыть'} список: ${escapeHtml(meal)}" aria-expanded="${expanded}" aria-controls="meal-details-${index}" title="${expanded ? 'Свернуть список' : 'Показать список'}"><span aria-hidden="true">›</span></button></div></div>${target !== null ? `<div class="meal-progress" role="progressbar" aria-label="Заполнение ориентира: ${escapeHtml(meal)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(progress)}"><span style="width:${progress}%"></span></div>` : ''}</div><div class="meal-details" id="meal-details-${index}" ${expanded ? '' : 'hidden'}>${itemRows}</div></section>`;
 }).join('')}</div>
 <section class="card meal snack-meal"><div class="meal-summary"><div class="meal-main"><div><div class="meal-title">Перекус</div><div class="card-desc">Дополнительный приём пищи вне стандартного расписания</div></div><div class="meal-controls"><div class="meal-kcal"><strong>${fmt(macrosFor(snackEntries).kcal)}</strong><span>дополнительно</span></div><button class="btn-quiet meal-add" id="add-snack" ${futureDate ? 'disabled' : ''}>＋ Добавить перекус</button><button type="button" class="meal-toggle" id="toggle-snack" aria-label="${expandedMeals.has('Перекус') ? 'Свернуть' : 'Раскрыть'} перекусы" aria-expanded="${expandedMeals.has('Перекус')}" aria-controls="snack-details"><span aria-hidden="true">›</span></button></div></div></div><div class="meal-details" id="snack-details" ${expandedMeals.has('Перекус') ? '' : 'hidden'}>${entryRows(snackEntries)}</div></section>
 <section class="card water-card"><div class="card-head"><div><div class="card-title">Вода</div><div class="card-desc">Учёт обычной питьевой воды отдельно от еды и других напитков</div></div><span class="tag">${waterLitres} л</span></div><div class="water-summary"><strong>${fmt(waterTotal)}</strong><span>мл за день</span></div><div class="water-actions"><button class="btn" data-water-quick="250" ${futureDate ? 'disabled' : ''}>＋ 250 мл</button></div><div class="water-entry-list" style="margin-top:12px">${waterRows || '<div class="empty">Записей воды пока нет</div>'}</div></section>
 <div class="grid grid-2"><section class="card"><div class="card-head"><div><div class="card-title">Цель по весу</div><div class="card-desc">Текущий вес и движение к цели</div></div><div class="card-actions"><button class="btn-quiet" id="open-weight-history">История</button><button class="btn-quiet" id="open-weight">Изменить</button></div></div><div class="weight-primary"><div><div class="metric-value">${Number(profile.currentWeight).toFixed(1).replace('.', ',')} <span class="metric-unit">кг</span></div><div class="metric-foot">Целевой вес ${plan.targetWeight} кг</div>${weightStatus.note ? `<div class="weight-bmi-note">${weightStatus.note}</div>` : ''}</div><div class="tag active">${weightStatus.label}</div></div><div class="weight-bmi"><div><div class="metric-label">ИМТ</div><div class="metric-foot">Индекс массы тела</div></div><div class="weight-bmi-value"><strong>${bmi.value}</strong><span class="tag">${bmi.label}</span></div></div></section>
 <section class="card"><div class="card-head"><div><div class="card-title">Замеры тела</div><div class="card-desc">${measurementHistory.length ? `Последнее измерение · ${readableDate([...measurementHistory].sort((left, right) => right.date.localeCompare(left.date))[0].date)}` : 'Замеры пока не добавлены'}</div></div><button class="btn-quiet" id="open-measures">Подробнее</button></div>${typeof measurementCardSummary === 'function' ? measurementCardSummary() : measurementCardSummary}</section></div>`;
  };

  root.NutriMealUI = ui;
})(globalThis);
