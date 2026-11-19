import { diaryMealShare, getMealShares, getStandardMeals } from './meal-config.js';

export function macrosFor(entries) {
  return entries.reduce((totals, entry) => ({
    kcal: totals.kcal + (Number(entry.kcal) || 0),
    p: totals.p + (Number(entry.p) || 0),
    f: totals.f + (Number(entry.f) || 0),
    c: totals.c + (Number(entry.c) || 0)
  }), { kcal: 0, p: 0, f: 0, c: 0 });
}

export function scaleNutritionByGrams(nutrition, grams) {
  if (!nutrition || typeof nutrition !== 'object') throw new TypeError('Nutrition values are required.');
  const amount = Number(grams);
  if (!Number.isFinite(amount) || amount < 0) throw new RangeError('Food quantity must be a non-negative number.');
  return Object.fromEntries(['kcal', 'p', 'f', 'c'].map((key) => {
    const value = Number(nutrition[key]);
    if (!Number.isFinite(value)) throw new TypeError(`Nutrition value for ${key} must be finite.`);
    return [key, value * amount / 100];
  }));
}

export function getMealNutritionTargets(daily, targets, profile) {
  const meals = getStandardMeals(profile);
  const shares = getMealShares(profile);
  return meals.map((meal, index) => {
    const share = Number(shares[index] ?? (1 / meals.length));
    return {
      meal,
      share,
      sharePercent: Math.round(share * 100),
      kcal: Math.round((daily.kcal || 0) * share),
      protein: Math.round((daily.p || 0) * share * 10) / 10,
      fat: Math.round((daily.f || 0) * share * 10) / 10,
      carbs: Math.round((daily.c || 0) * share * 10) / 10,
      targetKcal: targets.kcal * share
    };
  });
}

export function getNutritionGoalProgress(averages, plan) {
  if (!averages || typeof averages !== 'object') throw new TypeError('Nutrition averages are required.');
  if (!plan || typeof plan !== 'object') throw new TypeError('A nutrition plan is required.');

  const calorieTarget = Number(plan.kcal) || 0;
  const macros = Object.fromEntries(['p', 'f', 'c'].map((key) => {
    const target = Number(plan[key]);
    const actual = averages[key] ?? null;
    return [key, {
      actual,
      target: target || 0,
      percent: actual !== null && target > 0
        ? actual / target * 100
        : null
    }];
  }));
  const calorieActual = averages.kcal ?? null;
  return {
    calories: {
      actual: calorieActual,
      target: calorieTarget,
      percent: calorieTarget && calorieActual !== null ? calorieActual / calorieTarget * 100 : null
    },
    macros
  };
}

export function getMealNutritionSummary(entries, meal, plan, profile) {
  if (!Array.isArray(entries)) throw new TypeError('Meal entries must be an array.');
  if (!plan || typeof plan !== 'object') throw new TypeError('A nutrition plan is required.');

  const total = macrosFor(entries);
  const share = diaryMealShare(meal, profile);
  const targetKcal = Number.isFinite(share) ? Math.round(plan.kcal * share) : null;
  return {
    total,
    targetKcal,
    progress: targetKcal ? Math.min(total.kcal / targetKcal * 100, 100) : 0
  };
}

export function isCalorieOnlyEntry(entry) {
  return Boolean(entry?.calorieOnly === true || entry?.quantityMode === 'calorie-only');
}

export function isNutritionSetAverageEntry(entry) {
  return Boolean(entry?.isNutritionSetAverage === true || entry?.quantityMode === 'set-average');
}

export function isMassSystemEntry(entry) {
  return isCalorieOnlyEntry(entry) || isNutritionSetAverageEntry(entry);
}
