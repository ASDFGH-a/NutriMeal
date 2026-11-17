import { UI_TRANSLATIONS } from './ui-translations.js';

/**
 * Translate an exact, known UI phrase.
 * Unknown text is returned unchanged; this deliberately avoids rewriting
 * user-authored product names, recipe names, notes, diary entries, or profile data.
 */
export function translateText(text, locale = 'ru', translations = UI_TRANSLATIONS) {
  if (text == null) return '';
  const raw = String(text);
  if (locale === 'ru' || locale !== 'en') return raw;

  const leading = raw.match(/^\s*/)?.[0] ?? '';
  const trailing = raw.match(/\s*$/)?.[0] ?? '';
  const key = raw.slice(leading.length, raw.length - trailing.length).toLocaleLowerCase('ru-RU');
  if (!key) return raw;

  const translated = translations?.[key]?.[locale];
  return translated == null ? raw : `${leading}${translated}${trailing}`;
}
