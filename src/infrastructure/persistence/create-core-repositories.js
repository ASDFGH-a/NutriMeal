import { createCatalogCardSettingsRepository } from './repositories/catalog-card-settings.repository.js';
import { createDiaryRepository } from './repositories/diary.repository.js';
import { createMeasurementHistoryRepository } from './repositories/measurement.repository.js';
import { createPlanPresetsRepository } from './repositories/plan-presets.repository.js';
import { createPlanRepository } from './repositories/plan.repository.js';
import { createProfileRepository } from './repositories/profile.repository.js';
import { createActiveNutritionSetRepository } from './repositories/active-nutrition-set.repository.js';
import { createNutritionSetsRepository } from './repositories/nutrition-sets.repository.js';
import { createWaterRepository } from './repositories/water.repository.js';
import { createThemeRepository } from './repositories/theme.repository.js';
import { createWeightHistoryRepository } from './repositories/weight.repository.js';

export function createCoreRepositories(storage, products) {
  return {
    profile: createProfileRepository(storage),
    plan: createPlanRepository(storage),
    weightHistory: createWeightHistoryRepository(storage),
    measurementHistory: createMeasurementHistoryRepository(storage),
    nutritionSets: createNutritionSetsRepository(storage, products),
    activeNutritionSet: createActiveNutritionSetRepository(storage),
    planPresets: createPlanPresetsRepository(storage),
    catalogCardSettings: createCatalogCardSettingsRepository(storage),
    theme: createThemeRepository(storage),
    diary: createDiaryRepository(storage),
    water: createWaterRepository(storage)
  };
}
