import { getNutritionAverage, getNutritionPeriodStats, getNutritionSetFoodGroupCount, getNutritionWeekGoalStats, getPersonalWeeklyGoal, recipeMatchesFoodGroup, WEEKLY_FOOD_GROUPS, aggregateNutritionWeeks } from '../../domain/nutrition-set/nutrition-set.calculations.js';
import { emptyNutritionWeek, getActiveNutritionSet, getPlannerWeekCompletion, normalizeNutritionSet, normalizeNutritionWeek, withNutritionSetWeeklyGoals } from '../../domain/nutrition-set/nutrition-set.model.js';
import { calculateRecipeNutrition } from '../../domain/shared/nutrient-calculations.js';
import { getMealNutritionTargets } from '../../domain/diary/diary-calculations.js';
import { getAggregateMicronutrientStats } from '../../domain/statistics/diary-statistics.js';
import { defaultGoalAdjustment, normalizeEnergyAdjustment, normalizeGoalLabel } from '../../domain/planning/plan.model.js';
import { todayLocalDate } from '../../domain/shared/date-utils.js';

const MONTH_NAMES = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

function plannerWeekDates() {
  const today = todayLocalDate();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7) - 7);
  return Array.from({ length: 4 }, (_, index) => {
    const weekStart = new Date(start);
    weekStart.setDate(start.getDate() + index * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const sameMonth = weekStart.getMonth() === weekEnd.getMonth()
      && weekStart.getFullYear() === weekEnd.getFullYear();
    const sameYear = weekStart.getFullYear() === weekEnd.getFullYear();
    if (sameMonth) return `${weekStart.getDate()}–${weekEnd.getDate()} ${MONTH_NAMES[weekEnd.getMonth()]}`;
    if (sameYear) {
      return `${weekStart.getDate()} ${MONTH_NAMES[weekStart.getMonth()]} – ${weekEnd.getDate()} ${MONTH_NAMES[weekEnd.getMonth()]}`;
    }
    return `${weekStart.getDate()} ${MONTH_NAMES[weekStart.getMonth()]} ${weekStart.getFullYear()} – ${weekEnd.getDate()} ${MONTH_NAMES[weekEnd.getMonth()]} ${weekEnd.getFullYear()}`;
  });
}

function deepCopy(value) {
  return JSON.parse(JSON.stringify(value));
}

function formatPlannerNumber(value) {
  return Math.round(Number(value || 0)).toLocaleString('ru-RU');
}

export function createPlanningFlow({
  document,
  ui,
  data,
  services,
  mealAddFlow,
  navigatePage,
  openProfile,
  openModal,
  closeModal,
  showToast,
  escapeHtml
}) {
  const page = document.getElementById('page');
  const state = {
    selectedWeek: 1,
    period: 'day',
    createDraft: null,
    createSkippedWeeks: [false, false, false, false],
    createPreviousActiveId: '',
    editDraft: null,
    editOriginal: null,
    weekDraft: null,
    weekIndex: null,
    dishCounter: 0
  };

  function reportError(action, error) {
    console.error(action, error);
    showToast(error instanceof Error ? error.message : 'Не удалось выполнить операцию планирования');
  }

  function setHeader() {
    document.getElementById('page-title').textContent = 'Планирование';
    document.getElementById('page-subtitle').textContent = 'Составление плана питания';
  }

  function currentSet() {
    return getActiveNutritionSet(data.nutritionSets, data.activeNutritionSetId);
  }

  function draftForId(id) {
    if (state.createDraft && String(state.createDraft.id) === String(id)) return state.createDraft;
    if (state.editDraft && String(state.editDraft.id) === String(id)) return state.editDraft;
    return data.nutritionSets.find((set) => String(set.id) === String(id)) || null;
  }

  function getPlanCalculation(plan = data.plan) {
    return services.recalculatePlan({ profile: data.profile, plan });
  }

  function getTargets() {
    const calculated = getPlanCalculation();
    return {
      calculation: calculated.targets,
      plan: calculated.plan,
      kcal: calculated.targets?.kcal ?? (Number(data.plan.kcal) || 0),
      protein: calculated.targets?.protein ?? (Number(data.plan.p) || 0),
      fat: calculated.targets?.fat ?? (Number(data.plan.f) || 0),
      carbs: calculated.targets?.carbs ?? (Number(data.plan.c) || 0)
    };
  }

  function recipeSummary(recipe) {
    if (!recipe) return 'Заполни в режиме редактирования';
    const nutrition = calculateRecipeNutrition(recipe, data.products);
    const warnings = nutrition.missingProducts.length + nutrition.conversionIssues.length;
    return `${formatPlannerNumber(nutrition.total.kcal)} ккал · весь рецепт${warnings ? ' · неполный состав' : ''}`;
  }

  function renderCategoryRows(week, weekNumber, set) {
    const stats = getNutritionWeekGoalStats(week, set, data.recipes, data.products, WEEKLY_FOOD_GROUPS);
    return stats.map((stat) => {
      const { group, count, items, personalTarget, completionTarget, completionPercent } = stat;
      const completionText = stat.completionReached
        ? 'Цель достигнута'
        : count ? `Не хватает ${stat.completionRemaining}` : 'Пока нет блюд';
      const diversityText = !stat.diversityTarget
        ? 'Личная цель не задана'
        : stat.diversityReached
          ? 'Цель достигнута'
          : `Не хватает ${stat.diversityRemaining}`;
      return `<div class="planner48-category-row">
   <div class="planner48-category-name"><div class="planner48-category-title-line"><b>${escapeHtml(group.label)}</b><button type="button" class="planner48-category-add" data-planner-category-add="${escapeHtml(group.id)}" data-planner-category-week="${weekNumber}" aria-label="Подобрать рецепты: ${escapeHtml(group.label)}" title="Подобрать рецепты">＋</button></div><small>Справочный ориентир: ${escapeHtml(group.reference)}</small>${personalTarget ? `<small class="planner48-personal-goal-label">Моя цель: ${personalTarget} блюд / неделю</small>` : ''}</div>
   <div class="planner48-category-frequency"><b>${count} / ${completionTarget} блюд</b><div class="planner48-track"><i style="width:${completionPercent}%"></i></div><small class="${stat.completionReached ? '' : 'is-low-text'}">${completionText}</small></div>
   <div class="planner48-category-diversity">${stat.diversityTarget ? `<b>${items.size} / ${stat.diversityTarget}</b><div class="planner48-track"><i style="width:${stat.diversityPercent}%"></i></div><small class="${stat.diversityReached ? '' : 'is-low-text'}">${diversityText}</small>` : `<b>${items.size}</b><small>разных продуктов</small><small class="planner48-personal-goal-empty">Личная цель не задана</small>`}</div>
  </div>`;
    }).join('');
  }

  function renderNutrientRows(items) {
    if (!items.length) return '<div class="field-help">В рецептах выбранного периода пока нет заполненных значений.</div>';
    return items.map((item) => {
      const percent = item.percent;
      const bar = percent === null ? 0 : Math.min(100, percent);
      return `<div class="planner48-nutrient-row"><div class="planner48-nutrient-copy"><span>${escapeHtml(item.name)}</span><small>${formatPlannerNumber(item.dailyAmount)} ${escapeHtml(item.unit)} / день</small></div><div class="planner48-nutrient-meter"><i class="${percent !== null && percent < 75 ? 'is-low' : percent !== null && percent > 120 ? 'is-high' : ''}" style="width:${bar}%"></i></div><b class="${percent !== null && percent < 75 ? 'is-low-text' : ''}">${percent === null ? '—' : `${percent}%`}</b></div>`;
    }).join('');
  }

  function renderMealTargets(daily, targets) {
    return getMealNutritionTargets(daily, targets, data.profile).map((mealTarget) => (
      `<article class="planner-meal-target-card"><div class="planner-meal-target-head"><strong>${escapeHtml(mealTarget.meal)}</strong><span class="planner-meal-share">${mealTarget.sharePercent}% рациона</span></div><div class="planner-meal-target-kcal">${formatPlannerNumber(mealTarget.kcal)} <span>ккал / день</span></div><div class="planner-meal-target-macros"><span class="tag">Б ${formatPlannerNumber(mealTarget.protein)} г</span><span class="tag">Ж ${formatPlannerNumber(mealTarget.fat)} г</span><span class="tag">У ${formatPlannerNumber(mealTarget.carbs)} г</span></div>${targets.calculation ? `<div class="metric-foot">Цель: ${formatPlannerNumber(mealTarget.targetKcal)} ккал / день</div>` : ''}</article>`
    )).join('');
  }

  function renderAnalytics(week, selectedWeek, targets, dates) {
    const aggregate = aggregateNutritionWeeks([week || emptyNutritionWeek()], data.recipes, data.products);
    const periodStats = getNutritionPeriodStats(aggregate, targets, state.period);
    const daily = periodStats.dailyTotals;
    const period = state.period === 'week'
      ? {
        source: periodStats.totals,
        targetDays: periodStats.days,
        label: `Неделя ${selectedWeek} · итог за 7 дней`,
        valueUnit: 'ккал / неделю',
        heading: 'ЭНЕРГИЯ ЗА НЕДЕЛЮ'
      }
      : {
        source: periodStats.totals,
        targetDays: periodStats.days,
        label: `Неделя ${selectedWeek} · среднее за сутки`,
        valueUnit: 'ккал / сутки',
        heading: 'СРЕДНЯЯ ЭНЕРГИЯ ЗА ДЕНЬ'
      };
    const selectedPeriod = period.source;
    const targetKcalPeriod = periodStats.targetKcal;
    const macroNames = { p: 'Белки', f: 'Жиры', c: 'Углеводы' };
    const macroMarkup = periodStats.macros.map((item) => {
      return `<div class="planner48-macro-item"><div class="planner48-macro-head"><span>${macroNames[item.key]}</span><b>${formatPlannerNumber(item.actual)} <small>/ ${formatPlannerNumber(item.target)} г</small></b></div><div class="planner48-track"><i style="width:${Math.min(100, item.percent || 0)}%"></i></div><small class="planner48-macro-delta">${item.percent === null ? 'Нет персональной цели' : `${item.percent}% от цели`}</small></div>`;
    }).join('');
    const nutrients = getAggregateMicronutrientStats(aggregate, 7, data.profile);
    const missingDataCount = aggregate.missingDataCount;
    const footParts = [
      'КБЖУ рассчитывается по полному выходу каждого рецепта, включённого в выбранную неделю.',
      state.period === 'day'
        ? 'Среднее за сутки получено делением суммы блюд недели на все 7 календарных дней.'
        : 'Показаны суммарные значения выбранной недели.'
    ];
    if (missingDataCount) {
      footParts.push(`Есть неполные позиции состава или недоступные рецепты (${missingDataCount}); отсутствующая пищевая ценность не включена в расчёт.`);
    }
    if (!aggregate.recipeCount) footParts.push('Добавь рецепты в выбранную неделю, чтобы получить фактические показатели.');
    return ui.renderPlannerCategoryAndMeals({
      activeSet: currentSet(),
      selectedWeek,
      categoryMarkup: renderCategoryRows(week || emptyNutritionWeek(), selectedWeek, currentSet()),
      period: {
        ...period,
        mode: state.period,
        kcalText: formatPlannerNumber(selectedPeriod.kcal || 0),
        targetText: formatPlannerNumber(targetKcalPeriod)
      },
      periodData: selectedPeriod,
      targetKcalPeriod,
      rdaText: nutrients.averageCoverage === null ? '—' : `${nutrients.averageCoverage}%`,
      nutrientStats: nutrients,
      macroMarkup,
      vitaminMarkup: renderNutrientRows(nutrients.vitamins),
      mineralMarkup: renderNutrientRows(nutrients.minerals),
      nutritionFootText: footParts.map(escapeHtml).join(' '),
      mealCards: renderMealTargets(daily, targets),
      escapeHtml
    });
  }

  function render() {
    setHeader();
    const targets = getTargets();
    const selectedWeek = Math.max(1, Math.min(4, Number(state.selectedWeek) || 1));
    const activeSet = currentSet();
    const week = activeSet?.weeks?.[selectedWeek - 1] || null;
    const dates = plannerWeekDates();
    const setCards = data.nutritionSets.map((set, index) => {
      const aggregate = aggregateNutritionWeeks(set.weeks, data.recipes, data.products);
      const average = getNutritionAverage(aggregate, 28);
      const micronutrients = getAggregateMicronutrientStats(aggregate, 28, data.profile);
      return ui.renderNutritionSetCard({
        set,
        index,
        selected: String(set.id) === String(data.activeNutritionSetId),
        dishCount: aggregate.recipeCount,
        groupCount: getNutritionSetFoodGroupCount(set, data.recipes, data.products),
        averageKcal: average.totals.kcal,
        averageCoverage: micronutrients.averageCoverage,
        productCount: aggregate.productNames.size,
        hasWarnings: aggregate.missingDataCount > 0,
        totals: aggregate.totals,
        escapeHtml,
        fmt: formatPlannerNumber
      });
    }).join('');

    page.innerHTML = ui.renderPlanningOverview({
      plan: targets.plan,
      profile: data.profile,
      planPresets: data.planPresets,
      ready: Boolean(targets.calculation),
      calc: targets.calculation,
      targetKcal: targets.kcal,
      targetP: targets.protein,
      targetF: targets.fat,
      targetC: targets.carbs,
      fmt: formatPlannerNumber,
      locale: 'ru-RU',
      escapeHtml
    }) + `
 <section class="card planner48-library">
  <div class="planner48-section-head"><div><div class="planner48-eyebrow">01 / НАБОРЫ ПИТАНИЯ</div><h2>Библиотека наборов</h2><p>Выбери набор. Его совокупная пищевая ценность рассчитывается по блюдам всех четырёх недель.</p></div><button class="btn" id="planner-create-set">＋ Создать набор</button></div>
  <div class="planner48-set-grid">${setCards || '<div class="planner48-library-empty">Библиотека пока пуста. Создай набор, чтобы начать планирование.</div>'}</div>
  <div class="planner48-demo-note"><span class="planner48-demo-dot"></span>КБЖУ на карточках наборов — среднее за календарный день: сумма блюд всех четырёх недель делится на 28 дней.</div>
 </section>
 <section class="card planner48-week-panel">
  <div class="planner48-section-head"><div><div class="planner48-eyebrow">02 / СОСТАВ НАБОРА</div><h2>${activeSet ? `${escapeHtml(activeSet.name)} · четыре недели` : 'Набор не выбран'}</h2><p>${activeSet ? 'Выбранная неделя определяет состав и все показатели аналитики ниже.' : 'Создай новый набор или выбери существующий в библиотеке выше.'}</p></div>${activeSet ? `<div class="planner48-set-heading-actions"><span class="tag active">${selectedWeek} / 4</span></div>` : ''}</div>
  ${ui.renderPlanningWeek({
    activeSet,
    selectedWeek,
    dates,
    mainDishes: week?.mainDishes || [],
    snackDishes: week?.snacks || [],
    recipes: data.recipes,
    recipeSummary,
    escapeHtml,
    locale: 'ru-RU'
  })}
 </section>
 ${renderAnalytics(week, selectedWeek, targets, dates)}`;

    bindPlanningEvents();
  }

  function bindPlanningEvents() {
    const setup = document.getElementById('edit-setup');
    if (setup) setup.addEventListener('click', openPlanSetup);
    const savePreset = document.getElementById('plan-preset-save-open');
    if (savePreset) savePreset.addEventListener('click', openPlanPresetSave);
    const managePresets = document.getElementById('plan-presets-manage');
    if (managePresets) managePresets.addEventListener('click', openPlanPresets);
    const presetSelect = document.getElementById('plan-preset-select');
    if (presetSelect) presetSelect.addEventListener('change', (event) => {
      if (event.currentTarget.value) applyPreset(event.currentTarget.value);
    });
    const profileButton = document.getElementById('planning-open-profile');
    if (profileButton) profileButton.addEventListener('click', () => openProfile());
    const createButton = document.getElementById('planner-create-set');
    if (createButton) createButton.addEventListener('click', openCreateNutritionSet);

    page.querySelectorAll('[data-nutrition-set-select]').forEach((button) => {
      button.addEventListener('click', () => selectSet(button.dataset.nutritionSetSelect));
    });
    page.querySelectorAll('[data-nutrition-set-edit]').forEach((button) => {
      button.addEventListener('click', (event) => {
        event.stopPropagation();
        startEditNutritionSet(button.dataset.nutritionSetEdit);
      });
    });
    page.querySelectorAll('[data-nutrition-set-delete]').forEach((button) => {
      button.addEventListener('click', (event) => {
        event.stopPropagation();
        openDeleteNutritionSet(button.dataset.nutritionSetDelete);
      });
    });
    page.querySelectorAll('[data-planner-week-select]').forEach((button) => {
      button.addEventListener('click', () => {
        state.selectedWeek = Number(button.dataset.plannerWeekSelect) || 1;
        render();
      });
    });
    page.querySelectorAll('[data-edit-nutrition-week]').forEach((button) => {
      button.addEventListener('click', () => openNutritionWeekEdit(Number(button.dataset.editNutritionWeek)));
    });
    page.querySelectorAll('[data-planner-period]').forEach((button) => {
      button.addEventListener('click', () => {
        state.period = button.dataset.plannerPeriod === 'week' ? 'week' : 'day';
        render();
      });
    });
    page.querySelectorAll('[data-planner-category-add]').forEach((button) => {
      button.addEventListener('click', () => startCategoryRecipeSelection(
        button.dataset.plannerCategoryAdd,
        Number(button.dataset.plannerCategoryWeek) || state.selectedWeek
      ));
    });
    const goalsButton = document.getElementById('planner-weekly-goals-open');
    if (goalsButton) goalsButton.addEventListener('click', () => openWeeklyGoals(currentSet()?.id));
  }

  async function savePlan(nextPlan) {
    const calculated = services.recalculatePlan({ profile: data.profile, plan: nextPlan });
    const saved = services.savePlan({ plan: calculated.plan });
    data.plan = saved;
    return saved;
  }

  function openPlanSetup() {
    const normalized = getPlanCalculation().plan;
    const currentTargets = getPlanCalculation().targets;
    const goal = normalizeGoalLabel(normalized.goal);
    const adjustment = Number.isFinite(Number(normalized.energyAdjustment))
      ? Number(normalized.energyAdjustment)
      : defaultGoalAdjustment(goal);
    const calculationPreview = currentTargets
      ? `<strong>Текущая оценка: ${formatPlannerNumber(currentTargets.kcal)} ккал/день</strong><span>BMR ${formatPlannerNumber(currentTargets.bmr)} × ${currentTargets.factor.toLocaleString('ru-RU')} + ${currentTargets.adjustment} ккал</span>`
      : '<strong>Расчёт пока недоступен</strong><span>Заполни пол, дату рождения, рост, вес и активность в Профиле.</span>';
    const dialog = ui.renderPlanSetupModal({
      targetWeight: normalized.targetWeight,
      adjustment,
      proteinPerKg: normalized.proteinPerKg,
      fatPercent: normalized.fatPercent,
      calculationPreview,
      locale: 'ru-RU'
    });
    openModal(dialog.title, dialog.body, dialog.actions);
    document.getElementById('setup-goal').value = goal;
    document.getElementById('setup-goal').addEventListener('change', (event) => {
      document.getElementById('setup-adjustment').value = defaultGoalAdjustment(event.currentTarget.value);
    });
    document.getElementById('cancel-setup').addEventListener('click', () => closeModal(false));
    document.getElementById('save-setup').addEventListener('click', async () => {
      const targetWeight = Number(document.getElementById('setup-target').value);
      const adjustmentValue = Number(document.getElementById('setup-adjustment').value);
      const proteinChoice = document.getElementById('setup-protein-rate').value;
      const fatPercent = Number(document.getElementById('setup-fat-share').value);
      if (!Number.isFinite(targetWeight) || targetWeight <= 0 || targetWeight > 500) {
        showToast('Укажи корректный целевой вес');
        return;
      }
      if (!Number.isFinite(adjustmentValue) || adjustmentValue < -1500 || adjustmentValue > 1500) {
        showToast('Проверь коррекцию калорийности');
        return;
      }
      const nextGoal = normalizeGoalLabel(document.getElementById('setup-goal').value);
      const nextPlan = {
        ...data.plan,
        goal: nextGoal,
        targetWeight,
        energyAdjustment: normalizeEnergyAdjustment(nextGoal, adjustmentValue),
        proteinPerKg: proteinChoice === 'auto' ? null : Number(proteinChoice),
        fatPercent
      };
      try {
        await savePlan(nextPlan);
        closeModal(false);
        render();
        showToast('План пересчитан');
      } catch (error) {
        reportError('Не удалось сохранить план', error);
      }
    });
  }

  function openPlanPresetSave() {
    const dialog = ui.renderPlanPresetSaveModal();
    openModal(dialog.title, dialog.body, dialog.actions);
    document.getElementById('plan-preset-cancel').addEventListener('click', () => closeModal(false));
    document.getElementById('plan-preset-save').addEventListener('click', () => {
      const name = document.getElementById('plan-preset-name').value.trim();
      if (!name) {
        showToast('Укажи название пресета');
        return;
      }
      try {
        const existing = data.planPresets.find((item) => item.name.toLocaleLowerCase('ru-RU') === name.toLocaleLowerCase('ru-RU'));
        const result = services.savePlanPreset({
          presets: data.planPresets,
          name,
          plan: data.plan,
          id: existing?.id || `preset-${Date.now()}`,
          updatedAt: new Date().toISOString()
        });
        data.planPresets = result.presets;
        closeModal(false);
        render();
        showToast(existing ? 'Пресет обновлён' : 'Пресет сохранён');
      } catch (error) {
        reportError('Не удалось сохранить пресет плана', error);
      }
    });
  }

  function applyPreset(id) {
    try {
      const result = services.applyPlanPreset({
        presets: data.planPresets,
        presetId: id,
        profile: data.profile,
        plan: data.plan
      });
      data.plan = result.plan;
      render();
      showToast('Пресет применён');
    } catch (error) {
      reportError('Не удалось применить пресет плана', error);
    }
  }

  function openPlanPresets() {
    const dialog = ui.renderPlanPresetsModal({
      presets: data.planPresets,
      fmt: formatPlannerNumber,
      escapeHtml
    });
    openModal(dialog.title, dialog.body, dialog.actions);
    document.getElementById('plan-presets-close').addEventListener('click', () => closeModal(false));
    document.getElementById('modal-body').addEventListener('click', (event) => {
      const applyButton = event.target.closest('[data-preset-apply]');
      if (applyButton) {
        applyPreset(applyButton.dataset.presetApply);
        closeModal(false);
        return;
      }
      const editButton = event.target.closest('[data-preset-edit]');
      if (editButton) {
        openPlanPresetEdit(editButton.dataset.presetEdit);
        return;
      }
      const deleteButton = event.target.closest('[data-preset-delete]');
      if (deleteButton) {
        try {
          const result = services.deletePlanPreset(data.planPresets, deleteButton.dataset.presetDelete);
          data.planPresets = result.presets;
          openPlanPresets();
        } catch (error) {
          reportError('Не удалось удалить пресет плана', error);
        }
      }
    });
  }

  function openPlanPresetEdit(id) {
    const preset = data.planPresets.find((item) => String(item.id) === String(id));
    if (!preset) return;
    const dialog = ui.renderPlanPresetEditModal({ name: preset.name, escapeHtml });
    openModal(dialog.title, dialog.body, dialog.actions);
    document.getElementById('preset-rename-cancel').addEventListener('click', () => openPlanPresets());
    document.getElementById('preset-rename-save').addEventListener('click', () => {
      const name = document.getElementById('plan-preset-rename').value.trim();
      if (!name) {
        showToast('Укажи название пресета');
        return;
      }
      try {
        const result = services.renamePlanPreset(data.planPresets, preset.id, name, new Date().toISOString());
        data.planPresets = result.presets;
        openPlanPresets();
      } catch (error) {
        reportError('Не удалось переименовать пресет плана', error);
      }
    });
  }

  async function selectSet(id) {
    try {
      data.activeNutritionSetId = services.selectActiveNutritionSet({
        sets: data.nutritionSets,
        id
      });
      render();
    } catch (error) {
      reportError('Не удалось выбрать набор питания', error);
    }
  }

  function openCreateNutritionSet() {
    state.createDraft = null;
    state.createSkippedWeeks = [false, false, false, false];
    state.createPreviousActiveId = data.activeNutritionSetId;
    const dialog = ui.renderCreateNutritionSetModal();
    openModal(dialog.title, dialog.body, dialog.actions, cancelCreateNutritionSet);
    document.getElementById('nutrition-set-cancel').addEventListener('click', cancelCreateNutritionSet);
    document.getElementById('nutrition-set-next').addEventListener('click', () => {
      const name = document.getElementById('nutrition-set-name').value.trim();
      const comment = document.getElementById('nutrition-set-comment').value.trim();
      if (!name) {
        showToast('Укажи название набора');
        return;
      }
      if (data.nutritionSets.some((set) => set.name.toLocaleLowerCase('ru-RU') === name.toLocaleLowerCase('ru-RU'))) {
        showToast('Набор с таким названием уже существует');
        return;
      }
      state.createDraft = normalizeNutritionSet({
        id: `nutrition-set-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name,
        comment,
        weeks: [emptyNutritionWeek(), emptyNutritionWeek(), emptyNutritionWeek(), emptyNutritionWeek()]
      }, data.nutritionSets.length, data.products);
      openCreateNutritionSetWeeks();
    });
  }

  function openCreateNutritionSetWeeks() {
    if (!state.createDraft) return;
    const dialog = ui.renderCreateNutritionSetWeeksModal({
      name: state.createDraft.name,
      weekRows: state.createDraft.weeks.map((week, index) => ({
        index,
        completionCount: getPlannerWeekCompletion(week),
        skipped: state.createSkippedWeeks[index]
      })),
      escapeHtml
    });
    openModal(dialog.title, dialog.body, dialog.actions, cancelCreateNutritionSet);
    document.getElementById('nutrition-set-wizard-cancel').addEventListener('click', cancelCreateNutritionSet);
    const createEmpty = document.getElementById('nutrition-set-create-empty');
    if (createEmpty) createEmpty.addEventListener('click', () => {
      state.createSkippedWeeks = [true, true, true, true];
      openNutritionSetOrientations('create');
    });
    document.getElementById('nutrition-set-to-orientations').addEventListener('click', () => openNutritionSetOrientations('create'));
    document.querySelectorAll('[data-create-set-week-open]').forEach((button) => {
      button.addEventListener('click', () => openNutritionWeekEdit(Number(button.dataset.createSetWeekOpen)));
    });
    document.querySelectorAll('[data-create-set-week-skip]').forEach((button) => {
      button.addEventListener('click', () => {
        const index = Number(button.dataset.createSetWeekSkip);
        state.createSkippedWeeks[index] = !state.createSkippedWeeks[index];
        openCreateNutritionSetWeeks();
      });
    });
  }

  function startEditNutritionSet(id) {
    const set = data.nutritionSets.find((item) => String(item.id) === String(id));
    if (!set) return;
    state.editOriginal = deepCopy(set);
    state.editDraft = normalizeNutritionSet(deepCopy(set), data.nutritionSets.indexOf(set), data.products);
    openEditNutritionSetWeeks();
  }

  function openEditNutritionSetWeeks() {
    if (!state.editDraft) return;
    const dialog = ui.renderEditNutritionSetWeeksModal({
      draft: state.editDraft,
      weekRows: state.editDraft.weeks.map((week, index) => ({
        index,
        completionCount: getPlannerWeekCompletion(week)
      })),
      escapeHtml
    });
    openModal(dialog.title, dialog.body, dialog.actions, cancelEditNutritionSet);
    document.getElementById('nutrition-set-edit-cancel').addEventListener('click', cancelEditNutritionSet);
    const nameInput = document.getElementById('nutrition-set-edit-name');
    const commentInput = document.getElementById('nutrition-set-edit-comment');
    document.getElementById('nutrition-set-edit-next').addEventListener('click', () => {
      const name = nameInput.value.trim();
      if (!name) {
        showToast('Укажи название набора');
        return;
      }
      if (data.nutritionSets.some((set) => set.id !== state.editDraft.id
        && set.name.toLocaleLowerCase('ru-RU') === name.toLocaleLowerCase('ru-RU'))) {
        showToast('Набор с таким названием уже существует');
        return;
      }
      state.editDraft.name = name;
      state.editDraft.comment = commentInput.value.trim();
      openNutritionSetOrientations('edit');
    });
    document.querySelectorAll('[data-edit-set-week-open]').forEach((button) => {
      button.addEventListener('click', () => openNutritionWeekEdit(Number(button.dataset.editSetWeekOpen)));
    });
  }

  function openNutritionSetOrientations(mode) {
    const draft = mode === 'edit' ? state.editDraft : state.createDraft;
    if (!draft) return;
    const dialog = ui.renderNutritionSetOrientationsModal({
      mode,
      setName: draft.name,
      weekIndex: state.selectedWeek - 1,
      weekCount: getPlannerWeekCompletion(draft.weeks[state.selectedWeek - 1]),
      tabsMarkup: [1, 2, 3, 4].map((week) => `<button type="button" class="nutrition-review-week-tab ${week === state.selectedWeek ? 'active' : ''}" data-nutrition-review-week="${week}" aria-pressed="${week === state.selectedWeek}"><b>0${week}</b><span>Неделя ${week}</span><small>${getPlannerWeekCompletion(draft.weeks[week - 1])} блюд</small></button>`).join(''),
      categoriesMarkup: renderCategoryRows(draft.weeks[state.selectedWeek - 1], state.selectedWeek, draft),
      escapeHtml
    });
    openModal(dialog.title, dialog.body, dialog.actions, () => mode === 'edit' ? cancelEditNutritionSet() : cancelCreateNutritionSet());
    document.querySelector('.modal')?.classList.add('nutrition-review-modal');
    document.getElementById('weekly-goals-open').addEventListener('click', () => openWeeklyGoals(draft.id, mode));
    document.getElementById('nutrition-review-back').addEventListener('click', () => mode === 'edit' ? openEditNutritionSetWeeks() : openCreateNutritionSetWeeks());
    document.getElementById('nutrition-review-finish').addEventListener('click', () => mode === 'edit' ? finalizeEditNutritionSet() : finalizeCreateNutritionSet());
    document.querySelectorAll('[data-nutrition-review-week]').forEach((button) => {
      button.addEventListener('click', () => {
        state.selectedWeek = Number(button.dataset.nutritionReviewWeek) || 1;
        openNutritionSetOrientations(mode);
      });
    });
    document.querySelectorAll('[data-planner-category-add]').forEach((button) => {
      button.addEventListener('click', () => startCategoryRecipeSelection(
        button.dataset.plannerCategoryAdd,
        Number(button.dataset.plannerCategoryWeek) || state.selectedWeek
      ));
    });
  }

  function openWeeklyGoals(setId, returnMode = null) {
    const set = draftForId(setId);
    if (!set) {
      showToast('Набор не найден');
      return;
    }
    const completenessRows = WEEKLY_FOOD_GROUPS.map((group) => {
      const value = getPersonalWeeklyGoal(set, group.id, 'completeness') || '';
      return `<div class="weekly-goal-edit-row"><div><strong>${escapeHtml(group.label)}</strong><small>Справочный ориентир: ${escapeHtml(group.reference)}</small></div><div class="field"><label>Моя цель, блюд в неделю</label><input type="number" min="1" max="21" step="1" data-weekly-completeness="${group.id}" value="${value}" placeholder="Не задана"></div></div>`;
    }).join('');
    const diversityRows = WEEKLY_FOOD_GROUPS.map((group) => {
      const value = getPersonalWeeklyGoal(set, group.id, 'diversity') || '';
      return `<div class="weekly-goal-edit-row"><div><strong>${escapeHtml(group.label)}</strong><small>Количество разных продуктов за неделю</small></div><div class="field"><label>Моя цель, разных продуктов</label><input type="number" min="1" max="50" step="1" data-weekly-diversity="${group.id}" value="${value}" placeholder="Не задана"></div></div>`;
    }).join('');
    const dialog = ui.renderWeeklyGoalsModal({ completenessRows, diversityRows });
    const returnToParent = () => {
      if (returnMode) openNutritionSetOrientations(returnMode);
      else render();
    };
    openModal(dialog.title, dialog.body, dialog.actions, returnToParent);
    document.getElementById('weekly-goals-cancel').addEventListener('click', () => {
      closeModal(false);
      returnToParent();
    });
    document.getElementById('weekly-goals-save').addEventListener('click', () => {
      const completeness = readGoalValues('[data-weekly-completeness]', 21);
      const diversity = readGoalValues('[data-weekly-diversity]', 50);
      if (!completeness || !diversity) return;
      try {
        if (returnMode) {
          const nextSet = withNutritionSetWeeklyGoals(set, { completeness, diversity }, data.products);
          if (state.createDraft?.id === set.id) state.createDraft = nextSet;
          else if (state.editDraft?.id === set.id) state.editDraft = nextSet;
        } else {
          const result = services.updateNutritionSetWeeklyGoals({
            sets: data.nutritionSets,
            setId,
            completeness,
            diversity,
            products: data.products
          });
          data.nutritionSets = result.sets;
        }
        closeModal(false);
        returnToParent();
        showToast('Личные ориентиры набора сохранены');
      } catch (error) {
        reportError('Не удалось сохранить личные ориентиры набора', error);
      }
    });
  }

  function readGoalValues(selector, max) {
    const values = {};
    for (const input of document.querySelectorAll(selector)) {
      if (!input.value) continue;
      const value = Number(input.value);
      if (!Number.isInteger(value) || value < 1 || value > max) {
        showToast(`Укажи целое число от 1 до ${max}`);
        input.focus();
        return null;
      }
      values[input.dataset.weeklyCompleteness || input.dataset.weeklyDiversity] = value;
    }
    return values;
  }

  function openNutritionWeekEdit(index) {
    if (!Number.isInteger(index) || index < 0 || index > 3) return;
    const set = state.createDraft || state.editDraft || currentSet();
    if (!set) {
      showToast('Сначала создай набор');
      return;
    }
    state.weekIndex = index;
    state.weekDraft = normalizeNutritionWeek(deepCopy(set.weeks[index] || emptyNutritionWeek()), index, data.products);
    renderNutritionWeekEditModal();
  }

  function renderNutritionWeekEditModal() {
    const set = state.createDraft || state.editDraft || currentSet();
    if (!set || !state.weekDraft || state.weekIndex === null) return;
    const index = state.weekIndex;
    const dialog = ui.renderNutritionWeekEditModal({
      setName: set.name,
      index,
      mainDishes: state.weekDraft.mainDishes,
      snackDishes: state.weekDraft.snacks,
      recipes: data.recipes,
      escapeHtml
    });
    openModal(dialog.title, dialog.body, dialog.actions, returnFromWeekEditor);
    document.getElementById('week-edit-cancel').addEventListener('click', returnFromWeekEditor);
    document.getElementById('week-edit-save').addEventListener('click', saveEditedWeek);
    document.querySelectorAll('[data-week-dish-add]').forEach((button) => {
      button.addEventListener('click', () => {
        const group = button.dataset.weekDishAdd;
        state.dishCounter += 1;
        state.weekDraft[group].push({ id: `planner-${group}-${Date.now()}-${state.dishCounter}`, recipeId: '' });
        renderNutritionWeekEditModal();
      });
    });
    document.querySelectorAll('[data-week-dish-remove]').forEach((button) => {
      button.addEventListener('click', () => {
        const group = button.dataset.weekDishGroup;
        state.weekDraft[group] = state.weekDraft[group].filter((dish) => String(dish.id) !== button.dataset.weekDishId);
        renderNutritionWeekEditModal();
      });
    });
    document.querySelectorAll('[data-week-dish-pick]').forEach((button) => {
      button.addEventListener('click', () => startWeekRecipeSelection(
        index,
        button.dataset.weekDishGroup,
        button.dataset.weekDishId
      ));
    });
  }

  function startWeekRecipeSelection(index, group, dishId) {
    const dish = state.weekDraft?.[group]?.find((item) => String(item.id) === String(dishId));
    if (!dish) return;
    mealAddFlow.startPlannerRecipeSelection({
      title: `Выбор рецепта · Неделя ${index + 1}`,
      actionLabel: 'Выбрать рецепт',
      multiple: false,
      returnPage: 'planning',
      onSelect: (recipes) => {
        if (recipes[0]) dish.recipeId = String(recipes[0].id);
        return () => renderNutritionWeekEditModal();
      },
      onCancel: () => renderNutritionWeekEditModal(),
      onAbandon: discardTransientNutritionSetDraft
    });
  }

  function returnFromWeekEditor() {
    const wasCreate = Boolean(state.createDraft);
    const wasEdit = Boolean(state.editDraft);
    state.weekDraft = null;
    state.weekIndex = null;
    closeModal(false);
    if (wasCreate) openCreateNutritionSetWeeks();
    else if (wasEdit) openEditNutritionSetWeeks();
    else render();
  }

  function saveEditedWeek() {
    const week = normalizeNutritionWeek(state.weekDraft, state.weekIndex, data.products);
    try {
      if (state.createDraft) {
        state.createDraft.weeks[state.weekIndex] = week;
        state.createSkippedWeeks[state.weekIndex] = false;
        const index = state.weekIndex;
        state.weekDraft = null;
        state.weekIndex = null;
        closeModal(false);
        openCreateNutritionSetWeeks();
        showToast(`Неделя ${index + 1} добавлена в новый набор`);
        return;
      }
      if (state.editDraft) {
        state.editDraft.weeks[state.weekIndex] = week;
        const index = state.weekIndex;
        state.weekDraft = null;
        state.weekIndex = null;
        closeModal(false);
        openEditNutritionSetWeeks();
        showToast(`Неделя ${index + 1} обновлена`);
        return;
      }
      const set = currentSet();
      const result = services.updateNutritionSetWeek({
        sets: data.nutritionSets,
        setId: set.id,
        weekIndex: state.weekIndex,
        week,
        products: data.products
      });
      data.nutritionSets = result.sets;
      const index = state.weekIndex;
      state.weekDraft = null;
      state.weekIndex = null;
      closeModal(false);
      render();
      showToast(`Неделя ${index + 1} сохранена`);
    } catch (error) {
      reportError('Не удалось сохранить неделю набора', error);
    }
  }

  function startCategoryRecipeSelection(groupId, weekNumber) {
    const group = WEEKLY_FOOD_GROUPS.find((item) => item.id === groupId);
    const set = state.createDraft || state.editDraft || currentSet();
    if (!group || !set) {
      showToast('Сначала выбери набор питания');
      return;
    }
    const weekIndex = Math.max(0, Math.min(3, weekNumber - 1));
    const mode = state.createDraft ? 'create' : state.editDraft ? 'edit' : null;
    const context = {
      setId: set.id,
      group,
      weekIndex,
      mode
    };
    mealAddFlow.startPlannerRecipeSelection({
      title: `Подбор рецептов · ${group.label}`,
      actionLabel: 'Назад',
      multiple: true,
      filterRecipe: (recipe) => recipeMatchesFoodGroup(recipe, group, data.products),
      returnPage: 'planning',
      onSelect: (recipes) => {
        if (!recipes.length) {
          showToast('Рецепты не выбраны');
          return mode === 'create'
            ? () => openNutritionSetOrientations('create')
            : mode === 'edit'
              ? () => openNutritionSetOrientations('edit')
              : null;
        }
        if (mode) {
          addRecipesToDraft(context, recipes);
          return () => openNutritionSetOrientations(mode);
        }
        openCategoryPlacement(context, recipes);
        return null;
      },
      onCancel: () => {
        if (mode) openNutritionSetOrientations(mode);
      },
      onAbandon: discardTransientNutritionSetDraft
    });
  }

  function addRecipesToDraft(context, recipes, groupName = 'mainDishes') {
    const targetSet = draftForId(context.setId);
    if (!targetSet) throw new Error('Набор больше не найден.');
    const week = normalizeNutritionWeek(targetSet.weeks[context.weekIndex], context.weekIndex, data.products);
    for (const recipe of recipes) {
      state.dishCounter += 1;
      week[groupName].push({
        id: `planner-${groupName}-${Date.now()}-${state.dishCounter}`,
        recipeId: String(recipe.id)
      });
    }
    targetSet.weeks[context.weekIndex] = normalizeNutritionWeek(week, context.weekIndex, data.products);
    state.selectedWeek = context.weekIndex + 1;
  }

  function openCategoryPlacement(context, recipes) {
    let groupName = 'mainDishes';
    const weekNumber = context.weekIndex + 1;
    const dialog = ui.renderPlannerCategoryPlacementModal({
      categoryLabel: context.group.label,
      chosenItems: recipes,
      selectedWeek: weekNumber,
      escapeHtml
    });
    openModal(dialog.title, dialog.body, dialog.actions, () => render());
    document.querySelectorAll('[data-planner-place-group]').forEach((button) => {
      button.addEventListener('click', () => {
        groupName = button.dataset.plannerPlaceGroup;
        document.querySelectorAll('[data-planner-place-group]').forEach((option) => (
          option.classList.toggle('is-selected', option === button)
        ));
      });
    });
    document.getElementById('planner-category-place-cancel').addEventListener('click', () => {
      closeModal(false);
      render();
    });
    document.getElementById('planner-category-place-confirm').addEventListener('click', () => {
      const targetSet = data.nutritionSets.find((set) => String(set.id) === String(context.setId));
      if (!targetSet) {
        closeModal(false);
        showToast('Набор больше не найден');
        render();
        return;
      }
      const targetWeek = Math.max(1, Math.min(4, Number(document.getElementById('planner-category-target-week').value) || weekNumber));
      const weekIndex = targetWeek - 1;
      try {
        const week = normalizeNutritionWeek(targetSet.weeks[weekIndex] || emptyNutritionWeek(), weekIndex, data.products);
        for (const recipe of recipes) {
          state.dishCounter += 1;
          week[groupName].push({
            id: `planner-${groupName}-${Date.now()}-${state.dishCounter}`,
            recipeId: String(recipe.id)
          });
        }
        const result = services.updateNutritionSetWeek({
          sets: data.nutritionSets,
          setId: targetSet.id,
          weekIndex,
          week: normalizeNutritionWeek(week, weekIndex, data.products),
          products: data.products
        });
        data.nutritionSets = result.sets;
        state.selectedWeek = targetWeek;
        closeModal(false);
        render();
        showToast(`Добавлено рецептов: ${recipes.length} · Неделя ${targetWeek}`);
      } catch (error) {
        reportError('Не удалось добавить рецепты в набор', error);
      }
    });
  }

  function finalizeCreateNutritionSet() {
    const draft = state.createDraft;
    if (!draft) return;
    try {
      const created = services.createNutritionSet({
        sets: data.nutritionSets,
        name: draft.name,
        comment: draft.comment,
        id: draft.id,
        products: data.products,
        weeks: draft.weeks,
        personalWeeklyGoals: draft.personalWeeklyGoals
      });
      data.nutritionSets = created.sets;
      data.activeNutritionSetId = services.selectActiveNutritionSet({
        sets: data.nutritionSets,
        id: draft.id
      });
      state.selectedWeek = 1;
      state.createDraft = null;
      state.createSkippedWeeks = [false, false, false, false];
      closeModal(false);
      render();
      showToast('Набор создан');
    } catch (error) {
      reportError('Не удалось создать набор', error);
    }
  }

  function finalizeEditNutritionSet() {
    if (!state.editDraft) return;
    try {
      const result = services.updateNutritionSet({
        sets: data.nutritionSets,
        id: state.editDraft.id,
        changes: state.editDraft,
        products: data.products
      });
      data.nutritionSets = result.sets;
      state.editDraft = null;
      state.editOriginal = null;
      closeModal(false);
      render();
      showToast('Изменения набора сохранены');
    } catch (error) {
      reportError('Не удалось сохранить изменения набора', error);
    }
  }

  function cancelCreateNutritionSet() {
    state.createDraft = null;
    state.createSkippedWeeks = [false, false, false, false];
    state.weekDraft = null;
    state.weekIndex = null;
    closeModal(false);
    render();
  }

  function cancelEditNutritionSet() {
    state.editDraft = null;
    state.editOriginal = null;
    state.weekDraft = null;
    state.weekIndex = null;
    closeModal(false);
    render();
  }

  function discardTransientNutritionSetDraft() {
    state.createDraft = null;
    state.createSkippedWeeks = [false, false, false, false];
    state.createPreviousActiveId = '';
    state.editDraft = null;
    state.editOriginal = null;
    state.weekDraft = null;
    state.weekIndex = null;
  }

  function openDeleteNutritionSet(id) {
    const set = data.nutritionSets.find((item) => String(item.id) === String(id));
    if (!set) return;
    const dialog = ui.renderDeleteNutritionSetModal({ name: set.name, escapeHtml });
    openModal(dialog.title, dialog.body, dialog.actions);
    document.getElementById('nutrition-set-delete-cancel').addEventListener('click', () => closeModal(false));
    document.getElementById('nutrition-set-delete-confirm').addEventListener('click', () => {
      try {
        const result = services.deleteNutritionSet({
          sets: data.nutritionSets,
          id: set.id,
          activeId: data.activeNutritionSetId
        });
        data.nutritionSets = result.sets;
        data.activeNutritionSetId = result.activeId;
        if (state.selectedWeek > 4) state.selectedWeek = 1;
        closeModal(false);
        render();
        showToast(`Набор «${set.name}» удалён`);
      } catch (error) {
        reportError('Не удалось удалить набор', error);
      }
    });
  }

  return { render };
}
