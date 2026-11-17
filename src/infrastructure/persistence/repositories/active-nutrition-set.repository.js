export const ACTIVE_NUTRITION_SET_KEY = 'nutrition-active-set-v1';

export function createActiveNutritionSetRepository(storage, logger = console) {
  return {
    load: () => {
      try { return storage.getItem(ACTIVE_NUTRITION_SET_KEY) || ''; }
      catch (error) { logger?.warn?.('Не удалось прочитать активный набор питания', error); return ''; }
    },
    save: id => {
      try { storage.setItem(ACTIVE_NUTRITION_SET_KEY, String(id || '')); return true; }
      catch (error) { logger?.warn?.('Не удалось сохранить активный набор питания', error); return false; }
    }
  };
}
