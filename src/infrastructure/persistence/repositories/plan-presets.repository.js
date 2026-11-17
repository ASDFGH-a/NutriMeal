import { readStoredArray, writeStoredArray } from '../storage.js';
import { normalizePlanPresets } from '../../../domain/planning/plan.normalizer.js';

export const PLAN_PRESETS_STORAGE_KEY = 'nutrition-plan-presets-v1';

export function createPlanPresetsRepository(storage, logger = console) {
  return {
    loadAll: () => normalizePlanPresets(readStoredArray(storage, PLAN_PRESETS_STORAGE_KEY)),
    saveAll: presets => writeStoredArray(storage, PLAN_PRESETS_STORAGE_KEY, presets, 'Не удалось сохранить пресеты плана', logger)
  };
}
