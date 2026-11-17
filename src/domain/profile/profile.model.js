export const PROFILE_ACTIVITY_LEVELS = Object.freeze([
  { label: 'Минимальная', factor: 1.20 },
  { label: 'Низкая', factor: 1.375 },
  { label: 'Умеренная', factor: 1.55 },
  { label: 'Высокая', factor: 1.725 },
  { label: 'Очень высокая', factor: 1.90 }
]);

export const PROFILE_WEEKDAYS = Object.freeze(['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']);

export const DEFAULT_PROFILE = Object.freeze({
  sex: '',
  birthDate: '',
  height: 166,
  currentWeight: 65.5,
  activityFactor: 1.375,
  trainingFrequency: '1–2 раза в неделю',
  trainingDays: [],
  allergies: [],
  foodRestrictions: [],
  mealCount: 5
});

export function getActivityLevel(factor) {
  return PROFILE_ACTIVITY_LEVELS.find(item => Math.abs(item.factor - Number(factor)) < 0.001)
    || PROFILE_ACTIVITY_LEVELS[1];
}

export function formatActivityFactor(factor) {
  const raw = Number(factor).toFixed(3).replace(/0+$/, '').replace(/\.$/, '');
  const [integer, fraction = ''] = raw.split('.');
  return `${integer},${fraction.padEnd(2, '0')}`;
}
