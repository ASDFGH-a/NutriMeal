import { assertObjectRepositoryPort } from '../../contracts/storage.contract.js';
import { saveProfile } from '../usecases/profile/profile.js';

/** @param {import('../../contracts/storage.contract.js').ObjectRepositoryPort} repository */
export function createProfileServices(repository) {
  assertObjectRepositoryPort(repository);
  return {
    saveProfile: ({ profile }) => saveProfile({ profile, repository })
  };
}
