import { assertKeyValueStoragePort } from '../../contracts/storage.contract.js';
import { createActiveNutritionSetRepository } from '../../infrastructure/persistence/repositories/active-nutrition-set.repository.js';
import { createNutritionSetsRepository } from '../../infrastructure/persistence/repositories/nutrition-sets.repository.js';
import { createPlanPresetsRepository } from '../../infrastructure/persistence/repositories/plan-presets.repository.js';
import { createPlanRepository } from '../../infrastructure/persistence/repositories/plan.repository.js';
import {
  createNutritionSet,
  deleteNutritionSet,
  selectActiveNutritionSet,
  updateNutritionSet,
  updateNutritionSetWeek,
  updateNutritionSetWeeklyGoals
} from '../usecases/planning/nutrition-sets.js';
import { applyPlanPreset, savePlan } from '../usecases/planning/plan.js';
import {
  deletePlanPreset,
  renamePlanPreset,
  savePlanPreset
} from '../usecases/planning/plan-presets.js';

/**
 * @param {import('../../contracts/storage.contract.js').KeyValueStoragePort} storage
 * @param {Array<Object>} products
 */
export function createPlanningServices(storage, products = []) {
  assertKeyValueStoragePort(storage);
  if (!Array.isArray(products)) throw new TypeError('Products must be an array.');

  const planRepository = createPlanRepository(storage);
  const presetRepository = createPlanPresetsRepository(storage);
  const nutritionSetRepository = createNutritionSetsRepository(storage, products);
  const activeNutritionSetRepository = createActiveNutritionSetRepository(storage);
  const withSetRepositories = (command) => ({
    ...command,
    repository: nutritionSetRepository,
    activeRepository: activeNutritionSetRepository,
    products: command.products ?? products
  });

  return {
    loadPlan: () => planRepository.load(),
    savePlan: ({ plan }) => savePlan({ plan, repository: planRepository }),
    applyPlanPreset: (command) => {
      const result = applyPlanPreset(command);
      return { ...result, plan: savePlan({ plan: result.plan, repository: planRepository }) };
    },
    loadPlanPresets: () => presetRepository.load(),
    savePlanPreset: (command) => {
      const result = savePlanPreset(command);
      presetRepository.save(result.presets);
      return result;
    },
    renamePlanPreset: (presets, id, name, updatedAt) => {
      const result = renamePlanPreset(presets, id, name, updatedAt);
      presetRepository.save(result.presets);
      return result;
    },
    deletePlanPreset: (presets, id) => {
      const result = deletePlanPreset(presets, id);
      presetRepository.save(result.presets);
      return result;
    },
    loadNutritionSets: () => nutritionSetRepository.load(),
    saveNutritionSets: (sets) => nutritionSetRepository.save(sets),
    loadActiveNutritionSetId: () => activeNutritionSetRepository.load(),
    createNutritionSet: (command) => createNutritionSet(withSetRepositories(command)),
    updateNutritionSet: (command) => updateNutritionSet(withSetRepositories(command)),
    updateNutritionSetWeek: (command) => updateNutritionSetWeek(withSetRepositories(command)),
    updateNutritionSetWeeklyGoals: (command) => updateNutritionSetWeeklyGoals(withSetRepositories(command)),
    selectActiveNutritionSet: (command) => selectActiveNutritionSet(withSetRepositories(command)),
    deleteNutritionSet: (command) => deleteNutritionSet(withSetRepositories(command))
  };
}
