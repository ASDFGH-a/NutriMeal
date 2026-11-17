import { DEFAULT_PLAN, normalizeGoalLabel, defaultGoalAdjustment } from './plan.model.js';

function normalizeGoalGroups(value = {}) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const frequency = source.frequency && typeof source.frequency === 'object' ? source.frequency : {};
  return {
    completeness: source.completeness && typeof source.completeness === 'object'
      ? { ...source.completeness }
      : { ...frequency },
    frequency: { ...frequency },
    diversity: source.diversity && typeof source.diversity === 'object' ? { ...source.diversity } : {}
  };
}

export function normalizePlanData(data = {}, defaults = DEFAULT_PLAN) {
  const source = data && typeof data === 'object' && !Array.isArray(data) ? data : {};
  const normalized = { ...defaults, ...source };
  normalized.goal = normalizeGoalLabel(normalized.goal);
  normalized.targetWeight = Number(normalized.targetWeight) || 65;

  normalized.energyAdjustment = Number.isFinite(Number(normalized.energyAdjustment))
    ? Number(normalized.energyAdjustment)
    : defaultGoalAdjustment(normalized.goal);

  normalized.proteinPerKg = normalized.proteinPerKg === null
    || normalized.proteinPerKg === ''
    || normalized.proteinPerKg === undefined
    ? null
    : Number(normalized.proteinPerKg);
  if (![0.8, 1, 1.2, 1.4, 1.6, 1.8, 2].includes(normalized.proteinPerKg)) {
    normalized.proteinPerKg = null;
  }

  normalized.fatPercent = Math.min(35, Math.max(20, Number(normalized.fatPercent) || 30));
  normalized.personalWeeklyGoals = normalizeGoalGroups(normalized.personalWeeklyGoals);
  return normalized;
}

export function normalizePlanPreset(item, defaults = DEFAULT_PLAN) {
  if (!item || typeof item !== 'object' || !item.id || !item.name || !item.plan) return null;
  return {
    ...item,
    plan: normalizePlanData(item.plan, defaults)
  };
}

export function normalizePlanPresets(items, defaults = DEFAULT_PLAN) {
  if (!Array.isArray(items)) return [];
  return items.map(item => normalizePlanPreset(item, defaults)).filter(Boolean);
}

export function clonePlanForPreset(plan) {
  return JSON.parse(JSON.stringify({
    goal: plan.goal,
    targetWeight: plan.targetWeight,
    energyAdjustment: plan.energyAdjustment,
    proteinPerKg: plan.proteinPerKg,
    fatPercent: plan.fatPercent,
    personalWeeklyGoals: plan.personalWeeklyGoals || { completeness: {}, frequency: {}, diversity: {} }
  }));
}
