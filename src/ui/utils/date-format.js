export function dateLabel(date, locale = 'ru-RU') {
  return date.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
}

export function readableDate(key, locale = 'ru-RU') {
  const [year, month, day] = String(key).split('-').map(Number);
  if (!year || !month || !day) return key;
  return new Date(year, month - 1, day).toLocaleDateString(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

export function monthLabel(date, locale = 'ru-RU') {
  const month = date.toLocaleDateString(locale, { month: 'long' });
  const language = locale.split('-')[0];
  return `${month.charAt(0).toLocaleUpperCase(language)}${month.slice(1)}, ${date.getFullYear()}`;
}
