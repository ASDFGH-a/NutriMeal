import { createDefaultProfile } from './profile.defaults.js';
import { uniqueProductValues } from '../shared/filter-utils.js';

export const PROFILE_ACTIVITY_LEVELS = Object.freeze([
  { label: 'Минимальная', factor: 1.20 },
  { label: 'Низкая', factor: 1.375 },
  { label: 'Умеренная', factor: 1.55 },
  { label: 'Высокая', factor: 1.725 },
  { label: 'Очень высокая', factor: 1.90 }
]);

const PROFILE_WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const LEGACY_ACTIVITY_FACTORS = {
  'Преимущественно сижу': 1.20,
  'Сижу, но регулярно хожу': 1.375,
  'Большую часть дня стою или хожу': 1.55,
  'Физическая работа, много движения и нагрузок': 1.725
};

export function getActivityLevel(factor) {
  return PROFILE_ACTIVITY_LEVELS.find((item) => Math.abs(item.factor - Number(factor)) < 0.001)
    || PROFILE_ACTIVITY_LEVELS[1];
}

export function normalizeProfileData(data = {}, defaults = createDefaultProfile()) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new TypeError('Profile data must be an object.');
  }
  if (!defaults || typeof defaults !== 'object' || Array.isArray(defaults)) {
    throw new TypeError('Profile defaults must be an object.');
  }

  const normalized = { ...defaults, ...data };
  normalized.trainingDays = Array.isArray(normalized.trainingDays)
    ? normalized.trainingDays.filter((day) => PROFILE_WEEKDAYS.includes(day))
    : [];
  if (normalized.trainingFrequency === 'Нет регулярных тренировок') normalized.trainingDays = [];
  normalized.allergies = Array.isArray(normalized.allergies)
    ? uniqueProductValues(normalized.allergies)
    : [];
  normalized.foodRestrictions = Array.isArray(normalized.foodRestrictions)
    ? uniqueProductValues(normalized.foodRestrictions)
    : [];
  normalized.sex = ['Мужской', 'Женский'].includes(normalized.sex) ? normalized.sex : '';
  normalized.birthDate = typeof normalized.birthDate === 'string' ? normalized.birthDate : '';

  const legacyActivity = String(data.dailyActivity || '');
  const factor = Object.prototype.hasOwnProperty.call(data, 'activityFactor')
    ? Number(data.activityFactor)
    : legacyActivity
      ? LEGACY_ACTIVITY_FACTORS[legacyActivity]
      : Number(normalized.activityFactor);
  normalized.activityFactor = PROFILE_ACTIVITY_LEVELS.some((item) => Math.abs(item.factor - factor) < 0.001)
    ? getActivityLevel(factor).factor
    : 1.375;
  delete normalized.dailyActivity;

  return normalized;
}
