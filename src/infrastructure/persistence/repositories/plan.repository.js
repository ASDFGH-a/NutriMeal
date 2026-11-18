import { normalizePlanData } from '../../../domain/planning/plan.model.js';
import { createObjectRepository } from '../storage.js';

export const PLAN_STORAGE_KEY = 'nutrition-plan-v2';

export function createPlanRepository(storage) {
  return createObjectRepository(storage, PLAN_STORAGE_KEY, normalizePlanData);
}
