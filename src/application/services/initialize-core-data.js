import { createSeedCatalog } from '../../domain/catalog/catalog-seed.js';
import { migrateLegacyPlanWeeklyGoals, resolveActiveNutritionSetId } from '../../domain/nutrition-set/nutrition-set.model.js';
import {
  getCurrentMeasurementValues,
  getMeasurementProfileHeight
} from '../../domain/measurement/measurement.model.js';

function assertInitializationDependencies(catalog, repositories) {
  if (!catalog || !Array.isArray(catalog.products) || !Array.isArray(catalog.recipes)) {
    throw new TypeError('Catalog seed data must contain product and recipe arrays.');
  }
  if (!repositories || typeof repositories !== 'object') {
    throw new TypeError('Core repositories are required.');
  }
  const methods = {
    profile: ['load', 'save'],
    plan: ['load', 'save'],
    weightHistory: ['load', 'save'],
    measurementHistory: ['load', 'save'],
    nutritionSets: ['load', 'save', 'hasStoredValue'],
    activeNutritionSet: ['load', 'save'],
    planPresets: ['load', 'save'],
    catalogCardSettings: ['load', 'save'],
    theme: ['load', 'save'],
    diary: ['load', 'save'],
    water: ['load', 'save']
  };
  for (const [name, requiredMethods] of Object.entries(methods)) {
    const repository = repositories[name];
    if (!repository || requiredMethods.some((method) => typeof repository[method] !== 'function')) {
      throw new TypeError(`The "${name}" repository is missing or incomplete.`);
    }
  }
}

/** @param {{catalog: {products: Array, recipes: Array}, repositories: Object}} dependencies */
export function initializeCoreData({ catalog = createSeedCatalog(), repositories } = {}) {
  assertInitializationDependencies(catalog, repositories);
  const {
    profile: profileRepository,
    plan: planRepository,
    weightHistory: weightHistoryRepository,
    measurementHistory: measurementHistoryRepository,
    nutritionSets: nutritionSetsRepository,
    activeNutritionSet: activeNutritionSetRepository,
    planPresets: planPresetsRepository,
    catalogCardSettings: catalogCardSettingsRepository,
    theme: themeRepository,
    diary: diaryRepository,
    water: waterRepository
  } = repositories;
  const plan = planRepository.load();
  const weightHistory = weightHistoryRepository.load();
  const measurementHistory = measurementHistoryRepository.load();
  const profile = profileRepository.load();
  const latestWeight = weightHistory
    .filter((record) => (
      record
      && typeof record.date === 'string'
      && Number.isFinite(Number(record.weight))
      && Number(record.weight) > 0
    ))
    .map((record) => ({ date: record.date, weight: Number(record.weight) }))
    .sort((left, right) => right.date.localeCompare(left.date))[0];
  let nutritionSets = nutritionSetsRepository.load();
  if (!nutritionSetsRepository.hasStoredValue()) {
    nutritionSetsRepository.save(nutritionSets);
  }
  const storedActiveNutritionSetId = activeNutritionSetRepository.load();
  const activeNutritionSetId = resolveActiveNutritionSetId(nutritionSets, storedActiveNutritionSetId);
  if (activeNutritionSetId !== storedActiveNutritionSetId) {
    activeNutritionSetRepository.save(activeNutritionSetId);
  }
  const goalMigration = migrateLegacyPlanWeeklyGoals(
    nutritionSets,
    activeNutritionSetId,
    plan,
    catalog.products
  );
  if (goalMigration.migrated) {
    nutritionSets = goalMigration.sets;
    nutritionSetsRepository.save(nutritionSets);
  }

  if (latestWeight) {
    profile.currentWeight = latestWeight.weight;
  }
  const latestMeasurementHeight = getMeasurementProfileHeight(measurementHistory);
  if (latestMeasurementHeight !== null) {
    profile.height = latestMeasurementHeight;
  }
  if (latestWeight || latestMeasurementHeight !== null) {
    profileRepository.save(profile);
  }

  return {
    ...catalog,
    collections: [],
    catalogCardSettings: catalogCardSettingsRepository.load(),
    theme: themeRepository.load(),
    diaryEntries: diaryRepository.load(),
    waterEntries: waterRepository.load(),
    weightHistory,
    measurementHistory,
    measurements: getCurrentMeasurementValues(measurementHistory),
    profile,
    plan,
    planPresets: planPresetsRepository.load(),
    nutritionSets,
    activeNutritionSetId
  };
}
