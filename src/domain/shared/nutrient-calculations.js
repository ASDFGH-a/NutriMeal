

/**
 * Агрегация питания за недели планировщика.
 */
export function aggregatePlannerNutrition(weeks, getRecipeById) {
  const weekResults = weeks.map(week => {
    const dayTotals = { kcal: 0, p: 0, f: 0, c: 0 };
    const dishes = [...(week?.mainDishes || []), ...(week?.snacks || [])].filter(d => d?.recipeId);
    let recipeCount = 0;
    dishes.forEach(dish => {
      const recipe = getRecipeById ? getRecipeById(dish.recipeId) : null;
      if (!recipe) return;
      const nutrition = recipeNutrition(recipe);
      Object.keys(dayTotals).forEach(k => { dayTotals[k] += nutrition.total[k] || 0; });
      recipeCount++;
    });
    return { dayTotals, recipeCount };
  });
  const weekSum = { kcal: 0, p: 0, f: 0, c: 0 };
  let totalRecipes = 0;
  weekResults.forEach(r => { Object.keys(weekSum).forEach(k => { weekSum[k] += r.dayTotals[k] || 0; }); totalRecipes += r.recipeCount; });
  const dayAvg = {}; Object.keys(weekSum).forEach(k => { dayAvg[k] = weekSum[k] / 7; });
  return { weekTotals: weekSum, dayAverage: dayAvg, recipeCount: totalRecipes, weeklyDays: 7 };
}


/**
 * Агрегация питания за недели планировщика.
 */
export function aggregatePlannerNutrition(weeks, getRecipeById) {
  const weekResults = weeks.map(week => {
    const dayTotals = { kcal: 0, p: 0, f: 0, c: 0 };
    const dishes = [...(week?.mainDishes || []), ...(week?.snacks || [])].filter(d => d?.recipeId);
    let recipeCount = 0;
    dishes.forEach(dish => {
      const recipe = getRecipeById ? getRecipeById(dish.recipeId) : null;
      if (!recipe) return;
      const nutrition = recipeNutrition(recipe);
      Object.keys(dayTotals).forEach(k => { dayTotals[k] += nutrition.total[k] || 0; });
      recipeCount++;
    });
    return { dayTotals, recipeCount };
  });
  const weekSum = { kcal: 0, p: 0, f: 0, c: 0 };
  let totalRecipes = 0;
  weekResults.forEach(r => { Object.keys(weekSum).forEach(k => { weekSum[k] += r.dayTotals[k] || 0; }); totalRecipes += r.recipeCount; });
  const dayAvg = {}; Object.keys(weekSum).forEach(k => { dayAvg[k] = weekSum[k] / 7; });
  return { weekTotals: weekSum, dayAverage: dayAvg, recipeCount: totalRecipes, weeklyDays: 7 };
}