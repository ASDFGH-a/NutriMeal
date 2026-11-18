import { getNutrientReferenceValue, NUTRIENT_REFERENCE_VALUES } from '../../domain/statistics/diary-statistics.js';
import { WEEKLY_FOOD_GROUPS } from '../../domain/nutrition-set/nutrition-set.calculations.js';
import { calculateProfileAge } from '../../domain/planning/plan-calculations.js';

function ageBand(age) {
  if (age <= 13) return '9-13';
  if (age <= 18) return '14-18';
  if (age <= 30) return '19-30';
  if (age <= 50) return '31-50';
  if (age <= 70) return '51-70';
  return '71+';
}

function renderRdaTable(profile, escapeHtml) {
  const age = calculateProfileAge(profile.birthDate);
  if (age === null) {
    return '<div class="rda-empty"><strong>Нужны данные Профиля</strong><span>Укажи дату рождения — тогда покажем нормы для твоей возрастной группы. Если пол не указан, выведем оба столбца.</span></div>';
  }
  if (age < 9) {
    return '<div class="rda-empty"><strong>Возрастная группа не поддерживается этой таблицей</strong><span>В текущем прототипе приведены ориентиры для возраста от 9 лет.</span></div>';
  }

  const maleProfile = { ...profile, sex: 'Мужской' };
  const femaleProfile = { ...profile, sex: 'Женский' };
  const rows = NUTRIENT_REFERENCE_VALUES.map((item) => {
    const male = getNutrientReferenceValue(item.name, maleProfile);
    const female = getNutrientReferenceValue(item.name, femaleProfile);
    const value = profile.sex === 'Мужской'
      ? `${male.value} ${male.unit}`
      : profile.sex === 'Женский'
        ? `${female.value} ${female.unit}`
        : `${male.value} / ${female.value} ${male.unit}`;
    return `<tr><td>${escapeHtml(item.name)}</td><td>${escapeHtml(value)}</td><td><span class="rda-kind">${escapeHtml(item.kind)}</span></td></tr>`;
  }).join('');
  const sexLabel = profile.sex === 'Мужской'
    ? 'Мужчины'
    : profile.sex === 'Женский' ? 'Женщины' : 'Нормы мужчин / женщин';
  const valueHeading = ['Мужской', 'Женский'].includes(profile.sex)
    ? 'Рекомендуемое значение'
    : 'Мужчины / женщины';
  return `<div class="rda-context">Возрастная группа: <strong>${ageBand(age)}</strong> · ${sexLabel}</div><div class="table-wrap rda-table-wrap"><table class="data-table"><thead><tr><th>Нутриент</th><th>${valueHeading}</th><th>Тип</th></tr></thead><tbody>${rows}</tbody></table></div><div class="field-help">RDA — рекомендуемое потребление; AI — адекватное потребление, применяемое, когда данных для установления RDA недостаточно. Это справочные значения для здоровых людей, а не индивидуальное медицинское назначение.</div>`;
}

export function createSettingsFlow({
  document,
  ui,
  data,
  themeRepository,
  showToast,
  escapeHtml
}) {
  const page = document.getElementById('page');

  function setHeader(title, subtitle) {
    document.getElementById('page-title').textContent = title;
    document.getElementById('page-subtitle').textContent = subtitle;
  }

  function renderTheory() {
    setHeader('Теория', 'Документация расчётов и принципов питания');
    const weeklyReferenceRows = WEEKLY_FOOD_GROUPS.map((group) => (
      `<tr><td>${escapeHtml(group.label)}</td><td>${escapeHtml(group.reference)}</td></tr>`
    )).join('');
    page.innerHTML = ui.renderTheoryScreen({
      weeklyReferenceRows,
      rdaMarkup: renderRdaTable(data.profile, escapeHtml)
    });
    document.getElementById('settings-theory-back').addEventListener('click', renderSettings);
  }

  function renderSettings() {
    setHeader('Настройки', 'Настройки приложения');
    page.innerHTML = ui.renderSettingsScreen({ theme: data.theme });
    document.getElementById('settings-theme').addEventListener('change', (event) => {
      const theme = event.currentTarget.checked ? 'dark' : 'light';
      try {
        themeRepository.save(theme);
        data.theme = theme;
        document.documentElement.dataset.theme = theme;
      } catch (error) {
        console.error('Не удалось сохранить тему оформления', error);
        event.currentTarget.checked = data.theme === 'dark';
        showToast(error instanceof Error ? error.message : 'Не удалось сохранить тему оформления');
      }
    });
    document.getElementById('settings-open-theory').addEventListener('click', renderTheory);
  }

  return { render: renderSettings };
}
