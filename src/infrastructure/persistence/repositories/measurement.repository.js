import { readStoredArray, writeStoredArray } from '../storage.js';

export const MEASUREMENT_HISTORY_STORAGE_KEY = 'nutrition-measurement-history-v1';

export function createMeasurementRepository(storage, logger = console) {
  return {
    loadAll: () => readStoredArray(storage, MEASUREMENT_HISTORY_STORAGE_KEY),
    saveAll: records => writeStoredArray(
      storage, MEASUREMENT_HISTORY_STORAGE_KEY, records, 'Не удалось сохранить историю замеров', logger
    )
  };
}
