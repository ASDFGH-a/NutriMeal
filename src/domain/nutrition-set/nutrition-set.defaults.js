import { emptyNutritionWeek, normalizeNutritionSet } from './nutrition-set.model.js';

export function createDefaultNutritionSets(products = []) {
  if (!Array.isArray(products)) throw new TypeError('Products must be an array.');
  return [
    {
      id: 'nutrition-set-a',
      name: 'Набор A',
      weeks: [
        { firstDishId: '5', secondDishId: '2', productIds: ['oat', 'egg', 'milk', 'cottage'] },
        emptyNutritionWeek(),
        emptyNutritionWeek(),
        emptyNutritionWeek()
      ]
    },
    {
      id: 'nutrition-set-b',
      name: 'Набор B',
      weeks: [emptyNutritionWeek(), emptyNutritionWeek(), emptyNutritionWeek(), emptyNutritionWeek()]
    },
    {
      id: 'nutrition-set-c',
      name: 'Набор C',
      weeks: [emptyNutritionWeek(), emptyNutritionWeek(), emptyNutritionWeek(), emptyNutritionWeek()]
    }
  ].map((set, index) => normalizeNutritionSet(set, index, products));
}
