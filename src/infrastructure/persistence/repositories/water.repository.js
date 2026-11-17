import { readStoredArray, writeStoredArray } from '../storage.js';

export const WATER_STORAGE_KEY = 'nutrition-water-v1';

export function createWaterRepository(storage, logger = console) {
  return {
    loadAll: () => readStoredArray(storage, WATER_STORAGE_KEY),
    saveAll: entries => writeStoredArray(
      storage, WATER_STORAGE_KEY, entries, 'Не удалось сохранить записи воды', logger
    )
  };
}
