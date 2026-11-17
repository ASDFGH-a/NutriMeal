import { readStoredArray, writeStoredArray } from '../storage.js';

export const DIARY_STORAGE_KEY = 'nutrition-diary-v1';

export function createDiaryRepository(storage, logger = console) {
  return {
    loadAll: () => readStoredArray(storage, DIARY_STORAGE_KEY),
    saveAll: entries => writeStoredArray(
      storage, DIARY_STORAGE_KEY, entries, 'Не удалось сохранить дневник питания', logger
    )
  };
}
