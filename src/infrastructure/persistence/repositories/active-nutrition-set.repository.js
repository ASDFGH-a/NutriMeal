export const ACTIVE_NUTRITION_SET_STORAGE_KEY = 'nutrition-active-set-v1';

export function createActiveNutritionSetRepository(storage) {
  if (!storage || typeof storage.getItem !== 'function' || typeof storage.setItem !== 'function') {
    throw new TypeError('An object with getItem and setItem methods is required.');
  }

  return {
    load() {
      return storage.getItem(ACTIVE_NUTRITION_SET_STORAGE_KEY) || '';
    },
    save(id) {
      if (typeof id !== 'string') throw new TypeError('Active nutrition set id must be a string.');
      if (id) {
        storage.setItem(ACTIVE_NUTRITION_SET_STORAGE_KEY, id);
      } else if (typeof storage.removeItem === 'function') {
        storage.removeItem(ACTIVE_NUTRITION_SET_STORAGE_KEY);
      } else {
        storage.setItem(ACTIVE_NUTRITION_SET_STORAGE_KEY, '');
      }
    }
  };
}
