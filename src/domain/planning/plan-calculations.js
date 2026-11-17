import { PROFILE_ACTIVITY_LEVELS } from '../profile/profile.model.js';
import { normalizeGoalLabel, defaultGoalAdjustment } from './plan.model.js';

export function calculateProfileAge(birthDate, referenceDate = new Date()) {
  if (!birthDate) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDate);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day || date > referenceDate) return null;
  let age = referenceDate.getFullYear() - year;
  if (referenceDate.getMonth() + 1 < month || (referenceDate.getMonth() + 1 === month && referenceDate.getDate() < day)) age--;
  return age >= 0 ? age : null;
}

export function calculatePlanTargets(profile, plan, referenceDate = new Date()) {
  const age = calculateProfileAge(profile.birthDate, referenceDate);
  const weight = Number(profile.currentWeight);
  const height = Number(profile.height);
  const factor = Number(profile.activityFactor);
  if (age === null || age < 19 || age > 78
    || !['Мужской', 'Женский'].includes(profile.sex)
    || !(weight > 0) || !(height > 0)
    || !PROFILE_ACTIVITY_LEVELS.some(item => Math.abs(item.factor - factor) < 0.001)) return null;

  const bmr = 10 * weight + 6.25 * height - 5 * age + (profile.sex === 'Мужской' ? 5 : -161);
  const tdee = bmr * factor;
  const goal = normalizeGoalLabel(plan.goal);
  let adjustment = Number(plan.energyAdjustment);
  if (!Number.isFinite(adjustment)) adjustment = defaultGoalAdjustment(goal);
  if (goal === 'Поддержание веса') adjustment = 0;
  if (goal === 'Снижение веса') adjustment = -Math.abs(adjustment || 400);
  if (goal === 'Набор веса') adjustment = Math.abs(adjustment || 300);

  const kcal = Math.max(0, Math.round(tdee + adjustment));
  const training = profile.trainingFrequency && profile.trainingFrequency !== 'Нет регулярных тренировок';
  const proteinRate = Number(plan.proteinPerKg) || (training ? 1.6 : 0.8);
  const protein = Math.max(0, Math.round(weight * proteinRate));
  const fatPercent = Math.min(35, Math.max(20, Number(plan.fatPercent) || 30));
  const fat = Math.max(0, Math.round(kcal * fatPercent / 100 / 9));
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
  return {
    age, weight, height, factor,
    bmr: Math.round(bmr), tdee: Math.round(tdee), adjustment, kcal,
    protein, fat, carbs, proteinRate, fatPercent, goal
  };
}
