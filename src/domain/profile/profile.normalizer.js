import {
  DEFAULT_PROFILE,
  PROFILE_ACTIVITY_LEVELS,
  PROFILE_WEEKDAYS
} from './profile.model.js';

function uniqueStrings(values) {
  if (!Array.isArray(values)) return [];
  const seen = new Set();
  const result = [];
  for (const value of values) {
    const clean = String(value ?? '').trim();
    const key = clean.toLocaleLowerCase('ru-RU');
    if (clean && !seen.has(key)) {
      seen.add(key);
      result.push(clean);
    }
  }
  return result;
}

const LEGACY_ACTIVITY_FACTORS = Object.freeze({
  'Преимущественно сижу': 1.20,
  'Сижу, но регулярно хожу': 1.375,
  'Большую часть дня стою или хожу': 1.55,
  'Физическая работа, много движения и нагрузок': 1.725
});

export function normalizeProfileData(data = {}, defaults = DEFAULT_PROFILE) {
  const source = data && typeof data === 'object' && !Array.isArray(data) ? data : {};
  const normalized = { ...defaults, ...source };

  normalized.trainingDays = Array.isArray(normalized.trainingDays)
    ? normalized.trainingDays.filter(day => PROFILE_WEEKDAYS.includes(day))
    : [];
  if (normalized.trainingFrequency === 'Нет регулярных тренировок') normalized.trainingDays = [];

  normalized.allergies = uniqueStrings(normalized.allergies);
  normalized.foodRestrictions = uniqueStrings(normalized.foodRestrictions);
  normalized.sex = ['Мужской', 'Женский'].includes(normalized.sex) ? normalized.sex : '';
  normalized.birthDate = typeof normalized.birthDate === 'string' ? normalized.birthDate : '';

  const legacy = String(source.dailyActivity || '');
  let factor = Object.prototype.hasOwnProperty.call(source, 'activityFactor')
    ? Number(source.activityFactor)
    : (legacy ? LEGACY_ACTIVITY_FACTORS[legacy] : Number(normalized.activityFactor));
  if (!PROFILE_ACTIVITY_LEVELS.some(item => Math.abs(item.factor - factor) < 0.001)) factor = 1.375;
  normalized.activityFactor = PROFILE_ACTIVITY_LEVELS.find(item => Math.abs(item.factor - factor) < 0.001).factor;
  delete normalized.dailyActivity;
  return normalized;
}
