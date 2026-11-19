import assert from 'node:assert/strict';
import test from 'node:test';
import { createBodyHistoryServices } from '../src/application/services/body-history-services.js';
import { MEASUREMENT_HISTORY_STORAGE_KEY } from '../src/infrastructure/persistence/repositories/measurement.repository.js';
import { PROFILE_STORAGE_KEY } from '../src/infrastructure/persistence/repositories/profile.repository.js';
import { WEIGHT_HISTORY_STORAGE_KEY } from '../src/infrastructure/persistence/repositories/weight.repository.js';
import { createCoreRepositoriesFromStorage } from './helpers/core-data.js';

function createMemoryStorage() {
  const values = new Map();
  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    }
  };
}

test('body-history service runs use cases with injected repositories', () => {
  const storage = createMemoryStorage();
  const repositories = createCoreRepositoriesFromStorage(storage);
  const services = createBodyHistoryServices({
    weightRepository: repositories.weightHistory,
    measurementRepository: repositories.measurementHistory,
    profileRepository: repositories.profile
  });

  const priorWeight = services.weight.saveRecord({
    history: [],
    profile: {},
    date: '2026-11-17',
    today: '2026-11-17',
    weight: 65
  });
  const weightResult = services.weight.saveRecord({
    history: priorWeight.history,
    profile: priorWeight.profile,
    date: '2026-11-18',
    today: '2026-11-18',
    weight: 64.5
  });
  const priorMeasurement = services.measurements.saveSnapshot({
    history: [],
    profile: weightResult.profile,
    date: '2026-11-17',
    today: '2026-11-18',
    values: { height: 165, 'Талия': 80 }
  });
  const measurementResult = services.measurements.saveSnapshot({
    history: priorMeasurement.history,
    profile: priorMeasurement.profile,
    date: '2026-11-18',
    today: '2026-11-18',
    values: { height: 166, 'Талия': 78 }
  });
  const deletedWeight = services.weight.deleteRecord({
    history: weightResult.history,
    profile: measurementResult.profile,
    date: '2026-11-18',
    today: '2026-11-18'
  });
  const restoredWeight = services.weight.restoreRecord({
    history: deletedWeight.history,
    profile: deletedWeight.profile,
    record: deletedWeight.removed,
    today: '2026-11-18'
  });
  const deletedMeasurement = services.measurements.deleteSnapshot({
    history: measurementResult.history,
    profile: restoredWeight.profile,
    date: '2026-11-18',
    today: '2026-11-18'
  });
  const restoredMeasurement = services.measurements.restoreSnapshot({
    history: deletedMeasurement.history,
    profile: deletedMeasurement.profile,
    snapshot: deletedMeasurement.removed,
    today: '2026-11-18'
  });

  assert.deepEqual(JSON.parse(storage.getItem(WEIGHT_HISTORY_STORAGE_KEY)), [
    { date: '2026-11-18', weight: 64.5 },
    { date: '2026-11-17', weight: 65 }
  ]);
  assert.deepEqual(JSON.parse(storage.getItem(MEASUREMENT_HISTORY_STORAGE_KEY)), [
    { date: '2026-11-18', values: { height: 166, 'Талия': 78 } },
    { date: '2026-11-17', values: { height: 165, 'Талия': 80 } }
  ]);
  assert.equal(JSON.parse(storage.getItem(PROFILE_STORAGE_KEY)).height, 166);
  assert.equal(restoredMeasurement.profile.currentWeight, 64.5);
  assert.throws(() => createBodyHistoryServices({}), /array repository/);
});
