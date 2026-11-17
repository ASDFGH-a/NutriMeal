import { NUTRITION_SET_WEEK_COUNT, emptyNutritionWeek } from './nutrition-set.model.js';

export function normalizeNutritionDish(dish, index, group) {
  const fallbackId = `${group}-${index + 1}`;
  if (typeof dish === 'string' || typeof dish === 'number') {
    return { id: fallbackId, recipeId: String(dish || '') };
  }
  return {
    id: String(dish?.id || fallbackId),
    recipeId: dish?.recipeId == null ? '' : String(dish.recipeId)
  };
}

export function normalizeNutritionWeek(week = {}, weekIndex = 0, isProductIdValid = () => true) {
  const legacyDishes = [
    ...(week?.firstDishId ? [{ id: `legacy-main-${weekIndex + 1}-1`, recipeId: String(week.firstDishId) }] : []),
    ...(week?.secondDishId ? [{ id: `legacy-main-${weekIndex + 1}-2`, recipeId: String(week.secondDishId) }] : [])
  ];
  const mainSource = Array.isArray(week?.mainDishes) ? week.mainDishes : legacyDishes;
  const snackSource = Array.isArray(week?.snacks) ? week.snacks : [];
  const productIds = Array.isArray(week?.productIds) ? [...new Set(week.productIds.map(String).filter(isProductIdValid))] : [];
  return {
    mainDishes: mainSource.map((dish, index) => normalizeNutritionDish(dish, index, `main-${weekIndex + 1}`)),
    snacks: snackSource.map((dish, index) => normalizeNutritionDish(dish, index, `snack-${weekIndex + 1}`)),
    productIds
  };
}

export function normalizeNutritionSet(item, index = 0, isProductIdValid = () => true) {
  const source = item && typeof item === 'object' ? item : {};
  const weeks = Array.isArray(source.weeks) ? source.weeks.slice(0, NUTRITION_SET_WEEK_COUNT) : [];
  while (weeks.length < NUTRITION_SET_WEEK_COUNT) weeks.push(emptyNutritionWeek());
  const goals = source.personalWeeklyGoals && typeof source.personalWeeklyGoals === 'object'
    ? source.personalWeeklyGoals
    : (source.weeklyGoals && typeof source.weeklyGoals === 'object' ? source.weeklyGoals : {});
  return {
    id: String(source.id || `nutrition-set-${index + 1}`),
    name: String(source.name || `Набор ${String.fromCharCode(65 + index)}`),
    comment: String(source.comment ?? ''),
    weeks: weeks.map((week, weekIndex) => normalizeNutritionWeek(week, weekIndex, isProductIdValid)),
    personalWeeklyGoals: {
      completeness: { ...(goals.completeness || {}) },
      frequency: { ...(goals.frequency || {}) },
      diversity: { ...(goals.diversity || {}) }
    }
  };
}

export function normalizeNutritionSets(items, isProductIdValid = () => true) {
  if (!Array.isArray(items)) return [];
  return items.map((item, index) => normalizeNutritionSet(item, index, isProductIdValid));
}
