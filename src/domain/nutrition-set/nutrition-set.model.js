export const NUTRITION_SET_WEEK_COUNT = 4;

export function emptyNutritionWeek() {
  return { mainDishes: [], snacks: [], productIds: [] };
}

export function createDefaultNutritionSets() {
  return [
    {
      id: 'nutrition-set-a', name: 'Набор A',
      weeks: [{ firstDishId: '5', secondDishId: '2', productIds: ['oat', 'egg', 'milk', 'cottage'] }, emptyNutritionWeek(), emptyNutritionWeek(), emptyNutritionWeek()]
    },
    { id: 'nutrition-set-b', name: 'Набор B', weeks: [emptyNutritionWeek(), emptyNutritionWeek(), emptyNutritionWeek(), emptyNutritionWeek()] },
    { id: 'nutrition-set-c', name: 'Набор C', weeks: [emptyNutritionWeek(), emptyNutritionWeek(), emptyNutritionWeek(), emptyNutritionWeek()] }
  ];
}
