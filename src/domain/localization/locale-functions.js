import { I18N_MEALS } from './locale-data.js';

export function localeTags(locale) {
  return locale === 'ru' ? 'ru-RU' : locale;
}

export function trMeal(name, locale, mealTranslations = I18N_MEALS) {
  const entry = mealTranslations?.[name];
  return entry && locale !== 'ru' ? entry[locale] : name;
}
