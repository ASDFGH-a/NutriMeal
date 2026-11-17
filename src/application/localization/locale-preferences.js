import { SUPPORTED_LOCALES, resolveLocale, isSupportedLocale } from '../../domain/localization/locale-validation.js';

export function createLocalePreferences({
  repository,
  supportedLocales = SUPPORTED_LOCALES,
  fallbackLocale = 'ru'
} = {}) {
  if (!repository || typeof repository.load !== 'function' || typeof repository.save !== 'function') {
    throw new TypeError('Locale preferences require a repository with load() and save()');
  }

  const safeFallback = resolveLocale(null, supportedLocales, fallbackLocale);
  let currentLocale = safeFallback;

  return {
    loadInitialLocale() {
      let savedLocale = null;
      try {
        savedLocale = repository.load();
      } catch {
        // Storage failures must not prevent application startup.
      }
      currentLocale = resolveLocale(savedLocale, supportedLocales, safeFallback);
      return currentLocale;
    },

    setLocale(nextLocale) {
      if (!isSupportedLocale(nextLocale, supportedLocales)) {
        return { accepted: false, locale: currentLocale, persisted: false };
      }

      let persisted = false;
      try {
        persisted = repository.save(nextLocale) !== false;
      } catch {
        // The current session can still switch even if persistence is unavailable.
      }
      currentLocale = nextLocale;
      return { accepted: true, locale: currentLocale, persisted };
    },

    getLocale() {
      return currentLocale;
    }
  };
}
