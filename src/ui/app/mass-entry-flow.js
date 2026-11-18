import { selectMassEntryDates } from '../../domain/mass-entry/mass-entry.model.js';
import {
  aggregateNutritionWeeks,
  getNutritionAverage
} from '../../domain/nutrition-set/nutrition-set.calculations.js';

const WEEKDAYS = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'];
const MONTHS = [
  'январь', 'февраль', 'март', 'апрель', 'май', 'июнь',
  'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'
];

function readableDate(key) {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString('ru-RU', { maximumFractionDigits: 1 });
}

function monthStart(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function createMassEntryFlow({
  document,
  ui,
  data,
  diaryServices,
  mealAddFlow,
  today,
  getSelectedDate,
  setSelectedDate,
  navigatePage,
  openModal,
  closeModal,
  showToast,
  escapeHtml
}) {
  let state = null;

  function selectedDates() {
    if (!state) return [];
    return selectMassEntryDates({
      mode: state.mode,
      rangeStart: state.rangeStart,
      rangeEnd: state.rangeEnd,
      selectedDays: state.selectedDays,
      today
    });
  }

  function openMassDialog(dialog) {
    openModal(dialog.title, dialog.body, dialog.actions, cancel);
    document.querySelector('.modal').classList.add('mass-entry-modal');
  }

  function start() {
    const [year, month, day] = getSelectedDate().split('-').map(Number);
    state = {
      mode: 'range',
      rangeStart: '',
      rangeEnd: '',
      selectedDays: [],
      dates: [],
      calendarMonth: monthStart(new Date(year, month - 1, day)),
      source: null,
      collisionMode: 'skip',
      calorieMode: 'daily',
      calorieInput: '',
      selectedSetId: '',
      selectedSet: null,
      libraryItems: []
    };
    openDatePicker();
  }

  function renderDateCalendar() {
    if (!state) return;
    const month = state.calendarMonth;
    const year = month.getFullYear();
    const monthIndex = month.getMonth();
    const firstWeekday = (new Date(year, monthIndex, 1).getDay() + 6) % 7;
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    const selected = new Set(selectedDates());
    const todayDate = new Date(`${today}T00:00:00`);
    const todayMonth = monthStart(todayDate);
    const blanks = Array.from({ length: firstWeekday }, () => '<span aria-hidden="true"></span>').join('');
    const cells = Array.from({ length: daysInMonth }, (_, index) => {
      const key = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(index + 1).padStart(2, '0')}`;
      const isSelected = selected.has(key);
      const isStart = state.mode === 'range' && key === state.rangeStart;
      const isEnd = state.mode === 'range' && key === state.rangeEnd;
      const inRange = state.mode === 'range'
        && state.rangeStart
        && state.rangeEnd
        && key > state.rangeStart
        && key < state.rangeEnd;
      const filled = data.diaryEntries.some((entry) => entry.date === key);
      const classes = [
        'mass-entry-calendar-day',
        isSelected ? 'is-selected' : '',
        inRange ? 'in-range' : '',
        isStart ? 'range-start' : '',
        isEnd ? 'range-end' : '',
        key === today ? 'is-today' : '',
        filled ? 'is-filled' : ''
      ].filter(Boolean).join(' ');
      return `<button type="button" class="${classes}" data-mass-date="${key}" ${key > today ? 'disabled' : ''} aria-pressed="${isSelected}" title="${filled ? 'В этот день уже есть записи' : ''}">${index + 1}</button>`;
    }).join('');
    const dates = selectedDates();
    const summary = !dates.length
      ? 'Даты не выбраны'
      : state.mode === 'range' && dates.length > 1
        ? `${readableDate(dates[0])} — ${readableDate(dates[dates.length - 1])}`
        : `Выбрано дней: ${dates.length}`;
    document.getElementById('mass-calendar-title').textContent = `${MONTHS[monthIndex]} ${year}`;
    document.getElementById('mass-calendar-grid').innerHTML = `${WEEKDAYS.map((day) => `<span class="mass-entry-calendar-weekday">${day}</span>`).join('')}${blanks}${cells}`;
    document.getElementById('mass-date-summary').innerHTML = `<span>${escapeHtml(summary)}</span><strong>${dates.length} дн.</strong>`;
    document.getElementById('mass-date-continue').disabled = !dates.length;

    document.querySelectorAll('[data-mass-date]').forEach((button) => {
      button.addEventListener('click', () => {
        const key = button.dataset.massDate;
        if (key > today) return;
        if (state.mode === 'days') {
          const next = new Set(state.selectedDays);
          if (next.has(key)) next.delete(key);
          else next.add(key);
          state.selectedDays = [...next].sort();
        } else if (!state.rangeStart || state.rangeEnd) {
          state.rangeStart = key;
          state.rangeEnd = '';
        } else if (key < state.rangeStart) {
          state.rangeEnd = state.rangeStart;
          state.rangeStart = key;
        } else {
          state.rangeEnd = key;
        }
        state.dates = selectedDates();
        renderDateCalendar();
      });
    });
    document.getElementById('mass-calendar-prev').addEventListener('click', () => {
      state.calendarMonth = new Date(year, monthIndex - 1, 1);
      renderDateCalendar();
    });
    const nextMonthButton = document.getElementById('mass-calendar-next');
    const nextMonth = new Date(year, monthIndex + 1, 1);
    nextMonthButton.disabled = nextMonth > todayMonth;
    nextMonthButton.addEventListener('click', () => {
      if (nextMonth > todayMonth) return;
      state.calendarMonth = nextMonth;
      renderDateCalendar();
    });
  }

  function openDatePicker() {
    if (!state) return;
    const dialog = ui.renderMassDatePickerModal({ mode: state.mode });
    openMassDialog(dialog);
    document.getElementById('mass-date-cancel').addEventListener('click', cancel);
    document.querySelectorAll('[data-mass-mode]').forEach((button) => {
      button.addEventListener('click', () => {
        const nextMode = button.dataset.massMode;
        if (nextMode === state.mode) return;
        const dates = selectedDates();
        state.mode = nextMode;
        if (nextMode === 'days') {
          state.selectedDays = dates;
          state.rangeStart = '';
          state.rangeEnd = '';
        } else {
          state.rangeStart = dates[0] || '';
          state.rangeEnd = dates.length > 1 ? dates[dates.length - 1] : '';
          state.selectedDays = [];
        }
        openDatePicker();
      });
    });
    renderDateCalendar();
    document.getElementById('mass-date-continue').addEventListener('click', () => {
      state.dates = selectedDates();
      if (state.dates.length) openSourceStep();
    });
  }

  function openSourceStep() {
    if (!state) return;
    const dates = selectedDates();
    state.dates = dates;
    const dialog = ui.renderMassSourceModal({ count: dates.length });
    openMassDialog(dialog);
    document.getElementById('mass-source-back').addEventListener('click', openDatePicker);
    document.getElementById('mass-source-cancel').addEventListener('click', cancel);
    document.querySelectorAll('[data-mass-source]').forEach((button) => {
      button.addEventListener('click', () => {
        state.source = button.dataset.massSource;
        if (state.source === 'calories') openCaloriesConfig();
        else if (state.source === 'library') openLibrarySelection();
        else openSetConfig();
      });
    });
  }

  function openCaloriesConfig() {
    if (!state) return;
    const dialog = ui.renderMassCaloriesModal({
      mode: state.calorieMode,
      value: state.calorieInput,
      dateCount: state.dates.length,
      escapeHtml
    });
    openMassDialog(dialog);
    document.getElementById('mass-calorie-back').addEventListener('click', openSourceStep);
    document.querySelectorAll('[data-mass-calorie-mode]').forEach((button) => {
      button.addEventListener('click', () => {
        state.calorieInput = document.getElementById('mass-calorie-value').value;
        state.calorieMode = button.dataset.massCalorieMode;
        openCaloriesConfig();
      });
    });
    document.getElementById('mass-calorie-preview').addEventListener('click', () => {
      const input = document.getElementById('mass-calorie-value');
      const calories = Number(input.value);
      if (!Number.isFinite(calories) || calories <= 0 || calories > 1000000) {
        showToast('Укажи количество калорий от 1 до 1 000 000');
        input.focus();
        return;
      }
      state.calorieInput = String(calories);
      openPreview();
    });
  }

  function setDailyData(set) {
    const aggregate = aggregateNutritionWeeks(set?.weeks || [], data.recipes, data.products);
    const average = getNutritionAverage(aggregate, 28);
    return { aggregate, average };
  }

  function openSetConfig() {
    if (!state) return;
    const sets = Array.isArray(data.nutritionSets) ? data.nutritionSets : [];
    const rows = sets.map((set) => {
      const { aggregate, average } = setDailyData(set);
      const disabled = !aggregate.recipeCount;
      const selected = String(state.selectedSetId) === String(set.id);
      const totals = average.totals;
      const detail = disabled
        ? 'Нет рецептов для расчёта'
        : `${formatNumber(totals.kcal)} ккал в день · Б ${formatNumber(totals.p)} · Ж ${formatNumber(totals.f)} · У ${formatNumber(totals.c)}${set.comment ? ` · ${escapeHtml(set.comment)}` : ''}`;
      return `<button type="button" class="mass-entry-choice ${selected ? 'is-selected' : ''}" data-mass-set="${escapeHtml(set.id)}" ${disabled ? 'disabled' : ''}><span class="mass-entry-choice-icon">▦</span><span class="mass-entry-choice-copy"><strong>${escapeHtml(set.name)}</strong><small>${detail}</small></span><b aria-hidden="true">${selected ? '✓' : '›'}</b></button>`;
    }).join('');
    const hasAny = sets.some((set) => setDailyData(set).aggregate.recipeCount > 0);
    const dialog = ui.renderMassSetModal({ rows, hasAny });
    openMassDialog(dialog);
    document.getElementById('mass-set-back').addEventListener('click', openSourceStep);
    document.querySelectorAll('[data-mass-set]').forEach((button) => {
      button.addEventListener('click', () => {
        state.selectedSetId = button.dataset.massSet;
        state.selectedSet = sets.find((set) => String(set.id) === String(state.selectedSetId)) || null;
        openSetConfig();
      });
    });
    const previewButton = document.getElementById('mass-set-preview');
    previewButton.disabled = !state.selectedSet;
    previewButton.addEventListener('click', openPreview);
  }

  function openLibrarySelection() {
    if (!state) return;
    mealAddFlow.startMassLibrary({
      dates: state.dates,
      onSave: (items) => {
        state.libraryItems = items;
        openPreview();
      },
      onDismiss: cancel
    });
    document.querySelector('.modal').classList.add('mass-entry-modal');
  }

  function requestOptions() {
    if (!state) throw new Error('Mass-entry flow is not active.');
    const request = {
      entries: data.diaryEntries,
      dates: state.dates,
      source: state.source,
      collisionMode: state.collisionMode,
      today
    };
    if (state.source === 'calories') {
      return {
        ...request,
        calorieMode: state.calorieMode,
        calories: Number(state.calorieInput)
      };
    }
    if (state.source === 'library') {
      return {
        ...request,
        items: state.libraryItems,
        recipes: data.recipes,
        products: data.products
      };
    }
    if (state.source === 'set') {
      return {
        ...request,
        set: state.selectedSet,
        setId: state.selectedSetId,
        sets: data.nutritionSets,
        recipes: data.recipes,
        products: data.products
      };
    }
    throw new TypeError('Mass-entry source is not selected.');
  }

  function openPreview() {
    if (!state) return;
    let request;
    let preview;
    try {
      request = requestOptions();
      preview = diaryServices.massEntry.preview(request);
    } catch (error) {
      console.error('Не удалось подготовить массовую запись', error);
      showToast(error instanceof Error ? error.message : 'Не удалось рассчитать предпросмотр');
      return;
    }
    const { dates, filledDates, dailyTotals } = preview;
    let sourceTitle = 'Только калории';
    let content;
    if (state.source === 'calories') {
      content = `<div class="mass-entry-preview-row"><span>Калорийность в день</span><strong>${formatNumber(dailyTotals.kcal)} ккал</strong></div><div class="mass-entry-preview-row"><span>Всего за выбранные даты</span><strong>${formatNumber(preview.totalKcal)} ккал</strong></div><div class="mass-entry-warning">БЖУ и микронутриенты не определены. Запись учитывается в калорийности, но не как нулевое содержание нутриентов.</div>`;
    } else if (state.source === 'library') {
      sourceTitle = 'Библиотека питания';
      const meals = new Set(state.libraryItems.map((item) => item.meal || 'Завтрак'));
      content = `<div class="mass-entry-warning">Ежедневный рацион будет повторён на все выбранные даты. Количество каждой позиции указано на один день.</div><div class="mass-entry-preview-row"><span>Позиции рациона</span><strong>${state.libraryItems.length}</strong></div><div class="mass-entry-preview-row"><span>Приёмы пищи</span><strong>${meals.size}</strong></div><div class="mass-entry-preview-row"><span>Калорийность в день</span><strong>${formatNumber(dailyTotals.kcal)} ккал</strong></div><div class="mass-entry-preview-row"><span>Б / Ж / У в день</span><strong>${formatNumber(dailyTotals.p)} / ${formatNumber(dailyTotals.f)} / ${formatNumber(dailyTotals.c)} г</strong></div>`;
    } else {
      sourceTitle = `Набор: ${state.selectedSet?.name || 'не выбран'}`;
      const { aggregate } = setDailyData(state.selectedSet);
      content = `<div class="mass-entry-preview-row"><span>Калорийность в день</span><strong>${formatNumber(dailyTotals.kcal)} ккал</strong></div><div class="mass-entry-preview-row"><span>Б / Ж / У в день</span><strong>${formatNumber(dailyTotals.p)} / ${formatNumber(dailyTotals.f)} / ${formatNumber(dailyTotals.c)} г</strong></div><div class="mass-entry-preview-row"><span>Рецептов в исходном наборе</span><strong>${aggregate.recipeCount}</strong></div><div class="mass-entry-warning">Суточное значение рассчитано как среднее по четырём неделям набора. Приложение не распределяет его по приёмам пищи.</div>`;
    }
    const collisionOptions = [
      ['skip', `Пропустить заполненные дни (${filledDates.length})`],
      ['append', 'Дополнить существующие записи'],
      ['replace', 'Заменить питание за эти дни']
    ].map(([value, label]) => (
      `<option value="${value}" ${state.collisionMode === value ? 'selected' : ''}>${label}</option>`
    )).join('');
    const periodLabel = `${readableDate(dates[0])}${dates.length > 1 ? ` — ${readableDate(dates[dates.length - 1])}` : ''}`;
    const dialog = ui.renderMassEntryPreviewModal({
      periodLabel,
      dateCount: dates.length,
      sourceTitle,
      content,
      conflictOptionsMarkup: collisionOptions,
      collision: state.collisionMode,
      toWrite: preview.daysToWrite,
      skippedCount: preview.skippedDates.length,
      escapeHtml
    });
    openMassDialog(dialog);
    document.getElementById('mass-preview-back').addEventListener('click', returnToSource);
    document.getElementById('mass-collision-mode').addEventListener('change', (event) => {
      state.collisionMode = event.currentTarget.value;
      openPreview();
    });
    document.getElementById('mass-entry-apply').addEventListener('click', apply);
  }

  function returnToSource() {
    if (!state) return;
    if (state.source === 'calories') openCaloriesConfig();
    else if (state.source === 'set') openSetConfig();
    else {
      mealAddFlow.showPlate();
      document.querySelector('.modal').classList.add('mass-entry-modal');
    }
  }

  function apply() {
    if (!state) return;
    const applyButton = document.getElementById('mass-entry-apply');
    if (applyButton) applyButton.disabled = true;
    let result;
    try {
      const request = requestOptions();
      const preview = diaryServices.massEntry.preview(request);
      if (!preview.targetDates.length) {
        if (applyButton) applyButton.disabled = false;
        showToast('Все выбранные дни уже заполнены. Измени обработку заполненных дней или даты.');
        return;
      }
      const usedIds = new Set(data.diaryEntries.map((entry) => String(entry.id)));
      let nextId = Date.now() + Math.floor(Math.random() * 100000);
      const idFactory = () => {
        while (usedIds.has(String(nextId))) nextId += 1;
        const id = nextId;
        usedIds.add(String(id));
        nextId += 1;
        return id;
      };
      result = diaryServices.massEntry.apply({ ...request, idFactory });
      data.diaryEntries = result.entries;
    } catch (error) {
      if (applyButton) applyButton.disabled = false;
      console.error('Не удалось применить массовую запись', error);
      showToast(error instanceof Error ? error.message : 'Не удалось сохранить массовую запись');
      return;
    }

    const targetDates = result.dates;
    const latest = [...targetDates].sort().at(-1);
    if (state.source === 'library') {
      result.created.forEach((entry) => expandedMeals.add(entry.meal));
    }
    const message = `Создано записей: ${result.created.length} · дней: ${targetDates.length}${state.collisionMode === 'skip' && result.skippedDates.length ? ` · пропущено: ${result.skippedDates.length}` : ''}`;
    state = null;
    mealAddFlow.finishMassFlow();
    document.querySelector('.modal').classList.remove('mass-entry-modal');
    closeModal(false);
    setSelectedDate(latest);
    showToast(message);
  }

  function cancel() {
    if (!state) return;
    state = null;
    mealAddFlow.finishMassFlow();
    document.querySelector('.modal').classList.remove('mass-entry-modal');
    closeModal(false);
    navigatePage('diary');
  }

  return { start, cancel };
}
