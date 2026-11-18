import { calculatePlanTargets } from '../../../domain/planning/plan-calculations.js';
import { normalizePlanData } from '../../../domain/planning/plan.model.js';
import {
  assertPlanCalculationResult,
  assertPlanCalculationRequest,
  assertPlanPresetApplicationResult,
  assertPlanPresetArray
} from '../../../contracts/planning.contract.js';

export function recalculatePlan({ profile, plan, referenceDate = new Date() }) {
  assertPlanCalculationRequest({ profile, plan });
  const normalized = normalizePlanData(plan);
  const targets = calculatePlanTargets(profile, normalized, referenceDate);
  if (!targets) return assertPlanCalculationResult({ plan: normalized, targets: null });

  return assertPlanCalculationResult({
    plan: {
      ...normalized,
      goal: targets.goal,
      energyAdjustment: targets.adjustment,
      kcal: targets.kcal,
      p: targets.protein,
      f: targets.fat,
      c: targets.carbs
    },
    targets
  });
}

export function applyPlanPreset({ presets, presetId, profile, plan, referenceDate = new Date() }) {
  assertPlanPresetArray(presets);
  const preset = presets.find((item) => String(item.id) === String(presetId));
  if (!preset) throw new Error(`Plan preset "${presetId}" was not found.`);

  const nextPlan = normalizePlanData({ ...plan, ...preset.plan });
  const result = recalculatePlan({ profile, plan: nextPlan, referenceDate });
  return assertPlanPresetApplicationResult({ preset, ...result });
}
