export const LOCALE_PREFERENCE_STORAGE_KEY = 'nutrition-locale';

/**
 * Stores the locale as a raw string, matching the existing v60 localStorage
 * contract (setItem('nutrition-locale', 'en')), not as JSON.
 */
export function createLocalePreferencesRepository(
  storage,
  { key = LOCALE_PREFERENCE_STORAGE_KEY, logger = console } = {}
) {
  if (!storage || typeof storage.getItem !== 'function' || typeof storage.setItem !== 'function') {
    throw new TypeError('Locale preferences repository requires a Storage-like object');
  }

  return {
    load() {
      try {
        return storage.getItem(key);
      } catch (error) {
        logger?.warn?.(`Не удалось прочитать настройку языка: ${key}`, error);
        return null;
      }
    },
    save(locale) {
      try {
        storage.setItem(key, String(locale));
        return true;
      } catch (error) {
        logger?.warn?.(`Не удалось сохранить настройку языка: ${key}`, error);
        return false;
      }
    }
  };
}
