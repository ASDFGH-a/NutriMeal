import { createArrayRepository } from '../storage.js';

export const WEIGHT_HISTORY_STORAGE_KEY = 'nutrition-weight-history-v1';

export function createWeightHistoryRepository(storage) {
  return createArrayRepository(storage, WEIGHT_HISTORY_STORAGE_KEY);
}
