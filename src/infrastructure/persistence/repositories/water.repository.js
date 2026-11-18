import { createArrayRepository } from '../storage.js';

export const WATER_STORAGE_KEY = 'nutrition-water-v1';

export function createWaterRepository(storage) {
  return createArrayRepository(storage, WATER_STORAGE_KEY);
}
