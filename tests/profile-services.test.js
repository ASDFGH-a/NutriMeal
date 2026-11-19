import assert from 'node:assert/strict';
import test from 'node:test';
import { createProfileServices } from '../src/application/services/profile-services.js';
import { createDefaultProfile } from '../src/domain/profile/profile.defaults.js';
import { PROFILE_STORAGE_KEY } from '../src/infrastructure/persistence/repositories/profile.repository.js';
import { createCoreRepositoriesFromStorage } from './helpers/core-data.js';

function createMemoryStorage() {
  const values = new Map();
  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, value);
    },
    removeItem(key) {
      values.delete(key);
    }
  };
}

test('profile service persists normalized profile data through its repository', () => {
  const storage = createMemoryStorage();
  const services = createProfileServices(createCoreRepositoriesFromStorage(storage).profile);
  const saved = services.saveProfile({
    profile: {
      ...createDefaultProfile(),
      sex: 'Женский',
      height: 171,
      currentWeight: 68,
      trainingDays: ['Пн', 'Некорректный день'],
      allergies: ['Молоко', 'Молоко']
    }
  });

  assert.deepEqual(saved.trainingDays, ['Пн']);
  assert.deepEqual(saved.allergies, ['Молоко']);
  assert.deepEqual(JSON.parse(storage.getItem(PROFILE_STORAGE_KEY)), saved);
});
