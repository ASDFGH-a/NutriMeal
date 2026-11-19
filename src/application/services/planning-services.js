import {
  assertArrayRepositoryPort,
  assertObjectRepositoryPort
} from '../../contracts/storage.contract.js';
import {
  createNutritionSet,
  deleteNutritionSet,
  selectActiveNutritionSet,
  updateNutritionSet,
  updateNutritionSetWeek,
  updateNutritionSetWeeklyGoals
} from '../usecases/planning/nutrition-sets.js';
import { applyPlanPreset, recalculatePlan, savePlan } from '../usecases/planning/plan.js';
import {
  deletePlanPreset,
  renamePlanPreset,
  savePlanPreset
} from '../usecases/planning/plan-presets.js';

/**
 * @param {Object} dependencies
 * @param {import('../../contracts/storage.contract.js').ObjectRepositoryPort} dependencies.planRepository
 * @param {import('../../contracts/storage.contract.js').ArrayRepositoryPort} dependencies.presetRepository
 * @param {import('../../contracts/storage.contract.js').ArrayRepositoryPort} dependencies.nutritionSetRepository
 * @param {Object} dependencies.activeNutritionSetRepository
 * @param {Array<Object>} [dependencies.products]
 */
export function createPlanningServices({
  planRepository,
  presetRepository,
  nutritionSetRepository,
  activeNutritionSetRepository,
  products = []
} = {}) {
  assertObjectRepositoryPort(planRepository);
  assertArrayRepositoryPort(presetRepository);
  assertArrayRepositoryPort(nutritionSetRepository);
  assertObjectRepositoryPort(activeNutritionSetRepository);
  if (!Array.isArray(products)) throw new TypeError('Products must be an array.');

  const withSetRepositories = (command) => ({
    ...command,
    repository: nutritionSetRepository,
    activeRepository: activeNutritionSetRepository,
    products: command.products ?? products
  });

  return {
    loadPlan: () => planRepository.load(),
    recalculatePlan: (command) => recalculatePlan(command),
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
