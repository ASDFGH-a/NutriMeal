export const STANDARD_MEAL_SETS = Object.freeze({
  1: Object.freeze(['Завтрак']),
  2: Object.freeze(['Завтрак', 'Ужин']),
  3: Object.freeze(['Завтрак', 'Обед', 'Ужин']),
  4: Object.freeze(['Завтрак', 'Обед', 'Полдник', 'Ужин']),
  5: Object.freeze(['Завтрак', 'Обед', 'Полдник', 'Ужин', 'Поздний ужин']),
  6: Object.freeze(['Завтрак', 'Второй завтрак', 'Обед', 'Полдник', 'Ужин', 'Поздний ужин'])
});

export const MEAL_SHARE_WEIGHTS = Object.freeze({
  Завтрак: 0.25,
  'Второй завтрак': 0.10,
  Обед: 0.30,
  Полдник: 0.10,
  Ужин: 0.20,
  'Поздний ужин': 0.05
});

const SYSTEM_MEALS = new Set(['Калории за день', 'Набор питания']);
export const DEFAULT_MEAL_COUNT = 5;

export function getStandardMeals(profile = {}) {
  const count = Math.max(1, Math.min(6, Math.round(Number(profile.mealCount) || DEFAULT_MEAL_COUNT)));
  return [...STANDARD_MEAL_SETS[count]];
}

export function getMealShares(profile = {}) {
  const weights = getStandardMeals(profile).map((meal) => MEAL_SHARE_WEIGHTS[meal] || 0);
  const total = weights.reduce((sum, value) => sum + value, 0);
  return total
    ? weights.map((value) => value / total)
    : weights.map(() => 1 / weights.length);
}

export function getDiaryMealOptions(profile = {}, diaryEntries = []) {
  const existingMeals = diaryEntries
    .map((entry) => entry?.meal)
    .filter((meal) => meal && !SYSTEM_MEALS.has(meal));

  return [...new Set([...getStandardMeals(profile), ...existingMeals, 'Перекус'])];
}

export function diaryMealShare(meal, profile = {}) {
  const meals = getStandardMeals(profile);
  const index = meals.indexOf(meal);
  return index < 0 ? null : getMealShares(profile)[index];
}
