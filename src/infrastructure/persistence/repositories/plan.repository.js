import { readStoredValue, writeStoredValue } from '../storage.js';
import { normalizePlanData } from '../../../domain/planning/plan.normalizer.js';

export const PLAN_STORAGE_KEY = 'nutrition-plan-v2';

export function createPlanRepository(storage, logger = console) {
  return {
    load: () => normalizePlanData(readStoredValue(storage, PLAN_STORAGE_KEY, null, logger) || {}),
    save: plan => writeStoredValue(storage, PLAN_STORAGE_KEY, plan, 'Не удалось сохранить план питания', logger)
  };
}
