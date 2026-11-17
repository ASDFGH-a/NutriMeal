import { readStoredArray, writeStoredArray } from '../storage.js';

export const WEIGHT_HISTORY_STORAGE_KEY = 'nutrition-weight-history-v1';

export function createWeightRepository(storage, logger = console) {
  return {
    loadAll: () => readStoredArray(storage, WEIGHT_HISTORY_STORAGE_KEY),
    saveAll: records => writeStoredArray(
      storage, WEIGHT_HISTORY_STORAGE_KEY, records, 'Не удалось сохранить историю веса', logger
    )
  };
}
