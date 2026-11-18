import { normalizeProfileData } from '../../../domain/profile/profile.model.js';
import { createObjectRepository } from '../storage.js';

export const PROFILE_STORAGE_KEY = 'nutrition-profile-v1';

export function createProfileRepository(storage) {
  return createObjectRepository(storage, PROFILE_STORAGE_KEY, normalizeProfileData);
}
