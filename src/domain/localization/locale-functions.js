import { I18N_LOCALES, I18N_MEALS } from './locale-data.js';

export function localeTags(locale = 'ru') {
  if (!I18N_LOCALES[locale]) throw new RangeError(`Unsupported locale "${locale}".`);
  return locale === 'ru' ? 'ru-RU' : locale;
}

export function translateMeal(name, locale = 'ru') {
  if (!I18N_LOCALES[locale]) throw new RangeError(`Unsupported locale "${locale}".`);
  const translations = I18N_MEALS[name];
  return translations && locale !== 'ru' ? translations[locale] : name;
}
