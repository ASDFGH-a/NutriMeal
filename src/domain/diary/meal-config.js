// Pure meal configuration extracted from PWA v60 R02.
export const standardMealSets = Object.freeze({
  1: ['Завтрак'],
  2: ['Завтрак', 'Ужин'],
  3: ['Завтрак', 'Обед', 'Ужин'],
  4: ['Завтрак', 'Обед', 'Полдник', 'Ужин'],
  5: ['Завтрак', 'Обед', 'Полдник', 'Ужин', 'Поздний ужин'],
  6: ['Завтрак', 'Второй завтрак', 'Обед', 'Полдник', 'Ужин', 'Поздний ужин']
});

export const mealShareWeights = Object.freeze({
  'Завтрак': 0.25,
  'Второй завтрак': 0.10,
  'Обед': 0.30,
  'Полдник': 0.10,
  'Ужин': 0.20,
  'Поздний ужин': 0.05
});

export function getStandardMeals(mealCount = 5) {
  const count = Math.max(1, Math.min(6, Math.round(Number(mealCount) || 5)));
  return [...standardMealSets[count]];
}

export function getMealShares(mealCount = 5) {
  const meals = getStandardMeals(mealCount);
  const weights = meals.map(meal => mealShareWeights[meal] || 0);
  const total = weights.reduce((sum, value) => sum + value, 0);
  return total ? weights.map(value => value / total) : weights.map(() => 1 / weights.length);
}

export function getDiaryMealOptions(mealCount = 5, diaryEntries = []) {
  return [...new Set([
    ...getStandardMeals(mealCount),
    ...diaryEntries.map(entry => entry.meal).filter(meal =>
      meal && !['Калории за день', 'Набор питания'].includes(meal)
    ),
    'Перекус'
  ])];
}

export function diaryMealShare(mealCount = 5, meal) {
  const meals = getStandardMeals(mealCount);
  const index = meals.indexOf(meal);
  return index < 0 ? null : getMealShares(mealCount)[index];
}
