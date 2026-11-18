import { normalizePlanPreset } from '../../../domain/planning/plan.model.js';
import { createArrayRepository } from '../storage.js';

export const PLAN_PRESETS_STORAGE_KEY = 'nutrition-plan-presets-v1';

export function createPlanPresetsRepository(storage) {
  const repository = createArrayRepository(storage, PLAN_PRESETS_STORAGE_KEY);
  return {
    load() {
      return repository.load()
        .map(normalizePlanPreset)
        .filter(Boolean);
    },
    save(presets) {
      if (!Array.isArray(presets)) throw new TypeError('Plan presets must be an array.');
      const normalized = presets.map(normalizePlanPreset);
      if (normalized.some((preset) => !preset)) {
        throw new TypeError('Every plan preset must have an id, name, and plan.');
      }
      repository.save(normalized);
    }
  };
}
