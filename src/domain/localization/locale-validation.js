import { I18N_LOCALES } from './locale-data.js';

export const SUPPORTED_LOCALES = Object.freeze(Object.keys(I18N_LOCALES));

export function isSupportedLocale(locale, supportedLocales = SUPPORTED_LOCALES) {
  return typeof locale === 'string' && supportedLocales.includes(locale);
}

export function resolveLocale(
  candidate,
  supportedLocales = SUPPORTED_LOCALES,
  fallbackLocale = 'ru'
) {
  if (isSupportedLocale(candidate, supportedLocales)) return candidate;
  if (isSupportedLocale(fallbackLocale, supportedLocales)) return fallbackLocale;
  return supportedLocales[0] ?? 'ru';
}
