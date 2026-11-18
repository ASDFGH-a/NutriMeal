(function registerProfileModal(root) {
  const ui = root.NutriMealUI || {};

  ui.renderProfileModalBody = function renderProfileModalBody({
    draft,
    activityOptions,
    trainingOptions,
    weekdays,
    age,
    ageNote,
    formatActivityFactor,
    escapeHtml,
    tokenEditorMarkup
  }) {
    return `
 <section class="profile-form-section">
  <div class="profile-form-section-title">Личные данные</div>
  <div class="form-grid">
   <div class="field"><label for="profile-sex">Пол</label><select id="profile-sex"><option value="">Не указан</option><option value="Мужской" ${draft.sex === 'Мужской' ? 'selected' : ''}>Мужской</option><option value="Женский" ${draft.sex === 'Женский' ? 'selected' : ''}>Женский</option></select></div>
   <div class="field"><label for="profile-birth-date">Дата рождения</label><input id="profile-birth-date" type="date" max="${draft.today}" value="${escapeHtml(draft.birthDate || '')}"></div>
   <div class="field"><label>Возраст · рассчитывается автоматически</label><div class="profile-age-preview" id="profile-age-preview"><strong>${age ?? '—'}</strong><span>${ageNote}</span></div></div>
   <div class="field"><label for="profile-height">Рост, см</label><input type="number" min="80" max="250" step="0.1" id="profile-height" value="${draft.height}"></div>
   <div class="field"><label for="profile-weight">Текущий вес, кг</label><input type="number" min="1" max="500" step="0.1" id="profile-weight" value="${draft.currentWeight}"></div>
   <div class="field"><label for="profile-meal-count">Стандартных приёмов пищи в день</label><input type="number" min="1" max="6" step="1" id="profile-meal-count" value="${draft.mealCount}"></div>
  </div>
  <div class="field-help" style="margin-top:9px">Возраст определяется по дате рождения. Количество стандартных приёмов пищи автоматически используется в Дневнике и Планировании; перекусы добавляются отдельно.</div>
 </section>
 <section class="profile-form-section">
  <div class="profile-form-section-title">Аллергии и пищевые ограничения</div>
  <div class="form-grid">
   ${tokenEditorMarkup('allergies', 'Аллергии и непереносимости', 'Начни вводить аллерген…', 'Можно выбрать значение из списка или добавить собственное.')}
   ${tokenEditorMarkup('foodRestrictions', 'Другие пищевые ограничения', 'Например, безлактозное питание…', 'Свободный ввод: добавляй ограничения, которые важно учитывать.')}
  </div>
 </section>
 <section class="profile-form-section">
  <div class="profile-form-section-title">Активность и тренировки</div>
  <div class="form-grid">
   <div class="field"><label for="profile-activity-factor">Активность</label><select id="profile-activity-factor">${activityOptions.map((option) => `<option value="${option.factor}" ${Math.abs(Number(draft.activityFactor) - option.factor) < 0.001 ? 'selected' : ''}>${option.label} · ×${formatActivityFactor(option.factor)}</option>`).join('')}</select><div class="field-help">Выбирай коэффициент с учётом привычной активности и регулярных тренировок. Тренировки не прибавляются к расходу отдельно.</div></div>
   <div class="field"><label for="profile-training-frequency">Частота тренировок</label><select id="profile-training-frequency">${trainingOptions.map((option) => `<option value="${option}" ${draft.trainingFrequency === option ? 'selected' : ''}>${option}</option>`).join('')}</select></div>
  </div>
  <div style="margin-top:14px"><div class="field"><label>Обычные дни тренировок</label><div class="profile-training-days" id="profile-training-days">${weekdays.map((day) => `<button type="button" class="profile-day-toggle ${draft.trainingDays.includes(day) ? 'selected' : ''}" data-training-day="${day}" aria-pressed="${draft.trainingDays.includes(day) ? 'true' : 'false'}">${day}</button>`).join('')}</div><div class="field-help" id="profile-training-days-help" style="margin-top:7px">Выбери дни недели, в которые обычно тренируешься. Это расписание профиля, не учёт отдельных тренировок.</div></div></div>
 </section>
 <div class="field-help">Цель и целевой вес задаются отдельно в разделе «Планирование». Замеры тела редактируются в отдельном блоке Профиля.</div>`;
  };

  root.NutriMealUI = ui;
})(globalThis);
