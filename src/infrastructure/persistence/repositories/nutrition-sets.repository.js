import { writeStoredArray } from '../storage.js';
import { createDefaultNutritionSets } from '../../../domain/nutrition-set/nutrition-set.model.js';
import { normalizeNutritionSets } from '../../../domain/nutrition-set/nutrition-set.normalizer.js';

export const NUTRITION_SETS_STORAGE_KEY = 'nutrition-sets-v1';

export function createNutritionSetsRepository(storage, { isProductIdValid, logger = console } = {}) {
  if (typeof isProductIdValid !== 'function') {
    throw new TypeError('createNutritionSetsRepository requires isProductIdValid(id)');
  }
  return {
    loadAll: () => {
      let raw;
      try { raw = storage.getItem(NUTRITION_SETS_STORAGE_KEY); }
      catch (error) {
        logger?.warn?.('Не удалось прочитать наборы питания', error);
        return normalizeNutritionSets(createDefaultNutritionSets(), isProductIdValid);
      }
      if (raw == null || raw === '') {
        const defaults = normalizeNutritionSets(createDefaultNutritionSets(), isProductIdValid);
        writeStoredArray(storage, NUTRITION_SETS_STORAGE_KEY, defaults, 'Не удалось сохранить стартовые наборы питания', logger);
        return defaults;
      }
      try {
        const stored = JSON.parse(raw);
        return Array.isArray(stored)
          ? normalizeNutritionSets(stored, isProductIdValid)
          : normalizeNutritionSets(createDefaultNutritionSets(), isProductIdValid);
      } catch (error) {
        logger?.warn?.('Не удалось разобрать наборы питания', error);
        return normalizeNutritionSets(createDefaultNutritionSets(), isProductIdValid);
      }
    },
    saveAll: sets => writeStoredArray(storage, NUTRITION_SETS_STORAGE_KEY, sets, 'Не удалось сохранить наборы питания', logger)
  };
}
