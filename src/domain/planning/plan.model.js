import { createDefaultPlan } from './plan.defaults.js';

const ALLOWED_PROTEIN_RATES = [0.8, 1, 1.2, 1.4, 1.6, 1.8, 2];

export function normalizeGoalLabel(goal) {
  if (['Набор массы', 'Набор веса'].includes(goal)) return 'Набор веса';
  if (['Снижение жировой массы', 'Сушка', 'Снижение веса'].includes(goal)) return 'Снижение веса';
  return 'Поддержание веса';
}

export function defaultGoalAdjustment(goal) {
  const label = normalizeGoalLabel(goal);
  return label === 'Снижение веса' ? -400 : label === 'Набор веса' ? 300 : 0;
}

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function normalizePlanData(data = {}, defaults = createDefaultPlan()) {
  if (!isRecord(data)) throw new TypeError('Plan data must be an object.');
  if (!isRecord(defaults)) throw new TypeError('Plan defaults must be an object.');

  const normalized = { ...defaults, ...data };
  normalized.goal = normalizeGoalLabel(normalized.goal);
  normalized.targetWeight = Number(normalized.targetWeight) || Number(defaults.targetWeight) || 65;
  normalized.energyAdjustment = Number.isFinite(Number(normalized.energyAdjustment))
    ? Number(normalized.energyAdjustment)
    : defaultGoalAdjustment(normalized.goal);
  normalized.proteinPerKg = normalized.proteinPerKg === null
    || normalized.proteinPerKg === ''
    || normalized.proteinPerKg === undefined
    ? null
    : Number(normalized.proteinPerKg);
  if (!ALLOWED_PROTEIN_RATES.includes(normalized.proteinPerKg)) normalized.proteinPerKg = null;
  normalized.fatPercent = Math.min(35, Math.max(20, Number(normalized.fatPercent) || 30));

  const goals = isRecord(normalized.personalWeeklyGoals)
    ? normalized.personalWeeklyGoals
    : {};
  const frequency = isRecord(goals.frequency) ? { ...goals.frequency } : {};
  normalized.personalWeeklyGoals = {
    ...goals,
    frequency,
    completeness: isRecord(goals.completeness) ? { ...goals.completeness } : { ...frequency },
    diversity: isRecord(goals.diversity) ? { ...goals.diversity } : {}
  };
  return normalized;
}

export function createPlanPresetSnapshot(plan) {
  const normalized = normalizePlanData(plan);
  return {
    goal: normalized.goal,
    targetWeight: normalized.targetWeight,
    energyAdjustment: normalized.energyAdjustment,
    proteinPerKg: normalized.proteinPerKg,
    fatPercent: normalized.fatPercent,
    personalWeeklyGoals: {
      completeness: { ...normalized.personalWeeklyGoals.completeness },
      frequency: { ...normalized.personalWeeklyGoals.frequency },
      diversity: { ...normalized.personalWeeklyGoals.diversity }
    }
  };
}

export function normalizePlanPreset(preset) {
  if (!isRecord(preset) || !preset.id || !preset.name || !isRecord(preset.plan)) return null;
  return {
    ...preset,
    plan: normalizePlanData(preset.plan)
  };
}
