import { assertObjectRepositoryPort } from '../../../contracts/storage.contract.js';
import { normalizeProfileData } from '../../../domain/profile/profile.model.js';

export function saveProfile({ profile, repository }) {
  if (!profile || typeof profile !== 'object' || Array.isArray(profile)) {
    throw new TypeError('Profile data is required.');
  }
  assertObjectRepositoryPort(repository);
  const normalized = normalizeProfileData(profile);
  repository.save(normalized);
  return normalized;
}
