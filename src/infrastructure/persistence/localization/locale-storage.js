import { DEFAULT_LOCALE, LOCALE_STORAGE_KEY, normalizeLocale } from '../../../domain/localization/locale.constants.js';

/** Safe adapter for the legacy nutrition-locale key. */
export function createLocaleStorage(storageProvider = () => globalThis.localStorage) {
  return {
    read() {
      try {
        const storage = storageProvider();
        return normalizeLocale(storage?.getItem(LOCALE_STORAGE_KEY));
      } catch {
        return DEFAULT_LOCALE;
      }
    },
    write(locale) {
      const normalized = normalizeLocale(locale);
      try {
        const storage = storageProvider();
        storage?.setItem(LOCALE_STORAGE_KEY, normalized);
        return true;
      } catch {
        return false;
      }
    }
  };
}
