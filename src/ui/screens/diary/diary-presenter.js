import { getStandardMeals, diaryMealShare } from '../../../domain/diary/meal-config.js';
import {
  isCalorieOnlyEntry,
  isNutritionSetAverageEntry,
  macrosFor
} from '../../../domain/diary/diary-calculations.js';
import { dateKey, isValidDateKey } from '../../../domain/shared/date-utils.js';
import { ratioPercent } from '../../../domain/measurement/measurement-calculations.js';

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

function weightGoalStatus(profile, plan) {
  const current = Number(profile.currentWeight) || 0;
  const target = Number(plan.targetWeight) || 0;
  const difference = Math.abs(target - current);
  const amount = difference.toFixed(1).replace('.', ',');

  if (plan.goal === 'Поддержание веса') {
    const delta = current - target;
    return {
      label: 'Поддержание веса',
      note: difference < 0.05
        ? 'Целевой вес соблюдается'
        : `Отклонение от цели: ${delta > 0 ? '+' : ''}${delta.toFixed(1).replace('.', ',')} кг`
    };
  }
  if (difference < 0.05) return { label: 'Целевой вес достигнут', note: '' };
  if (plan.goal === 'Набор веса' || plan.goal === 'Набор массы') {
    return target > current
      ? { label: `Осталось набрать ${amount} кг`, note: '' }
      : { label: 'Проверь целевой вес', note: 'Для набора целевой вес должен быть выше текущего' };
  }
  if (plan.goal === 'Снижение веса' || plan.goal === 'Снижение жировой массы' || plan.goal === 'Сушка') {
    return target < current
      ? { label: `Осталось снизить ${amount} кг`, note: '' }
      : { label: 'Проверь целевой вес', note: 'Для снижения целевой вес должен быть ниже текущего' };
  }
  return target > current
    ? { label: `Осталось набрать ${amount} кг`, note: '' }
    : { label: `Осталось снизить ${amount} кг`, note: '' };
}

function bmiSummary(profile) {
  const height = Number(profile.height) / 100;
  const weight = Number(profile.currentWeight);
  if (!height || !weight) return { value: '—', label: 'Укажи рост и вес' };

  const bmi = weight / (height * height);
  let label = 'Ожирение III степени';
  if (bmi < 18.5) label = 'Ниже нормы';
  else if (bmi < 25) label = 'Нормальный диапазон';
  else if (bmi < 30) label = 'Выше нормы';
  else if (bmi < 35) label = 'Ожирение I степени';
  else if (bmi < 40) label = 'Ожирение II степени';
  return { value: bmi.toFixed(1).replace('.', ','), label };
}

function measurementCardSummary(data, locale) {
  const values = Object.fromEntries(data.measurements.map(({ name, value }) => [name, Number(value) || null]));
  const height = Number(data.profile.height);
  const average = (left, right) => left && right ? (left + right) / 2 : null;
  const rows = [
    ['Талия / рост', ratioPercent(values.Талия, height > 0 ? height : null)],
    ['Талия / бёдра', ratioPercent(values.Талия, values.Бёдра)],
    ['Плечи / талия', ratioPercent(values.Плечи, values.Талия)],
    [
      'Бицепс / предплечье',
      ratioPercent(
        average(values['Бицепс — левая рука'], values['Бицепс — правая рука']),
        average(values['Предплечье — левая рука'], values['Предплечье — правая рука'])
      )
    ],
    [
      'Бедро / икра',
      ratioPercent(
        average(values['Бедро — левая нога'], values['Бедро — правая нога']),
        average(values['Икра — левая нога'], values['Икра — правая нога'])
      )
    ]
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
    snackEntries: dayEntries.filter((entry) => entry.meal === 'Перекус'),
    entriesByMeal,
    dayEntries,
    macrosFor,
    diaryMealShare: (meal) => diaryMealShare(meal, data.profile),
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
