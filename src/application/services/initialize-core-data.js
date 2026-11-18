import { createSeedCatalog } from '../../domain/catalog/catalog-seed.js';
import { createCatalogCardSettingsRepository } from '../../infrastructure/persistence/repositories/catalog-card-settings.repository.js';
import { createDiaryRepository } from '../../infrastructure/persistence/repositories/diary.repository.js';
import { createMeasurementHistoryRepository } from '../../infrastructure/persistence/repositories/measurement.repository.js';
import { createPlanPresetsRepository } from '../../infrastructure/persistence/repositories/plan-presets.repository.js';
import { createPlanRepository } from '../../infrastructure/persistence/repositories/plan.repository.js';
import { createProfileRepository } from '../../infrastructure/persistence/repositories/profile.repository.js';
import { createActiveNutritionSetRepository } from '../../infrastructure/persistence/repositories/active-nutrition-set.repository.js';
import { createNutritionSetsRepository } from '../../infrastructure/persistence/repositories/nutrition-sets.repository.js';
import { createWaterRepository } from '../../infrastructure/persistence/repositories/water.repository.js';
import { createThemeRepository } from '../../infrastructure/persistence/repositories/theme.repository.js';
import { createWeightHistoryRepository } from '../../infrastructure/persistence/repositories/weight.repository.js';
import { migrateLegacyPlanWeeklyGoals, resolveActiveNutritionSetId } from '../../domain/nutrition-set/nutrition-set.model.js';
import {
  getCurrentMeasurementValues,
  getMeasurementProfileHeight
} from '../../domain/measurement/measurement.model.js';
import { assertKeyValueStoragePort } from '../../contracts/storage.contract.js';

/** @param {import('../../contracts/storage.contract.js').KeyValueStoragePort} storage */
export function initializeCoreData(storage) {
  assertKeyValueStoragePort(storage);
  const catalog = createSeedCatalog();
  const profileRepository = createProfileRepository(storage);
  const planRepository = createPlanRepository(storage);
  const plan = planRepository.load();
  const weightHistory = createWeightHistoryRepository(storage).load();
  const measurementHistory = createMeasurementHistoryRepository(storage).load();
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
  const nutritionSetsRepository = createNutritionSetsRepository(storage, catalog.products);
  let nutritionSets = nutritionSetsRepository.load();
  if (!nutritionSetsRepository.hasStoredValue()) {
    nutritionSetsRepository.save(nutritionSets);
  }
  const activeNutritionSetRepository = createActiveNutritionSetRepository(storage);
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
    catalogCardSettings: createCatalogCardSettingsRepository(storage).load(),
    theme: createThemeRepository(storage).load(),
    diaryEntries: createDiaryRepository(storage).load(),
    waterEntries: createWaterRepository(storage).load(),
    weightHistory,
    measurementHistory,
    measurements: getCurrentMeasurementValues(measurementHistory),
    profile,
    plan,
    planPresets: createPlanPresetsRepository(storage).load(),
    nutritionSets,
    activeNutritionSetId
  };
}
