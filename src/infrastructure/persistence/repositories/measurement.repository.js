import { createArrayRepository } from '../storage.js';

export const MEASUREMENT_HISTORY_STORAGE_KEY = 'nutrition-measurement-history-v1';

export function createMeasurementHistoryRepository(storage) {
  return createArrayRepository(storage, MEASUREMENT_HISTORY_STORAGE_KEY);
}
