export function formatInteger(value, locale = 'ru-RU') {
  return Math.round(value).toLocaleString(locale);
}
