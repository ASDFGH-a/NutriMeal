import { dateKey, isValidDateKey, todayLocalDate } from '../shared/date-utils.js';

function assertEntryDate(date, today) {
  if (!isValidDateKey(date)) throw new TypeError('A valid mass-entry date is required.');
  if (!isValidDateKey(today)) throw new TypeError('A valid current date is required.');
  if (date > today) throw new RangeError('Mass entries cannot be created for future dates.');
}

function assertEntryId(id) {
  if (id === undefined || id === null || id === '') throw new TypeError('A mass-entry id is required.');
}

export function normalizeMassEntryDates(dates, today = dateKey(todayLocalDate())) {
  if (!Array.isArray(dates)) throw new TypeError('Mass-entry dates must be an array.');
  if (!isValidDateKey(today)) throw new TypeError('A valid current date is required.');
  const uniqueDates = [...new Set(dates)];
  uniqueDates.forEach((date) => assertEntryDate(date, today));
  return uniqueDates.sort();
}

export function selectMassEntryDates({
  mode,
  rangeStart = '',
  rangeEnd = '',
  selectedDays = [],
  today = dateKey(todayLocalDate())
}) {
  if (mode === 'days') return normalizeMassEntryDates(selectedDays, today);
  if (mode !== 'range') throw new TypeError('Mass-entry date mode must be range or days.');
  if (!rangeStart) {
    if (rangeEnd) throw new TypeError('A range start date is required.');
    return [];
  }
  assertEntryDate(rangeStart, today);
  if (!rangeEnd) return [rangeStart];
  assertEntryDate(rangeEnd, today);
  if (rangeEnd < rangeStart) throw new RangeError('Mass-entry range end cannot precede its start.');

  const dates = [];
  const start = new Date(`${rangeStart}T00:00:00`);
  const end = new Date(`${rangeEnd}T00:00:00`);
  for (const date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
    dates.push(dateKey(date));
  }
  return dates;
}

export function planMassEntryDates({
  dates,
  existingEntries,
  collisionMode = 'skip',
  today = dateKey(todayLocalDate())
}) {
  if (!Array.isArray(existingEntries)) throw new TypeError('Diary entries must be an array.');
  if (!['skip', 'append', 'replace'].includes(collisionMode)) {
    throw new TypeError('Collision mode must be skip, append, or replace.');
  }
  const selectedDates = normalizeMassEntryDates(dates, today);
  const filled = new Set(existingEntries.map((entry) => entry?.date).filter(Boolean));
  const filledDates = selectedDates.filter((date) => filled.has(date));
  const targetDates = collisionMode === 'skip'
    ? selectedDates.filter((date) => !filled.has(date))
    : selectedDates;
  return {
    dates: selectedDates,
    filledDates,
    targetDates,
    skippedDates: collisionMode === 'skip' ? filledDates : []
  };
}

export function createCalorieOnlyDiaryEntry({ id, date, kcal, today = dateKey(todayLocalDate()) }) {
  assertEntryId(id);
  assertEntryDate(date, today);
  const calories = Number(kcal);
  if (!Number.isFinite(calories) || calories <= 0 || calories > 1000000) {
    throw new RangeError('Calories must be greater than 0 and no more than 1000000.');
  }
  return {
    id,
    date,
    meal: 'Калории за день',
    name: 'Калорийность за день',
    grams: 0,
    kcal: calories,
    p: null,
    f: null,
    c: null,
    calorieOnly: true,
    quantityMode: 'calorie-only',
    quantityUnit: 'ккал',
    quantityValue: calories,
    foodMetadataSnapshot: { categories: [], items: [] }
  };
}

export function createNutritionSetAverageDiaryEntry({
  id,
  date,
  setId,
  setName,
  totals,
  components = [],
  today = dateKey(todayLocalDate())
}) {
  assertEntryId(id);
  assertEntryDate(date, today);
  if (setId === undefined || setId === null || setId === '') {
    throw new TypeError('A nutrition set id is required.');
  }
  if (!totals || typeof totals !== 'object' || Array.isArray(totals)) {
    throw new TypeError('Nutrition set daily totals are required.');
  }
  if (!Array.isArray(components)) throw new TypeError('Nutrition components must be an array.');
  const macros = Object.fromEntries(['kcal', 'p', 'f', 'c'].map((key) => {
    const value = Number(totals[key]);
    if (!Number.isFinite(value) || value < 0) {
      throw new RangeError(`Nutrition set ${key} total must be finite and non-negative.`);
    }
    return [key, value];
  }));
  const componentSnapshots = components.map((component) => {
    if (!component || typeof component !== 'object' || Array.isArray(component)) {
      throw new TypeError('Each nutrition component must be an object.');
    }
    const name = String(component.name || '').trim();
    const amount = Number(component.amount);
    const unit = String(component.unit || '').trim();
    if (!name || !Number.isFinite(amount) || amount < 0 || !unit) {
      throw new TypeError('Nutrition components require a name, non-negative amount, and unit.');
    }
    return { ...component, name, amount, unit };
  });
  const name = String(setName ?? '').trim();
  if (!name) throw new TypeError('Nutrition set name is required.');
  return {
    id,
    date,
    meal: 'Набор питания',
    name: `${name} · суточное значение`,
    grams: 100,
    ...macros,
    isNutritionSetAverage: true,
    quantityMode: 'set-average',
    quantityUnit: 'день',
    quantityValue: 1,
    sourceNutritionSetId: setId,
    foodMetadataSnapshot: { categories: [], items: [] },
    nutritionSnapshot: {
      ...macros,
      components: componentSnapshots
    }
  };
}
