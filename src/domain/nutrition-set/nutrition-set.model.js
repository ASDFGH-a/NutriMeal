function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function emptyNutritionWeek() {
  return { mainDishes: [], snacks: [], productIds: [] };
}

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

export function normalizeNutritionWeek(week = {}, weekIndex = 0, products = []) {
  if (!Array.isArray(products)) throw new TypeError('Products must be an array.');

  const legacyDishes = [
    ...(week?.firstDishId ? [{ id: `legacy-main-${weekIndex + 1}-1`, recipeId: String(week.firstDishId) }] : []),
    ...(week?.secondDishId ? [{ id: `legacy-main-${weekIndex + 1}-2`, recipeId: String(week.secondDishId) }] : [])
  ];
  const mainSource = Array.isArray(week?.mainDishes) ? week.mainDishes : legacyDishes;
  const snackSource = Array.isArray(week?.snacks) ? week.snacks : [];
  const availableProductIds = new Set(products.map((product) => String(product?.id)));

  return {
    mainDishes: mainSource.map((dish, index) => normalizeNutritionDish(dish, index, `main-${weekIndex + 1}`)),
    snacks: snackSource.map((dish, index) => normalizeNutritionDish(dish, index, `snack-${weekIndex + 1}`)),
    productIds: Array.isArray(week?.productIds)
      ? [...new Set(week.productIds.map(String).filter((id) => availableProductIds.has(id)))]
      : []
  };
}

function normalizeGoals(goals) {
  const source = isRecord(goals) ? goals : {};
  return {
    completeness: isRecord(source.completeness) ? { ...source.completeness } : {},
    frequency: isRecord(source.frequency) ? { ...source.frequency } : {},
    diversity: isRecord(source.diversity) ? { ...source.diversity } : {}
  };
}

export function normalizeNutritionSet(item, index = 0, products = []) {
  if (!Array.isArray(products)) throw new TypeError('Products must be an array.');
  const source = isRecord(item) ? item : {};
  const weeks = Array.isArray(source.weeks) ? source.weeks.slice(0, 4) : [];
  while (weeks.length < 4) weeks.push(emptyNutritionWeek());

  const goals = isRecord(source.personalWeeklyGoals)
    ? source.personalWeeklyGoals
    : isRecord(source.weeklyGoals)
      ? source.weeklyGoals
      : {};

  return {
    id: String(source.id || `nutrition-set-${index + 1}`),
    name: String(source.name || `Набор ${String.fromCharCode(65 + index)}`),
    comment: String(source.comment ?? ''),
    weeks: weeks.map((week, weekIndex) => normalizeNutritionWeek(week, weekIndex, products)),
    personalWeeklyGoals: normalizeGoals(goals)
  };
}

export function getActiveNutritionSet(sets, activeId) {
  if (!Array.isArray(sets)) throw new TypeError('Nutrition sets must be an array.');
  return sets.find((set) => String(set.id) === String(activeId))
    || sets[0]
    || null;
}

export function resolveActiveNutritionSetId(sets, activeId) {
  return getActiveNutritionSet(sets, activeId)?.id || '';
}

export function getPlannerWeekCompletion(week) {
  return [...(week?.mainDishes || []), ...(week?.snacks || [])]
    .filter((dish) => dish?.recipeId)
    .length;
}

export function hasWeeklyGoals(goals) {
  return Boolean(goals && Object.values(goals).some((group) => (
    isRecord(group) && Object.keys(group).length > 0
  )));
}

export function migrateLegacyPlanWeeklyGoals(sets, activeId, plan, products = []) {
  if (!Array.isArray(sets)) throw new TypeError('Nutrition sets must be an array.');
  const activeSet = getActiveNutritionSet(sets, activeId);
  const legacyGoals = plan?.personalWeeklyGoals;
  if (!activeSet || !hasWeeklyGoals(legacyGoals) || hasWeeklyGoals(activeSet.personalWeeklyGoals)) {
    return { sets, migrated: false };
  }

  const goals = normalizeGoals(legacyGoals);
  const nextSets = sets.map((set) => (
    String(set.id) === String(activeSet.id)
      ? normalizeNutritionSet({ ...set, personalWeeklyGoals: goals }, 0, products)
      : set
  ));
  return { sets: nextSets, migrated: true };
}

export function withNutritionSetWeeklyGoals(set, goals, products = []) {
  if (!isRecord(set)) throw new TypeError('A nutrition set is required.');
  const previous = normalizeGoals(set.personalWeeklyGoals);
  const nextGoals = {
    completeness: isRecord(goals?.completeness) ? { ...goals.completeness } : {},
    frequency: previous.frequency,
    diversity: isRecord(goals?.diversity) ? { ...goals.diversity } : {}
  };
  return normalizeNutritionSet({ ...set, personalWeeklyGoals: nextGoals }, 0, products);
}
