export const SUPPORTED_LOCALES = Object.freeze(['ru', 'en']);
export const DEFAULT_LOCALE = 'ru';
export const LOCALE_STORAGE_KEY = 'nutrition-locale';

export function normalizeLocale(value) {
  return SUPPORTED_LOCALES.includes(value) ? value : DEFAULT_LOCALE;
}
