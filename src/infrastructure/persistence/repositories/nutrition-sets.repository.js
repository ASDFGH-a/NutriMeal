import { createDefaultNutritionSets } from '../../../domain/nutrition-set/nutrition-set.defaults.js';
import { normalizeNutritionSet } from '../../../domain/nutrition-set/nutrition-set.model.js';

export const NUTRITION_SETS_STORAGE_KEY = 'nutrition-sets-v1';

export function createNutritionSetsRepository(storage, products) {
  if (!storage || typeof storage.getItem !== 'function' || typeof storage.setItem !== 'function') {
    throw new TypeError('An object with getItem and setItem methods is required.');
  }
  if (!Array.isArray(products)) throw new TypeError('Products must be an array.');

  return {
    load() {
      const serialized = storage.getItem(NUTRITION_SETS_STORAGE_KEY);
      if (serialized === null) return createDefaultNutritionSets(products);

      const value = JSON.parse(serialized);
      if (!Array.isArray(value)) return createDefaultNutritionSets(products);
      return value.map((set, index) => normalizeNutritionSet(set, index, products));
    },
    save(sets) {
      if (!Array.isArray(sets)) throw new TypeError('Nutrition sets must be an array.');
      const normalized = sets.map((set, index) => normalizeNutritionSet(set, index, products));
      storage.setItem(NUTRITION_SETS_STORAGE_KEY, JSON.stringify(normalized));
    }
  };
}
