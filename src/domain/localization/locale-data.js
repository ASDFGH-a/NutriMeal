function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const nested of Object.values(value)) deepFreeze(nested);
  }
  return value;
}

export const I18N_LOCALES = deepFreeze({
  ru: 'Русский',
  en: 'English'
});

export const I18N_MONTHS = deepFreeze({
  ru: ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
});

export const I18N_WEEKDAYS_SHORT = deepFreeze({
  ru: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'],
  en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
});

export const I18N_MEALS = deepFreeze({
  'Завтрак': { en: 'Breakfast' },
  'Второй завтрак': { en: 'Second breakfast' },
  'Обед': { en: 'Lunch' },
  'Полдник': { en: 'Afternoon snack' },
  'Ужин': { en: 'Dinner' },
  'Поздний ужин': { en: 'Late dinner' },
  'Перекус': { en: 'Snack' }
});
