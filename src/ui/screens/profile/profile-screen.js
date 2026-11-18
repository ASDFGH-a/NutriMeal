(function registerProfileScreen(root) {
  const ui = root.NutriMealUI || {};

  ui.renderProfileScreen = function renderProfileScreen({
    profile,
    measurementHistory,
    measurements,
    weekdays,
    calculateProfileAge,
    readableDate,
    getActivityLevel,
    formatActivityFactor,
    locale,
    escapeHtml
  }) {
    const latest = measurementHistory.length
      ? [...measurementHistory].sort((left, right) => right.date.localeCompare(left.date))[0]
      : null;
    const latestValues = latest?.values || Object.fromEntries(
      measurements.map((measurement) => [measurement.name, measurement.value])
    );
    const valueText = (value) => Number(value) > 0
      ? `${Number(value).toLocaleString(locale, { maximumFractionDigits: 1 })} см`
      : '—';
    const groups = ['Верхняя часть тела', 'Талия и таз', 'Руки', 'Ноги'];
    const groupMarkup = groups.map((group) => {
      const items = measurements.filter((measurement) => measurement.group === group);
      if (group === 'Руки' || group === 'Ноги') {
        const labels = group === 'Руки' ? ['Бицепс', 'Предплечье'] : ['Бедро', 'Икра'];
        const side = group === 'Руки' ? 'рука' : 'нога';
        const rows = labels.map((label) => {
          const left = items.find((measurement) => measurement.name === `${label} — левая ${side}`);
          const right = items.find((measurement) => measurement.name === `${label} — правая ${side}`);
          return left && right
            ? `<div class="profile-measure-pair-row"><span>${label}</span><b>${valueText(latestValues[left.name])}</b><b>${valueText(latestValues[right.name])}</b></div>`
            : '';
        }).join('');
        return `<div class="profile-measure-group"><div class="profile-measure-group-title">${group.toUpperCase()}</div><div class="profile-measure-table"><div class="profile-measure-pair-head"><span></span><span>Левая</span><span>Правая</span></div>${rows}</div></div>`;
      }
      return `<div class="profile-measure-group"><div class="profile-measure-group-title">${group.toUpperCase()}</div><div class="profile-measure-table">${items.map((measurement) => `<div class="profile-measure-row"><span>${measurement.name}</span><b>${valueText(latestValues[measurement.name])}</b></div>`).join('')}</div></div>`;
    }).join('');
    const profileAge = calculateProfileAge(profile.birthDate);
    const birthDateText = profile.birthDate ? readableDate(profile.birthDate) : 'Не указана';
    const trainingDaysText = (profile.trainingDays || []).length
      ? weekdays.filter((day) => profile.trainingDays.includes(day)).join(' · ')
      : 'Дни не выбраны';
    const displayTokens = (values) => values.length
      ? values.map((value) => `<span class="profile-token-chip"><span>${escapeHtml(value)}</span></span>`).join('')
      : '<span class="profile-no-data">Не указано</span>';

    return `<section class="card profile-overview-card">
   <div class="card-head"><div><div class="card-title">Персональные параметры</div><div class="card-desc">Личные данные и актуальные показатели тела</div></div><button class="btn" id="edit-profile">Изменить параметры</button></div>
   <div class="profile-basic-grid">
    <div class="profile-basic-item"><span>Пол</span><strong>${escapeHtml(profile.sex || '—')}</strong></div>
    <div class="profile-basic-item"><span>Дата рождения</span><strong style="font-size:14px;letter-spacing:0">${escapeHtml(birthDateText)}</strong></div>
    <div class="profile-basic-item"><span>Возраст</span><strong>${profileAge === null ? '—' : profileAge}</strong><small>${profileAge === null ? '' : 'лет'}</small></div>
    <div class="profile-basic-item"><span>Рост</span><strong>${Number(profile.height).toLocaleString(locale, { maximumFractionDigits: 1 })}</strong><small>см</small></div>
    <div class="profile-basic-item"><span>Текущий вес</span><strong>${Number(profile.currentWeight).toLocaleString(locale, { maximumFractionDigits: 1 })}</strong><small>кг</small></div>
   </div>
   <div class="profile-activity-grid">
    <div class="profile-activity-item"><span>Активность · коэффициент</span><strong>${escapeHtml(getActivityLevel(profile.activityFactor).label)} · ×${formatActivityFactor(profile.activityFactor)}</strong></div>
    <div class="profile-activity-item"><span>Частота тренировок</span><strong>${escapeHtml(profile.trainingFrequency || 'Не указана')}</strong></div>
    <div class="profile-activity-item"><span>Дни тренировок</span><strong>${escapeHtml(trainingDaysText)}</strong></div>
    <div class="profile-activity-item"><span>Стандартных приёмов пищи</span><strong>${profile.mealCount}</strong></div>
   </div>
   <div class="profile-data-groups">
    <div class="profile-data-group"><div class="profile-data-group-title">АЛЛЕРГИИ</div><div class="profile-token-list">${displayTokens(profile.allergies || [])}</div></div>
    <div class="profile-data-group"><div class="profile-data-group-title">ПИЩЕВЫЕ ОГРАНИЧЕНИЯ</div><div class="profile-token-list">${displayTokens(profile.foodRestrictions || [])}</div></div>
   </div>
   <div class="profile-measures-block">
    <div class="profile-measures-head"><div><div class="card-title">Замеры тела</div><div class="card-desc">${latest ? `Последнее измерение · ${readableDate(latest.date)}` : 'Замеры пока не добавлены'}</div></div><button class="btn-quiet" id="profile-edit-measures">Изменить замеры</button></div>
    <div class="profile-measurement-groups">${groupMarkup}</div>
   </div>
  </section>`;
  };

  root.NutriMealUI = ui;
})(globalThis);
