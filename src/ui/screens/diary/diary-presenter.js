import { getStandardMeals } from '../../../domain/diary/meal-config.js';
import {
  getMealNutritionSummary,
  getNutritionGoalProgress,
  isCalorieOnlyEntry,
  isNutritionSetAverageEntry,
  macrosFor
} from '../../../domain/diary/diary-calculations.js';
import { bmiSummary, weightGoalStatus } from '../../../domain/profile/profile-calculations.js';
import { dateKey, isValidDateKey } from '../../../domain/shared/date-utils.js';
import { measurementRatios } from '../../../domain/measurement/measurement-calculations.js';

function dateFromKey(key) {
  if (!isValidDateKey(key)) throw new TypeError('A valid diary date is required.');
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function readableDate(key, locale) {
  return dateFromKey(key).toLocaleDateString(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

function measurementCardSummary(data, locale) {
  const values = Object.fromEntries(data.measurements.map(({ name, value }) => [name, Number(value) || null]));
  const height = Number(data.profile.height);
  const ratios = measurementRatios(values, height);
  const rows = [
    ['Талия / рост', ratios.waistToHeight],
    ['Талия / бёдра', ratios.waistToHips],
    ['Плечи / талия', ratios.shoulderToWaist],
    ['Бицепс / предплечье', ratios.armToForearm],
    ['Бедро / икра', ratios.thighToCalf]
  ].filter(([, value]) => Number.isFinite(value) && value > 0);
  const heightText = height > 0
    ? `${height.toLocaleString(locale, { maximumFractionDigits: 1 })} см`
    : '—';

  return `<div class="measure-ratio-summary"><div class="measure-ratio-item"><span>Рост</span><b>${heightText}</b></div>${rows.map(([label, value]) => `<div class="measure-ratio-item"><span>${label}</span><b>${value.toFixed(1).replace('.', ',')}%</b></div>`).join('')}</div>`;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function nutritionNumber(value) {
  return Number(value || 0).toLocaleString('ru-RU', { maximumFractionDigits: 1 });
}

function diaryEntryQuantityLabel(entry) {
  if (isCalorieOnlyEntry(entry)) return 'Введённые калории · БЖУ и микронутриенты неизвестны';
  if (isNutritionSetAverageEntry(entry)) return 'Суточное значение из набора питания';
  if (entry.quantityMode === 'portions' && Number(entry.quantityValue) > 0 && Number(entry.portionGrams) > 0) {
    return `${nutritionNumber(entry.quantityValue)} порц. · ${Math.round(Number(entry.grams)).toLocaleString('ru-RU')} г`;
  }
  return `${Math.round(Number(entry.grams) || 0).toLocaleString('ru-RU')} ${entry.quantityUnit === 'мл' ? 'мл' : 'г'}`;
}

export function createDiaryViewModel({
  data,
  selectedDate,
  today = dateKey(new Date()),
  expandedMeals = new Set(),
  locale = 'ru-RU'
}) {
  if (!data || typeof data !== 'object') throw new TypeError('Diary data is required.');
  if (!isValidDateKey(selectedDate) || !isValidDateKey(today)) {
    throw new TypeError('Valid selected and current dates are required.');
  }
  if (!Array.isArray(data.diaryEntries) || !Array.isArray(data.waterEntries)) {
    throw new TypeError('Diary and water entries must be arrays.');
  }
  if (!Array.isArray(data.measurements) || !Array.isArray(data.measurementHistory)) {
    throw new TypeError('Measurement data must be arrays.');
  }
  if (!(expandedMeals instanceof Set)) throw new TypeError('Expanded meals must be a Set.');

  const date = dateFromKey(selectedDate);
  const futureDate = selectedDate > today;
  const dayEntries = data.diaryEntries.filter((entry) => entry.date === selectedDate);
  const standardMeals = getStandardMeals(data.profile);
  const legacyMeals = [...new Set(dayEntries
    .map((entry) => entry.meal)
    .filter((meal) => meal && !standardMeals.includes(meal) && meal !== 'Перекус'))];
  const displayMeals = [...standardMeals, ...legacyMeals];
  const entriesByMeal = Object.fromEntries(displayMeals.map((meal) => [
    meal,
    dayEntries.filter((entry) => entry.meal === meal)
  ]));
  const dailyTotals = macrosFor(dayEntries);
  const nutritionProgress = getNutritionGoalProgress(dailyTotals, data.plan);
  const dailyProgress = {
    kcal: nutritionProgress.calories.percent ?? 0,
    p: nutritionProgress.macros.p.percent ?? 0,
    f: nutritionProgress.macros.f.percent ?? 0,
    c: nutritionProgress.macros.c.percent ?? 0
  };
  const mealSummaries = Object.fromEntries(displayMeals.map((meal) => {
    return [meal, getMealNutritionSummary(entriesByMeal[meal], meal, data.plan, data.profile)];
  }));
  const snackEntries = dayEntries.filter((entry) => entry.meal === 'Перекус');
  const waterEntries = data.waterEntries.filter((entry) => entry.date === selectedDate);
  const waterTotal = waterEntries.reduce((total, entry) => total + (Number(entry.ml) || 0), 0);
  const fmt = (value) => Math.round(Number(value) || 0).toLocaleString(locale);
  return {
    dateLabel: date.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' }),
    selectedDate,
    todayKey: today,
    futureDate,
    standardMeals,
    displayMeals,
    snackEntries,
    entriesByMeal,
    dayEntries,
    dailyTotals,
    dailyProgress,
    mealSummaries,
    snackKcal: macrosFor(snackEntries).kcal,
    plan: data.plan,
    profile: data.profile,
    expandedMeals,
    waterEntries,
    waterTotal,
    waterLitres: (waterTotal / 1000).toLocaleString(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }),
    weightStatus: weightGoalStatus(data.profile, data.plan),
    bmi: bmiSummary(data.profile),
    measurementHistory: data.measurementHistory,
    readableDate: (key) => readableDate(key, locale),
    measurementCardSummary: measurementCardSummary(data, locale),
    fmt,
    nutritionNumber,
    escapeHtml,
    diaryEntryQuantityLabel
  };
}
