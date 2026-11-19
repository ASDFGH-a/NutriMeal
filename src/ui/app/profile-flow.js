import { createRecipeStandardFilterCategories } from '../../domain/catalog/catalog-filters.js';
import { MEASUREMENT_DEFINITIONS, getLatestMeasurementRecord } from '../../domain/measurement/measurement.model.js';
import {
  measurementRatios,
  measurementValue,
  symmetryDifference
} from '../../domain/measurement/measurement-calculations.js';
import { calculateProfileAge } from '../../domain/planning/plan-calculations.js';
import { PROFILE_ACTIVITY_LEVELS, getActivityLevel } from '../../domain/profile/profile.model.js';
import { uniqueProductValues } from '../../domain/shared/filter-utils.js';
import { isValidDateKey } from '../../domain/shared/date-utils.js';

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const TRAINING_OPTIONS = [
  'Нет регулярных тренировок',
  '1–2 раза в неделю',
  '3–4 раза в неделю',
  '5 и более раз в неделю'
];

export function createProfileFlow({
  document,
  ui,
  page,
  data,
  profileServices,
  bodyHistoryServices,
  planningServices,
  today,
  openModal,
  closeModal,
  showToast,
  escapeHtml,
  renderDiary
}) {
  function reportError(message, error) {
    console.error(message, error);
    showToast(error instanceof Error ? error.message : message);
  }

  function readableDate(dateKey) {
    const [year, month, day] = dateKey.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }

  function formatActivityFactor(factor) {
    const raw = Number(factor).toFixed(3).replace(/0+$/, '').replace(/\.$/, '');
    const [whole, fraction = ''] = raw.split('.');
    return `${whole},${fraction.padEnd(2, '0')}`;
  }

  function syncPlanCalculations(persist = false) {
    const result = planningServices.recalculatePlan({ profile: data.profile, plan: data.plan });
    if (result.targets) {
      data.plan = persist
        ? planningServices.savePlan({ plan: result.plan })
        : result.plan;
    }
    return result;
  }

  function render() {
    syncPlanCalculations();
    document.getElementById('page-title').textContent = 'Профиль';
    document.getElementById('page-subtitle').textContent = 'Личные параметры и история тела';
    page.innerHTML = ui.renderProfileScreen({
      profile: data.profile,
      measurementHistory: data.measurementHistory,
      measurements: data.measurements,
      weekdays: WEEKDAYS,
      calculateProfileAge,
      readableDate,
      getActivityLevel,
      formatActivityFactor,
      locale: 'ru-RU',
      escapeHtml
    });
    document.getElementById('edit-profile').addEventListener('click', openProfileModal);
    document.getElementById('profile-edit-measures').addEventListener('click', () => openMeasurementModal());
  }

  function profileAllergenSuggestions() {
    const category = createRecipeStandardFilterCategories().find((item) => item.id === 'allergens');
    return uniqueProductValues([...(category?.values || []), ...(data.profile.allergies || [])]);
  }

  function openProfileModal() {
    const draft = {
      ...data.profile,
      today,
      trainingDays: [...(data.profile.trainingDays || [])],
      allergies: [...(data.profile.allergies || [])],
      foodRestrictions: [...(data.profile.foodRestrictions || [])]
    };
    const age = calculateProfileAge(draft.birthDate);
    const ageNote = age === null ? 'Укажи корректную дату рождения' : 'лет';
    const tokenEditorMarkup = (type, label, placeholder, help = '') => (
      `<div class="field full"><label for="profile-${type}-input">${escapeHtml(label)}</label><div class="profile-token-editor"><div class="profile-token-input"><input id="profile-${type}-input" type="text" autocomplete="off" placeholder="${escapeHtml(placeholder)}"><button type="button" class="btn" id="profile-${type}-add">Добавить</button></div><div class="profile-token-suggestions" id="profile-${type}-suggestions"></div><div class="profile-token-list" id="profile-${type}-selected"></div></div>${help ? `<div class="field-help">${escapeHtml(help)}</div>` : ''}</div>`
    );
    const body = ui.renderProfileModalBody({
      draft,
      activityOptions: PROFILE_ACTIVITY_LEVELS,
      trainingOptions: TRAINING_OPTIONS,
      weekdays: WEEKDAYS,
      age,
      ageNote,
      formatActivityFactor,
      escapeHtml,
      tokenEditorMarkup
    });
    openModal(
      'Персональные параметры',
      body,
      '<button class="btn" id="profile-cancel">Отмена</button><button class="btn-primary" id="profile-save">Сохранить</button>'
    );
    document.querySelector('.modal').classList.add('profile-edit-modal');

    const updateAgePreview = () => {
      const currentAge = calculateProfileAge(document.getElementById('profile-birth-date').value);
      document.getElementById('profile-age-preview').innerHTML = `<strong>${currentAge === null ? '—' : currentAge}</strong><span>${currentAge === null ? 'Укажи корректную дату рождения' : 'лет'}</span>`;
    };
    document.getElementById('profile-birth-date').addEventListener('input', updateAgePreview);

    const paintTrainingDays = () => {
      const noTraining = document.getElementById('profile-training-frequency').value === TRAINING_OPTIONS[0];
      document.querySelectorAll('[data-training-day]').forEach((button) => {
        const active = draft.trainingDays.includes(button.dataset.trainingDay);
        button.classList.toggle('selected', active);
        button.setAttribute('aria-pressed', String(active));
        button.disabled = noTraining;
      });
      document.getElementById('profile-training-days-help').textContent = noTraining
        ? 'Выбери частоту тренировок, чтобы отметить обычные дни.'
        : 'Выбери дни недели, в которые обычно тренируешься. Это расписание профиля, не учёт отдельных тренировок.';
    };
    document.getElementById('profile-training-frequency').addEventListener('change', () => {
      if (document.getElementById('profile-training-frequency').value === TRAINING_OPTIONS[0]) {
        draft.trainingDays = [];
      }
      paintTrainingDays();
    });
    document.querySelectorAll('[data-training-day]').forEach((button) => {
      button.addEventListener('click', () => {
        const day = button.dataset.trainingDay;
        draft.trainingDays = draft.trainingDays.includes(day)
          ? draft.trainingDays.filter((item) => item !== day)
          : [...draft.trainingDays, day];
        paintTrainingDays();
      });
    });

    const tokenValues = (type) => type === 'allergies' ? draft.allergies : draft.foodRestrictions;
    const paintTokenEditor = (type) => {
      const selected = tokenValues(type);
      const input = document.getElementById(`profile-${type}-input`);
      const query = input.value.trim();
      const normalizedQuery = query.toLocaleLowerCase('ru-RU');
      const source = type === 'allergies' ? profileAllergenSuggestions() : draft.foodRestrictions;
      const suggestions = uniqueProductValues(source).filter((value) => (
        !selected.some((item) => item.toLocaleLowerCase('ru-RU') === value.toLocaleLowerCase('ru-RU'))
        && (!normalizedQuery || value.toLocaleLowerCase('ru-RU').includes(normalizedQuery))
      )).slice(0, 8);
      const exactSuggestion = source.some((value) => (
        value.toLocaleLowerCase('ru-RU') === normalizedQuery
      ));

      document.getElementById(`profile-${type}-selected`).innerHTML = selected.map((value, index) => (
        `<span class="profile-token-chip"><span>${escapeHtml(value)}</span><button type="button" data-profile-token-remove="${type}" data-index="${index}" aria-label="Удалить ${escapeHtml(value)}">×</button></span>`
      )).join('');
      document.getElementById(`profile-${type}-suggestions`).innerHTML = [
        ...suggestions.map((value) => `<button type="button" class="profile-token-suggestion" data-profile-token-type="${type}" data-profile-token-value="${escapeHtml(value)}">${escapeHtml(value)}</button>`),
        query && !exactSuggestion && !selected.some((item) => item.toLocaleLowerCase('ru-RU') === normalizedQuery)
          ? `<button type="button" class="profile-token-suggestion create" data-profile-token-type="${type}" data-profile-token-value="${escapeHtml(query)}">Добавить «${escapeHtml(query)}»</button>`
          : ''
      ].join('');
    };
    const addToken = (type, value) => {
      const cleaned = String(value || '').trim();
      if (!cleaned) return;
      const selected = tokenValues(type);
      if (!selected.some((item) => item.toLocaleLowerCase('ru-RU') === cleaned.toLocaleLowerCase('ru-RU'))) {
        selected.push(cleaned);
      }
      const input = document.getElementById(`profile-${type}-input`);
      input.value = '';
      paintTokenEditor(type);
      input.focus();
    };
    ['allergies', 'foodRestrictions'].forEach((type) => {
      document.getElementById(`profile-${type}-add`).addEventListener('click', () => {
        addToken(type, document.getElementById(`profile-${type}-input`).value);
      });
      document.getElementById(`profile-${type}-input`).addEventListener('input', () => paintTokenEditor(type));
      document.getElementById(`profile-${type}-input`).addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          addToken(type, document.getElementById(`profile-${type}-input`).value);
        }
      });
      paintTokenEditor(type);
    });
    document.getElementById('modal-body').onclick = (event) => {
      const target = event.target instanceof Element ? event.target : null;
      const suggestion = target?.closest('[data-profile-token-value]');
      if (suggestion) {
        addToken(suggestion.dataset.profileTokenType, suggestion.dataset.profileTokenValue);
        return;
      }
      const remove = target?.closest('[data-profile-token-remove]');
      if (remove) {
        const type = remove.dataset.profileTokenRemove;
        const selected = tokenValues(type);
        selected.splice(Number(remove.dataset.index), 1);
        paintTokenEditor(type);
      }
    };
    paintTrainingDays();
    document.getElementById('profile-cancel').addEventListener('click', closeModal);
    document.getElementById('profile-save').addEventListener('click', () => {
      const birthDate = document.getElementById('profile-birth-date').value;
      const profileAge = calculateProfileAge(birthDate);
      const height = Number(document.getElementById('profile-height').value);
      const weight = Number(document.getElementById('profile-weight').value);
      const mealCount = Number(document.getElementById('profile-meal-count').value);
      if (birthDate && (profileAge === null || profileAge < 10 || profileAge > 120)) {
        showToast('Проверь дату рождения: возраст должен быть от 10 до 120 лет');
        return;
      }
      if (!Number.isFinite(height) || height < 80 || height > 250) {
        showToast('Укажи рост от 80 до 250 см');
        return;
      }
      if (!Number.isFinite(weight) || weight <= 0 || weight > 500) {
        showToast('Проверь текущий вес');
        return;
      }
      if (!Number.isInteger(mealCount) || mealCount < 1 || mealCount > 6) {
        showToast('Укажи от 1 до 6 стандартных приёмов пищи');
        return;
      }

      const heightChanged = height !== Number(data.profile.height);
      let nextProfile = {
        ...data.profile,
        sex: document.getElementById('profile-sex').value,
        birthDate,
        height,
        currentWeight: weight,
        activityFactor: Number(document.getElementById('profile-activity-factor').value) || 1.20,
        trainingFrequency: document.getElementById('profile-training-frequency').value,
        trainingDays: document.getElementById('profile-training-frequency').value === TRAINING_OPTIONS[0]
          ? []
          : WEEKDAYS.filter((day) => draft.trainingDays.includes(day)),
        allergies: uniqueProductValues(draft.allergies),
        foodRestrictions: uniqueProductValues(draft.foodRestrictions),
        mealCount
      };
      try {
        if (weight !== Number(data.profile.currentWeight)) {
          const result = bodyHistoryServices.weight.saveRecord({
            history: data.weightHistory,
            profile: nextProfile,
            weight,
            date: today,
            today
          });
          data.weightHistory = result.history;
          nextProfile = result.profile;
          data.profile = nextProfile;
        }
        if (heightChanged && data.measurementHistory.length) {
          const latest = getLatestMeasurementRecord(data.measurementHistory);
          if (latest) {
            const result = bodyHistoryServices.measurements.saveSnapshot({
              history: data.measurementHistory,
              profile: nextProfile,
              date: latest.date,
              values: { ...latest.values, height },
              today
            });
            data.measurementHistory = result.history;
            data.measurements = result.measurements;
            nextProfile = result.profile;
            data.profile = nextProfile;
          }
        }
        data.profile = profileServices.saveProfile({ profile: nextProfile });
      } catch (error) {
        reportError('Не удалось сохранить персональные параметры', error);
        return;
      }

      let planError = null;
      try {
        syncPlanCalculations(true);
      } catch (error) {
        planError = error;
      }
      closeModal();
      render();
      if (planError) {
        reportError('Профиль сохранён, но план не удалось пересчитать', planError);
      } else {
        showToast('Персональные параметры обновлены');
      }
    });
  }

  function openWeightModal(editDate = null) {
    const record = editDate
      ? data.weightHistory.find((item) => item.date === editDate)
      : null;
    if (editDate && !record) {
      showToast('Запись веса не найдена');
      return;
    }
    const editing = Boolean(record);
    openModal(
      editing ? 'Изменить измерение веса' : 'Добавить измерение веса',
      ui.renderWeightModalBody({ editing, record, history: data.weightHistory, today }),
      `${editing ? '<button class="btn" id="weight-history-from-edit">История</button>' : ''}<div style="display:flex;gap:8px;margin-left:auto"><button class="btn" id="weight-cancel">Отмена</button><button class="btn-primary" id="weight-save">Сохранить</button></div>`
    );
    document.getElementById('weight-cancel').addEventListener('click', closeModal);
    if (editing) {
      document.getElementById('weight-history-from-edit').addEventListener('click', openWeightHistoryModal);
    }
    document.getElementById('weight-save').addEventListener('click', () => {
      const weight = Number(document.getElementById('weight-value').value);
      const date = document.getElementById('weight-date').value;
      if (!Number.isFinite(weight) || weight <= 0 || weight > 500) {
        showToast('Укажи корректный вес');
        return;
      }
      if (!isValidDateKey(date) || date > today) {
        showToast('Выбери сегодняшнюю или прошедшую дату');
        return;
      }
      if (editing && data.weightHistory.some((item) => item.date === date && item.date !== record.date)) {
        showToast('На эту дату уже есть измерение. Выбери другую дату.');
        return;
      }
      try {
        const result = bodyHistoryServices.weight.saveRecord({
          history: data.weightHistory,
          profile: data.profile,
          weight,
          date,
          previousDate: editing ? record.date : undefined,
          today
        });
        data.weightHistory = result.history;
        data.profile = result.profile;
        closeModal();
        renderCurrentPage();
        showToast(editing ? 'Измерение обновлено' : 'Вес сохранён в истории');
      } catch (error) {
        reportError('Не удалось сохранить вес', error);
      }
    });
  }

  function openWeightHistoryModal() {
    const history = [...data.weightHistory].sort((left, right) => right.date.localeCompare(left.date));
    const body = ui.renderWeightHistoryBody({ history, readableDate });
    openModal(
      'История веса',
      `<div class="field-help" style="margin-bottom:12px">Записи фактического веса по датам. Изменение целевого веса здесь не отображается.</div>${body}`,
      '<button class="btn" id="weight-history-close">Закрыть</button><button class="btn-primary" id="weight-history-add">Добавить измерение</button>'
    );
    document.getElementById('weight-history-close').addEventListener('click', closeModal);
    document.getElementById('weight-history-add').addEventListener('click', () => openWeightModal());
    document.querySelectorAll('[data-edit-weight]').forEach((button) => {
      button.addEventListener('click', () => openWeightModal(button.dataset.editWeight));
    });
    document.querySelectorAll('[data-delete-weight]').forEach((button) => {
      button.addEventListener('click', () => deleteWeightRecord(button.dataset.deleteWeight));
    });
  }

  function deleteWeightRecord(date) {
    try {
      const result = bodyHistoryServices.weight.deleteRecord({
        history: data.weightHistory,
        profile: data.profile,
        date,
        today
      });
      if (!result.removed) return;
      data.weightHistory = result.history;
      data.profile = result.profile;
      closeModal();
      renderCurrentPage();
      showToast('Измерение удалено', 'Отменить', () => {
        try {
          const restored = bodyHistoryServices.weight.restoreRecord({
            history: data.weightHistory,
            profile: data.profile,
            record: result.removed,
            today
          });
          data.weightHistory = restored.history;
          data.profile = restored.profile;
          renderCurrentPage();
          showToast('Измерение восстановлено');
        } catch (error) {
          reportError('Не удалось восстановить измерение веса', error);
        }
      });
    } catch (error) {
      reportError('Не удалось удалить измерение веса', error);
    }
  }

  function buildMeasurementRatios(values) {
    const value = (name) => measurementValue(name, values);
    const results = [];
    const add = (label, result, detail) => {
      if (result !== null && result !== undefined && result !== '') {
        results.push({ label, value: result, detail });
      }
    };
    const format = (number) => number.toFixed(1).replace('.', ',');
    const pairs = [
      ['Бицепс', 'Бицепс — левая рука', 'Бицепс — правая рука'],
      ['Предплечье', 'Предплечье — левая рука', 'Предплечье — правая рука'],
      ['Бедро', 'Бедро — левая нога', 'Бедро — правая нога'],
      ['Икра', 'Икра — левая нога', 'Икра — правая нога']
    ];
    pairs.forEach(([label, leftName, rightName]) => {
      const left = value(leftName);
      const right = value(rightName);
      const difference = symmetryDifference(left, right);
      if (difference) {
        add(
          `${label}: левая / правая`,
          `${format(difference.cm)} см`,
          `Разница ${format(difference.percent)}% · ${format(left)} / ${format(right)} см`
        );
      }
    });
    const height = Number(values.height) || Number(data.profile.height);
    const ratios = measurementRatios(values, height);
    add('Бицепс / предплечье', ratios.armToForearm === null ? null : `${format(ratios.armToForearm)}%`, 'Среднее значение по обеим рукам');
    add('Бедро / икра', ratios.thighToCalf === null ? null : `${format(ratios.thighToCalf)}%`, 'Среднее значение по обеим ногам');
    add('Плечи / талия', ratios.shoulderToWaist === null ? null : `${format(ratios.shoulderToWaist)}%`, 'Соотношение объёма плеч и талии');
    add('Талия / бёдра', ratios.waistToHips === null ? null : `${format(ratios.waistToHips)}%`, 'Отношение окружности талии к бёдрам');
    add('Талия / рост', ratios.waistToHeight === null ? null : `${format(ratios.waistToHeight)}%`, 'Ориентир: менее 50% роста');
    return results;
  }

  function ratioMarkup(values) {
    const ratios = buildMeasurementRatios(values);
    if (!ratios.length) return '<div class="history-empty">Пока недостаточно данных для расчётов</div>';
    return ratios.map((ratio) => (
      `<div class="ratio-card"><strong>${escapeHtml(ratio.label)}</strong><b>${escapeHtml(ratio.value)}</b><small>${escapeHtml(ratio.detail)}</small></div>`
    )).join('');
  }

  function openMeasurementModal(editDate = null) {
    const snapshot = editDate
      ? data.measurementHistory.find((item) => item.date === editDate)
      : null;
    if (editDate && !snapshot) {
      showToast('Замер не найден');
      return;
    }
    const latest = getLatestMeasurementRecord(data.measurementHistory);
    const values = snapshot
      ? {
        ...snapshot.values,
        height: snapshot.date === latest?.date
          ? data.profile.height
          : Number(snapshot.values.height) || data.profile.height
      }
      : {
        ...Object.fromEntries(data.measurements.map((item) => [item.name, item.value])),
        height: data.profile.height
      };
    const date = snapshot ? snapshot.date : today;
    openModal(
      snapshot ? 'Изменить замеры' : 'Замеры тела',
      ui.renderMeasurementModalBody({
        today,
        date,
        profileHeight: data.profile.height,
        values,
        measurements: MEASUREMENT_DEFINITIONS,
        ratioMarkup: ratioMarkup(values)
      }),
      '<button class="btn" id="measure-history">История замеров</button><div style="display:flex;gap:8px;margin-left:auto"><button class="btn" id="measure-cancel">Отмена</button><button class="btn-primary" id="measure-save">Сохранить</button></div>'
    );
    document.querySelector('.modal').classList.add('measurements-modal');
    const updateRatios = () => {
      const current = Object.fromEntries(
        [...document.querySelectorAll('[data-measure-name]')].map((input) => [
          input.dataset.measureName,
          Number(input.value) || null
        ])
      );
      current.height = Number(document.getElementById('measure-height').value) || null;
      document.getElementById('measure-ratios').innerHTML = ratioMarkup(current);
    };
    document.querySelectorAll('[data-measure-name]').forEach((input) => {
      input.addEventListener('input', updateRatios);
    });
    document.getElementById('measure-height').addEventListener('input', updateRatios);
    document.getElementById('measure-cancel').addEventListener('click', closeModal);
    document.getElementById('measure-history').addEventListener('click', openMeasurementHistoryModal);
    document.getElementById('measure-save').addEventListener('click', () => {
      const date = document.getElementById('measure-date').value;
      if (!isValidDateKey(date) || date > today) {
        showToast('Выбери сегодняшнюю или прошедшую дату');
        return;
      }
      const heightRaw = document.getElementById('measure-height').value.trim();
      const height = Number(heightRaw);
      if (!heightRaw || !Number.isFinite(height) || height < 80 || height > 250) {
        showToast('Укажи корректный рост от 80 до 250 см');
        return;
      }
      const nextValues = { height };
      let invalid = false;
      document.querySelectorAll('[data-measure-name]').forEach((input) => {
        const raw = input.value.trim();
        const number = Number(raw);
        if (!raw) nextValues[input.dataset.measureName] = null;
        else if (!Number.isFinite(number) || number <= 0 || number > 300) invalid = true;
        else nextValues[input.dataset.measureName] = number;
      });
      if (invalid) {
        showToast('Проверь значения замеров: допустимы числа от 0 до 300 см');
        return;
      }
      try {
        const result = bodyHistoryServices.measurements.saveSnapshot({
          history: data.measurementHistory,
          profile: data.profile,
          date,
          values: nextValues,
          today
        });
        data.measurementHistory = result.history;
        data.measurements = result.measurements;
        data.profile = result.profile;
        closeModal();
        renderCurrentPage();
        showToast('Замеры сохранены');
      } catch (error) {
        reportError('Не удалось сохранить замеры', error);
      }
    });
  }

  function openMeasurementHistoryModal() {
    const history = [...data.measurementHistory].sort((left, right) => right.date.localeCompare(left.date));
    const body = ui.renderMeasurementHistoryBody({ history, readableDate });
    openModal(
      'История замеров',
      `<div class="field-help" style="margin-bottom:12px">Выбери дату, чтобы открыть и при необходимости отредактировать сохранённые значения.</div>${body}`,
      '<button class="btn" id="measure-history-close">Закрыть</button><button class="btn-primary" id="measure-history-add">Добавить замер</button>'
    );
    document.getElementById('measure-history-close').addEventListener('click', closeModal);
    document.getElementById('measure-history-add').addEventListener('click', () => openMeasurementModal());
    document.querySelectorAll('[data-edit-measure-date]').forEach((button) => {
      button.addEventListener('click', () => openMeasurementModal(button.dataset.editMeasureDate));
    });
    document.querySelectorAll('[data-delete-measure-date]').forEach((button) => {
      button.addEventListener('click', () => deleteMeasurementSnapshot(button.dataset.deleteMeasureDate));
    });
  }

  function deleteMeasurementSnapshot(date) {
    try {
      const result = bodyHistoryServices.measurements.deleteSnapshot({
        history: data.measurementHistory,
        profile: data.profile,
        date,
        today
      });
      if (!result.removed) return;
      data.measurementHistory = result.history;
      data.measurements = result.measurements;
      data.profile = result.profile;
      closeModal();
      renderCurrentPage();
      showToast('Замер удалён', 'Отменить', () => {
        try {
          const restored = bodyHistoryServices.measurements.restoreSnapshot({
            history: data.measurementHistory,
            profile: data.profile,
            snapshot: result.removed,
            today
          });
          data.measurementHistory = restored.history;
          data.measurements = restored.measurements;
          data.profile = restored.profile;
          renderCurrentPage();
          showToast('Замер восстановлен');
        } catch (error) {
          reportError('Не удалось восстановить замер', error);
        }
      });
    } catch (error) {
      reportError('Не удалось удалить замер', error);
    }
  }

  function renderCurrentPage() {
    if (page.dataset.page === 'profile') render();
    else renderDiary();
  }

  function bindDiaryActions() {
    const weightButton = document.getElementById('open-weight');
    const weightHistoryButton = document.getElementById('open-weight-history');
    const measurementButton = document.getElementById('open-measures');
    if (weightButton) weightButton.addEventListener('click', () => openWeightModal());
    if (weightHistoryButton) weightHistoryButton.addEventListener('click', openWeightHistoryModal);
    if (measurementButton) measurementButton.addEventListener('click', () => openMeasurementModal());
  }

  return {
    render,
    syncPlanCalculations,
    openProfileModal,
    openWeightModal,
    openWeightHistoryModal,
    openMeasurementModal,
    bindDiaryActions
  };
}
