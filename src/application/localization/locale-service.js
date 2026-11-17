import { DEFAULT_LOCALE } from '../../domain/localization/locale.constants.js';

/** Application-level locale state; effects are injected and DOM-independent. */
export function createLocaleService({ storage, onChange = () => {} }) {
  let current = storage?.read?.() ?? DEFAULT_LOCALE;
  if (current !== 'ru' && current !== 'en') current = DEFAULT_LOCALE;

  return {
    getLocale() { return current; },
    initialize() {
      onChange(current);
      return current;
    },
    setLocale(nextLocale) {
      if (nextLocale !== 'ru' && nextLocale !== 'en') {
        return { changed: false, locale: current, reason: 'unsupported-locale' };
      }
      if (nextLocale === current) {
        return { changed: false, locale: current, reason: 'unchanged' };
      }
      current = nextLocale;
      storage?.write?.(current);
      onChange(current);
      return { changed: true, locale: current };
    }
  };
}
