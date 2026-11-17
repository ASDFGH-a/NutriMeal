import { readStoredValue, writeStoredValue } from '../storage.js';
import { normalizeProfileData } from '../../../domain/profile/profile.normalizer.js';

export const PROFILE_STORAGE_KEY = 'nutrition-profile-v1';

export function createProfileRepository(storage, logger = console) {
  return {
    load: () => normalizeProfileData(readStoredValue(storage, PROFILE_STORAGE_KEY, null, logger) || {}),
    save: profile => writeStoredValue(storage, PROFILE_STORAGE_KEY, profile, 'Не удалось сохранить профиль', logger)
  };
}
