import { createArrayRepository } from '../storage.js';

export const DIARY_STORAGE_KEY = 'nutrition-diary-v1';

export function createDiaryRepository(storage) {
  return createArrayRepository(storage, DIARY_STORAGE_KEY);
}
