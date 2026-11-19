import { isCalorieOnlyEntry, isMassSystemEntry } from '../diary/diary-calculations.js';
import { measurementValue } from '../measurement/measurement-calculations.js';
import {
  WEEKLY_FOOD_GROUPS,
  convertPlannerNutrientUnit,
  getNutritionRecipeFoodMetadata,
  getPersonalWeeklyGoal,
  getPlannerItemFoodCategories
} from '../nutrition-set/nutrition-set.calculations.js';
import { calculateProfileAge } from '../planning/plan-calculations.js';
import { dateKey, isValidDateKey, todayLocalDate } from '../shared/date-utils.js';
import {
  normalizeRecipeFilterValue,
  recipeArray,
  uniqueProductValues
} from '../shared/filter-utils.js';

export const STATISTICS_PERIODS = Object.freeze([
  { key: 'Неделя', days: 7 },
  { key: 'Месяц', days: 30 },
  { key: '3 месяца', days: 90 },
  { key: 'Год', days: 365 }
]);

const VITAMIN_PATTERN = /витамин|фолат|биотин/i;
export const BODY_STATISTICS_MEASUREMENT_NAMES = Object.freeze([
  'Талия',
  'Грудь',
  'Бёдра',
  'Плечи'
]);

export const NUTRIENT_REFERENCE_VALUES = Object.freeze([
  { name: 'Витамин A', unit: 'мкг RAE', kind: 'RDA', v: { '9-13': [600, 600], '14-18': [900, 700], '19-30': [900, 700], '31-50': [900, 700], '51-70': [900, 700], '71+': [900, 700] } },
  { name: 'Витамин C', unit: 'мг', kind: 'RDA', v: { '9-13': [45, 45], '14-18': [75, 65], '19-30': [90, 75], '31-50': [90, 75], '51-70': [90, 75], '71+': [90, 75] } },
  { name: 'Витамин D', unit: 'мкг', kind: 'RDA', v: { '9-13': [15, 15], '14-18': [15, 15], '19-30': [15, 15], '31-50': [15, 15], '51-70': [15, 15], '71+': [20, 20] } },
  { name: 'Витамин E', unit: 'мг', kind: 'RDA', v: { '9-13': [11, 11], '14-18': [15, 15], '19-30': [15, 15], '31-50': [15, 15], '51-70': [15, 15], '71+': [15, 15] } },
  { name: 'Витамин K', unit: 'мкг', kind: 'AI', v: { '9-13': [60, 60], '14-18': [75, 75], '19-30': [120, 90], '31-50': [120, 90], '51-70': [120, 90], '71+': [120, 90] } },
  { name: 'Витамин B1 (тиамин)', unit: 'мг', kind: 'RDA', v: { '9-13': [0.9, 0.9], '14-18': [1.2, 1.0], '19-30': [1.2, 1.1], '31-50': [1.2, 1.1], '51-70': [1.2, 1.1], '71+': [1.2, 1.1] } },
  { name: 'Витамин B2 (рибофлавин)', unit: 'мг', kind: 'RDA', v: { '9-13': [0.9, 0.9], '14-18': [1.3, 1.0], '19-30': [1.3, 1.1], '31-50': [1.3, 1.1], '51-70': [1.3, 1.1], '71+': [1.3, 1.1] } },
  { name: 'Витамин B3 (ниацин)', unit: 'мг NE', kind: 'RDA', v: { '9-13': [12, 12], '14-18': [16, 14], '19-30': [16, 14], '31-50': [16, 14], '51-70': [16, 14], '71+': [16, 14] } },
  { name: 'Витамин B5 (пантотеновая кислота)', unit: 'мг', kind: 'AI', v: { '9-13': [4, 4], '14-18': [5, 5], '19-30': [5, 5], '31-50': [5, 5], '51-70': [5, 5], '71+': [5, 5] } },
  { name: 'Биотин (B7)', unit: 'мкг', kind: 'AI', v: { '9-13': [20, 20], '14-18': [25, 25], '19-30': [30, 30], '31-50': [30, 30], '51-70': [30, 30], '71+': [30, 30] } },
  { name: 'Холин', unit: 'мг', kind: 'AI', v: { '9-13': [375, 375], '14-18': [550, 400], '19-30': [550, 425], '31-50': [550, 425], '51-70': [550, 425], '71+': [550, 425] } },
  { name: 'Витамин B6', unit: 'мг', kind: 'RDA', v: { '9-13': [1.0, 1.0], '14-18': [1.3, 1.2], '19-30': [1.3, 1.3], '31-50': [1.3, 1.3], '51-70': [1.7, 1.5], '71+': [1.7, 1.5] } },
  { name: 'Фолат (B9)', unit: 'мкг DFE', kind: 'RDA', v: { '9-13': [300, 300], '14-18': [400, 400], '19-30': [400, 400], '31-50': [400, 400], '51-70': [400, 400], '71+': [400, 400] } },
  { name: 'Витамин B12', unit: 'мкг', kind: 'RDA', v: { '9-13': [1.8, 1.8], '14-18': [2.4, 2.4], '19-30': [2.4, 2.4], '31-50': [2.4, 2.4], '51-70': [2.4, 2.4], '71+': [2.4, 2.4] } },
  { name: 'Кальций', unit: 'мг', kind: 'RDA', v: { '9-13': [1300, 1300], '14-18': [1300, 1300], '19-30': [1000, 1000], '31-50': [1000, 1000], '51-70': [1000, 1200], '71+': [1200, 1200] } },
  { name: 'Железо', unit: 'мг', kind: 'RDA', v: { '9-13': [8, 8], '14-18': [11, 15], '19-30': [8, 18], '31-50': [8, 18], '51-70': [8, 8], '71+': [8, 8] } },
  { name: 'Магний', unit: 'мг', kind: 'RDA', v: { '9-13': [240, 240], '14-18': [410, 360], '19-30': [400, 310], '31-50': [420, 320], '51-70': [420, 320], '71+': [420, 320] } },
  { name: 'Калий', unit: 'мг', kind: 'AI', v: { '9-13': [2500, 2300], '14-18': [3000, 2300], '19-30': [3400, 2600], '31-50': [3400, 2600], '51-70': [3400, 2600], '71+': [3400, 2600] } },
  { name: 'Цинк', unit: 'мг', kind: 'RDA', v: { '9-13': [8, 8], '14-18': [11, 9], '19-30': [11, 8], '31-50': [11, 8], '51-70': [11, 8], '71+': [11, 8] } },
  { name: 'Фосфор', unit: 'мг', kind: 'RDA', v: { '9-13': [1250, 1250], '14-18': [1250, 1250], '19-30': [700, 700], '31-50': [700, 700], '51-70': [700, 700], '71+': [700, 700] } },
  { name: 'Йод', unit: 'мкг', kind: 'RDA', v: { '9-13': [120, 120], '14-18': [150, 150], '19-30': [150, 150], '31-50': [150, 150], '51-70': [150, 150], '71+': [150, 150] } },
  { name: 'Медь', unit: 'мкг', kind: 'RDA', v: { '9-13': [700, 700], '14-18': [890, 890], '19-30': [900, 900], '31-50': [900, 900], '51-70': [900, 900], '71+': [900, 900] } },
  { name: 'Марганец', unit: 'мг', kind: 'AI', v: { '9-13': [1.9, 1.6], '14-18': [2.2, 1.6], '19-30': [2.3, 1.8], '31-50': [2.3, 1.8], '51-70': [2.3, 1.8], '71+': [2.3, 1.8] } },
  { name: 'Хром', unit: 'мкг', kind: 'AI', v: { '9-13': [25, 21], '14-18': [35, 24], '19-30': [35, 25], '31-50': [35, 25], '51-70': [35, 25], '71+': [35, 25] } },
  { name: 'Молибден', unit: 'мкг', kind: 'RDA', v: { '9-13': [34, 34], '14-18': [43, 43], '19-30': [45, 45], '31-50': [45, 45], '51-70': [45, 45], '71+': [45, 45] } },
  { name: 'Фтор', unit: 'мг', kind: 'AI', v: { '9-13': [2, 2], '14-18': [3, 3], '19-30': [4, 3], '31-50': [4, 3], '51-70': [4, 3], '71+': [4, 3] } },
  { name: 'Хлорид', unit: 'мг', kind: 'AI', v: { '9-13': [1800, 1800], '14-18': [2300, 2300], '19-30': [2300, 2300], '31-50': [2300, 2300], '51-70': [2000, 2000], '71+': [1800, 1800] } },
  { name: 'Натрий', unit: 'мг', kind: 'AI', v: { '9-13': [1500, 1500], '14-18': [1500, 1500], '19-30': [1500, 1500], '31-50': [1500, 1500], '51-70': [1500, 1500], '71+': [1500, 1500] } },
  { name: 'Селен', unit: 'мкг', kind: 'RDA', v: { '9-13': [40, 40], '14-18': [55, 55], '19-30': [55, 55], '31-50': [55, 55], '51-70': [55, 55], '71+': [55, 55] } },
  { name: 'Клетчатка', unit: 'г', kind: 'AI', v: { '9-13': [31, 26], '14-18': [38, 26], '19-30': [38, 25], '31-50': [38, 25], '51-70': [30, 21], '71+': [30, 21] } },
  { name: 'Омега-3 (ALA)', unit: 'г', kind: 'AI', v: { '9-13': [1.2, 1.0], '14-18': [1.6, 1.1], '19-30': [1.6, 1.1], '31-50': [1.6, 1.1], '51-70': [1.6, 1.1], '71+': [1.6, 1.1] } }
]);

function dateFromKey(key) {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function dayCountBetween(start, end) {
  const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const last = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  let count = 0;
  while (cursor <= last) {
    count += 1;
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
}

function getRdaAgeBand(age) {
  if (age <= 13) return '9-13';
  if (age <= 18) return '14-18';
  if (age <= 30) return '19-30';
  if (age <= 50) return '31-50';
  if (age <= 70) return '51-70';
  return '71+';
}

export function getNutrientReferenceValue(name, profile, referenceDate = todayLocalDate()) {
  const age = calculateProfileAge(profile.birthDate, referenceDate);
  if (age === null || age < 9 || !['Мужской', 'Женский'].includes(profile.sex)) return null;
  const normalized = normalizeRecipeFilterValue(name);
  const alias = normalized === 'витамин b9' ? 'фолат (b9)' : normalized;
  const reference = NUTRIENT_REFERENCE_VALUES.find((item) => {
    const candidate = normalizeRecipeFilterValue(item.name);
    return candidate === alias || candidate === normalized || candidate.startsWith(`${normalized} (`);
  });
  if (!reference) return null;
  const values = reference.v[getRdaAgeBand(age)];
  if (!values) return null;
  return {
    value: Number(values[profile.sex === 'Мужской' ? 0 : 1]),
    unit: reference.unit,
    kind: reference.kind
  };
}

export function getAggregateMicronutrientStats(
  aggregate,
  days,
  profile,
  referenceDate = todayLocalDate()
) {
  if (!aggregate || !Array.isArray(aggregate.components)) {
    throw new TypeError('An aggregate with nutrient components is required.');
  }
  if (!Number.isFinite(days) || days <= 0) {
    throw new RangeError('The number of days must be greater than 0.');
  }

  const components = aggregate.components.map((component) => {
    const dailyAmount = (Number(component.amount) || 0) / days;
    const target = getNutrientReferenceValue(component.name, profile, referenceDate);
    const comparable = target
      ? convertPlannerNutrientUnit(dailyAmount, component.unit, target.unit)
      : null;
    const percent = comparable !== null && target?.value > 0
      ? Math.round(comparable / target.value * 100)
      : null;
    return { ...component, dailyAmount, target, percent };
  });
  const comparable = components.filter((component) => Number.isFinite(component.percent));

  return {
    components,
    vitamins: components.filter((component) => VITAMIN_PATTERN.test(component.name)),
    minerals: components.filter((component) => !VITAMIN_PATTERN.test(component.name)),
    averageCoverage: comparable.length
      ? Math.round(comparable.reduce((sum, component) => sum + component.percent, 0) / comparable.length)
      : null
  };
}

export function getDiaryStatisticsRange({
  period = 'Неделя',
  periodEnd,
  customStart,
  customEnd,
  today = todayLocalDate()
} = {}) {
  if (!(today instanceof Date) || Number.isNaN(today.getTime())) {
    throw new TypeError('A valid current date is required.');
  }
  const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  let start;
  let end;
  if (period === 'Произвольный период') {
    if (
      isValidDateKey(customStart)
      && isValidDateKey(customEnd)
      && customStart <= customEnd
      && customEnd <= dateKey(todayDate)
    ) {
      start = dateFromKey(customStart);
      end = dateFromKey(customEnd);
    }
  } else {
    const preset = STATISTICS_PERIODS.find((item) => item.key === period) || STATISTICS_PERIODS[0];
    const requestedEnd = isValidDateKey(periodEnd) ? dateFromKey(periodEnd) : todayDate;
    end = requestedEnd > todayDate ? todayDate : requestedEnd;
    start = new Date(end);
    start.setDate(start.getDate() - preset.days + 1);
  }
  if (!start || !end) {
    end = todayDate;
    start = new Date(end);
    start.setDate(start.getDate() - STATISTICS_PERIODS[0].days + 1);
  }
  return {
    start,
    end,
    days: dayCountBetween(start, end),
    startKey: dateKey(start),
    endKey: dateKey(end)
  };
}

function getDiaryFoodMetadata(entry, recipes, products) {
  if (isMassSystemEntry(entry)) return { categories: [], items: [] };
  if (
    Array.isArray(entry.foodMetadataSnapshot?.categories)
    && Array.isArray(entry.foodMetadataSnapshot?.items)
  ) {
    return {
      categories: [...entry.foodMetadataSnapshot.categories],
      items: [...entry.foodMetadataSnapshot.items]
    };
  }
  const product = entry.productId !== undefined && entry.productId !== null
    ? products.find((item) => String(item.id) === String(entry.productId))
    : products.find((item) => normalizeRecipeFilterValue(item.name) === normalizeRecipeFilterValue(entry.name));
  if (product) return { categories: recipeArray(product.categories), items: [product.name] };
  const recipe = entry.recipeId !== undefined && entry.recipeId !== null
    ? recipes.find((item) => String(item.id) === String(entry.recipeId))
    : recipes.find((item) => normalizeRecipeFilterValue(item.name) === normalizeRecipeFilterValue(entry.name));
  if (!recipe) return { categories: [], items: entry.name ? [entry.name] : [] };
  return getNutritionRecipeFoodMetadata(recipe, products);
}

function validFoodEntries(entries, startKey, endKey) {
  return entries.filter((entry) => {
    const kcal = Number(entry?.kcal);
    return isValidDateKey(entry?.date)
      && entry.date >= startKey
      && entry.date <= endKey
      && Number.isFinite(kcal)
      && kcal > 0;
  });
}

export function calculateDiaryStatistics({
  diaryEntries,
  waterEntries,
  products,
  recipes,
  profile,
  activeNutritionSet,
  startKey,
  endKey,
  referenceDate = todayLocalDate()
}) {
  if (!Array.isArray(diaryEntries) || !Array.isArray(waterEntries)) {
    throw new TypeError('Diary and water entries must be arrays.');
  }
  if (!Array.isArray(products) || !Array.isArray(recipes)) {
    throw new TypeError('Products and recipes must be arrays.');
  }
  if (!isValidDateKey(startKey) || !isValidDateKey(endKey) || startKey > endKey) {
    throw new TypeError('A valid statistics date range is required.');
  }
  if (!profile || typeof profile !== 'object') {
    throw new TypeError('Profile data is required for statistics.');
  }

  const days = dayCountBetween(dateFromKey(startKey), dateFromKey(endKey));
  const foodEntries = validFoodEntries(diaryEntries, startKey, endKey);
  const waterRows = waterEntries.filter((entry) => {
    const amount = Number(entry?.ml);
    return isValidDateKey(entry?.date)
      && entry.date >= startKey
      && entry.date <= endKey
      && Number.isFinite(amount)
      && amount > 0;
  });
  const incompleteDates = new Set(foodEntries.filter(isCalorieOnlyEntry).map((entry) => entry.date));
  const foodByDate = new Map();
  const waterByDate = new Map();
  for (const entry of foodEntries) {
    if (!foodByDate.has(entry.date)) foodByDate.set(entry.date, []);
    foodByDate.get(entry.date).push(entry);
  }
  for (const entry of waterRows) {
    waterByDate.set(entry.date, (waterByDate.get(entry.date) || 0) + Number(entry.ml));
  }

  const dailyRows = [];
  const start = dateFromKey(startKey);
  for (let index = 0; index < days; index += 1) {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    const key = dateKey(date);
    const entries = foodByDate.get(key) || [];
    const total = entries.reduce((sum, entry) => ({
      kcal: sum.kcal + (Number(entry.kcal) || 0),
      p: sum.p + (Number(entry.p) || 0),
      f: sum.f + (Number(entry.f) || 0),
      c: sum.c + (Number(entry.c) || 0)
    }), { kcal: 0, p: 0, f: 0, c: 0 });
    dailyRows.push({
      date,
      key,
      entries,
      total,
      waterMl: waterByDate.get(key) || 0,
      macroIncomplete: incompleteDates.has(key)
    });
  }

  const totals = foodEntries.reduce((sum, entry) => ({
    kcal: sum.kcal + (Number(entry.kcal) || 0),
    p: sum.p + (Number(entry.p) || 0),
    f: sum.f + (Number(entry.f) || 0),
    c: sum.c + (Number(entry.c) || 0)
  }), { kcal: 0, p: 0, f: 0, c: 0 });
  const loggedFoodDays = dailyRows.filter((row) => row.entries.length > 0).length;
  const noRecordDays = days - loggedFoodDays;
  const onlyCalorieDays = dailyRows.filter((row) => (
    row.entries.length > 0 && row.entries.every(isCalorieOnlyEntry)
  )).length;
  const mixedCalorieDays = dailyRows.filter((row) => (
    row.macroIncomplete && row.entries.some((entry) => !isCalorieOnlyEntry(entry))
  )).length;
  const knownMacroRows = dailyRows.filter((row) => row.entries.length > 0 && !row.macroIncomplete);
  const macroKnownDays = knownMacroRows.length;
  const macroTotals = knownMacroRows.reduce((sum, row) => ({
    p: sum.p + row.total.p,
    f: sum.f + row.total.f,
    c: sum.c + row.total.c
  }), { p: 0, f: 0, c: 0 });
  totals.p = macroKnownDays ? macroTotals.p : null;
  totals.f = macroKnownDays ? macroTotals.f : null;
  totals.c = macroKnownDays ? macroTotals.c : null;
  const macroAverage = (value) => macroKnownDays ? value / macroKnownDays : null;
  const averages = {
    kcal: totals.kcal / days,
    p: macroAverage(totals.p),
    f: macroAverage(totals.f),
    c: macroAverage(totals.c)
  };
  const waterTotalMl = waterRows.reduce((sum, entry) => sum + Number(entry.ml), 0);
  const waterAverageMl = waterTotalMl / days;
  const loggedWaterDays = dailyRows.filter((row) => row.waterMl > 0).length;
  const recordedWaterAmounts = dailyRows.map((row) => row.waterMl).filter((amount) => amount > 0);
  const minWaterDayMl = recordedWaterAmounts.length ? Math.min(...recordedWaterAmounts) : null;
  const maxWaterDayMl = recordedWaterAmounts.length ? Math.max(...recordedWaterAmounts) : null;

  const completenessEntries = foodEntries.filter((entry) => (
    !isMassSystemEntry(entry) && !incompleteDates.has(entry.date)
  ));
  const varietyKnownDays = new Set(completenessEntries.map((entry) => entry.date)).size;
  const allFoodItems = new Set();
  const groupStats = WEEKLY_FOOD_GROUPS.map((group) => ({
    group,
    entries: 0,
    days: new Set(),
    items: new Set()
  }));
  for (const entry of completenessEntries) {
    const metadata = getDiaryFoodMetadata(entry, recipes, products);
    const items = recipeArray(metadata.items).filter(Boolean);
    items.forEach((item) => allFoodItems.add(normalizeRecipeFilterValue(item)));
    const itemCategories = items.map((name) => {
      const product = products.find((item) => (
        normalizeRecipeFilterValue(item.name) === normalizeRecipeFilterValue(name)
      ));
      return { name, categories: getPlannerItemFoodCategories(name, product) };
    });
    const categories = uniqueProductValues([
      ...recipeArray(metadata.categories),
      ...itemCategories.flatMap((item) => item.categories)
    ]);
    for (const stat of groupStats) {
      const matches = categories.some((category) => stat.group.categories.some((expected) => (
        normalizeRecipeFilterValue(expected) === normalizeRecipeFilterValue(category)
      )));
      if (!matches) continue;
      stat.entries += 1;
      stat.days.add(entry.date);
      itemCategories.forEach((item) => {
        if (item.categories.some((category) => stat.group.categories.some((expected) => (
          normalizeRecipeFilterValue(expected) === normalizeRecipeFilterValue(category)
        )))) {
          stat.items.add(normalizeRecipeFilterValue(item.name));
        }
      });
    }
  }
  groupStats.forEach((stat) => {
    const personalFrequency = getPersonalWeeklyGoal(activeNutritionSet, stat.group.id, 'completeness');
    const weeklyTarget = Math.max(1, Number(personalFrequency) || stat.group.min || 1);
    stat.targetEntries = Math.ceil(weeklyTarget * days / 7);
    const personalDiversity = getPersonalWeeklyGoal(activeNutritionSet, stat.group.id, 'diversity');
    stat.targetItems = personalDiversity ? Math.ceil(personalDiversity * days / 7) : null;
    stat.dayCount = stat.days.size;
    stat.itemCount = stat.items.size;
    stat.frequencyPercent = stat.targetEntries ? Math.round(stat.entries / stat.targetEntries * 100) : 0;
    stat.diversityPercent = stat.targetItems ? Math.round(stat.itemCount / stat.targetItems * 100) : null;
  });
  const frequencyGoalMetCount = groupStats.filter((stat) => stat.entries >= stat.targetEntries).length;

  const components = new Map();
  const microDataDates = new Set();
  const microEntries = foodEntries.filter((entry) => (
    !isCalorieOnlyEntry(entry) && !incompleteDates.has(entry.date)
  ));
  for (const entry of microEntries) {
    const grams = Number(entry.grams) || 0;
    if (!(grams > 0)) continue;
    const per100 = Array.isArray(entry.nutritionSnapshot?.components)
      ? entry.nutritionSnapshot.components
      : [];
    let entryHasMicroData = false;
    for (const component of per100) {
      if (!component?.name) continue;
      const amount = Number(component.amount) * grams / 100;
      const unit = String(component.unit || 'мг').trim();
      if (!Number.isFinite(amount) || amount <= 0) continue;
      const name = String(component.name).trim();
      const key = `${normalizeRecipeFilterValue(name)}|${unit.toLocaleLowerCase('ru-RU')}`;
      const current = components.get(key) || { name, unit, total: 0, days: new Set() };
      current.total += amount;
      current.days.add(entry.date);
      components.set(key, current);
      entryHasMicroData = true;
    }
    if (entryHasMicroData) microDataDates.add(entry.date);
  }
  const microKnownDays = microDataDates.size;
  const microMissingOnKnownMacroDays = Math.max(0, macroKnownDays - microKnownDays);
  const ageReferenceDate = referenceDate instanceof Date ? referenceDate : todayLocalDate();
  const micronutrients = [...components.values()].map((item) => {
    const daysWithComponent = item.days.size;
    const dailyAmount = daysWithComponent ? item.total / daysWithComponent : 0;
    const target = getNutrientReferenceValue(item.name, profile, ageReferenceDate);
    const comparable = target ? convertPlannerNutrientUnit(dailyAmount, item.unit, target.unit) : null;
    const percent = comparable !== null && target?.value > 0
      ? Math.round(comparable / target.value * 100)
      : null;
    return { ...item, daysCount: daysWithComponent, dailyAmount, target, percent };
  }).sort((left, right) => {
    if (left.percent === null && right.percent !== null) return 1;
    if (left.percent !== null && right.percent === null) return -1;
    if (left.percent !== null && right.percent !== null) return left.percent - right.percent;
    return left.name.localeCompare(right.name, 'ru');
  });
  const comparableMicros = micronutrients.filter((item) => item.percent !== null);
  const averageCoverage = comparableMicros.length
    ? Math.round(comparableMicros.reduce((sum, item) => sum + item.percent, 0) / comparableMicros.length)
    : null;

  return {
    days,
    startKey,
    endKey,
    foodEntries,
    waterRows,
    dailyRows,
    totals,
    averages,
    waterTotalMl,
    waterAverageMl,
    minWaterDayMl,
    maxWaterDayMl,
    loggedFoodDays,
    loggedWaterDays,
    noRecordDays,
    onlyCalorieDays,
    mixedCalorieDays,
    allFoodItemCount: allFoodItems.size,
    groupStats,
    frequencyGoalMetCount,
    varietyKnownDays,
    micronutrients,
    matchedMicronutrientCount: comparableMicros.length,
    averageCoverage,
    macroKnownDays,
    macroIncompleteDays: incompleteDates.size,
    microKnownDays,
    microMissingOnKnownMacroDays
  };
}

export function calculateBodyStatistics({ weightHistory, measurementHistory, startKey, endKey }) {
  if (!Array.isArray(weightHistory) || !Array.isArray(measurementHistory)) {
    throw new TypeError('Weight and measurement histories must be arrays.');
  }
  if (!isValidDateKey(startKey) || !isValidDateKey(endKey) || startKey > endKey) {
    throw new TypeError('A valid statistics date range is required.');
  }
  const inRange = (record) => (
    isValidDateKey(record?.date) && record.date >= startKey && record.date <= endKey
  );
  const weights = weightHistory
    .filter((record) => inRange(record) && Number.isFinite(Number(record.weight)) && Number(record.weight) > 0)
    .slice()
    .sort((left, right) => left.date.localeCompare(right.date));
  const measureRecords = measurementHistory
    .filter((record) => inRange(record) && record.values && typeof record.values === 'object')
    .slice()
    .sort((left, right) => left.date.localeCompare(right.date));
  const weightChange = weights.length > 1
    ? Number(weights[weights.length - 1].weight) - Number(weights[0].weight)
    : null;
  const latestMeasure = measureRecords.length ? measureRecords[measureRecords.length - 1] : null;
  return {
    weights,
    measureRecords,
    latestWeight: weights.length ? weights[weights.length - 1] : null,
    latestMeasure,
    latestMeasureFilledCount: latestMeasure
      ? BODY_STATISTICS_MEASUREMENT_NAMES.filter((name) => measurementValue(name, latestMeasure.values) !== null).length
      : 0,
    previousMeasure: measureRecords.length > 1 ? measureRecords[measureRecords.length - 2] : null,
    weightChange
  };
}

export function getMeasurementDelta(name, current, previous) {
  if (!current?.values || !previous?.values) return null;
  const currentValue = measurementValue(name, current.values);
  const previousValue = measurementValue(name, previous.values);
  return currentValue === null || previousValue === null ? null : currentValue - previousValue;
}

export function getDiaryStatisticsBuckets(model, key, period) {
  if (!Array.isArray(model?.dailyRows) || !model.dailyRows.length) return [];
  if (!['kcal', 'p', 'f', 'c', 'water'].includes(key)) {
    throw new TypeError('Statistics bucket key is not supported.');
  }
  let count;
  if (period === 'Неделя') count = Math.min(7, model.days);
  else if (period === 'Месяц') count = Math.min(5, model.days);
  else if (period === '3 месяца') count = Math.min(3, model.days);
  else if (period === 'Год') count = Math.min(12, model.days);
  else if (model.days <= 8) count = model.days;
  else if (model.days <= 45) count = Math.ceil(model.days / 7);
  else if (model.days <= 120) count = Math.ceil(model.days / 15);
  else count = Math.min(12, Math.ceil(model.days / 30.5));
  count = Math.max(1, count);

  return Array.from({ length: count }, (_, index) => {
    const from = Math.floor(index * model.days / count);
    const to = Math.floor((index + 1) * model.days / count);
    const rows = model.dailyRows.slice(from, to);
    let value;
    if (['p', 'f', 'c'].includes(key)) {
      const known = rows.filter((row) => row.entries.length > 0 && !row.macroIncomplete);
      value = known.length
        ? known.reduce((sum, row) => sum + row.total[key], 0) / known.length
        : null;
    } else {
      const sum = rows.reduce((total, row) => (
        total + (key === 'water' ? row.waterMl : row.total[key])
      ), 0);
      value = rows.length ? sum / rows.length : 0;
    }
    return {
      value,
      startKey: rows[0]?.key || '',
      endKey: rows[rows.length - 1]?.key || ''
    };
  });
}
