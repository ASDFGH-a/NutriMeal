export const I18N_LOCALES = Object.freeze({
  ru: 'Русский',
  en: 'English',
  es: 'Español',
  fr: 'Français'
});

export const I18N_MONTHS = Object.freeze({
  ru: Object.freeze(['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь']),
  en: Object.freeze(['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']),
  es: Object.freeze(['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']),
  fr: Object.freeze(['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'])
});

export const I18N_WEEKDAYS_SHORT = Object.freeze({
  ru: Object.freeze(['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']),
  en: Object.freeze(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']),
  es: Object.freeze(['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']),
  fr: Object.freeze(['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'])
});

export const I18N_MEALS = Object.freeze({
  Завтрак: Object.freeze({ en: 'Breakfast', es: 'Desayuno', fr: 'Petit-déjeuner' }),
  'Второй завтрак': Object.freeze({ en: 'Second breakfast', es: 'Segundo desayuno', fr: 'Deuxième petit-déjeuner' }),
  Обед: Object.freeze({ en: 'Lunch', es: 'Comida', fr: 'Déjeuner' }),
  Полдник: Object.freeze({ en: 'Afternoon snack', es: 'Merienda', fr: 'Collation' }),
  Ужин: Object.freeze({ en: 'Dinner', es: 'Cena', fr: 'Dîner' }),
  'Поздний ужин': Object.freeze({ en: 'Late dinner', es: 'Cena tardía', fr: 'Dîner tardif' }),
  Перекус: Object.freeze({ en: 'Snack', es: 'Picoteo', fr: 'En-cas' })
});
