import assert from 'node:assert/strict';
import test from 'node:test';
import {
  deleteMeasurementSnapshot,
  restoreMeasurementSnapshot,
  saveMeasurementSnapshot
} from '../src/application/usecases/measurement/measurement-history.js';
import {
  deleteWeightRecord,
  restoreWeightRecord,
  saveWeightRecord
} from '../src/application/usecases/weight/weight-history.js';

function createRepositories() {
  const saved = { history: null, profile: null };
  return {
    saved,
    historyRepository: { save(history) { saved.history = history; } },
    profileRepository: { save(profile) { saved.profile = profile; } }
  };
}

function weightInput(overrides = {}) {
  return {
    history: [
      { date: '2026-11-16', weight: 65 },
      { date: '2026-11-14', weight: 66 }
    ],
    profile: { currentWeight: 65, height: 166 },
    date: '2026-11-17',
    weight: 64.5,
    today: '2026-11-17',
    ...createRepositories(),
    ...overrides
  };
}

test('weight history upserts by date and synchronizes profile to the latest record', () => {
  const input = weightInput();
  const result = saveWeightRecord(input);
  assert.deepEqual(result.history.map((record) => record.date), [
    '2026-11-17',
    '2026-11-16',
    '2026-11-14'
  ]);
  assert.equal(result.profile.currentWeight, 64.5);
  assert.equal(input.profile.currentWeight, 65);
  assert.equal(input.saved.profile.currentWeight, 64.5);

  const olderResult = saveWeightRecord(weightInput({ date: '2026-11-15', weight: 70 }));
  assert.equal(olderResult.profile.currentWeight, 65);
});

test('weight history edits reject duplicate dates and deletion can be undone', () => {
  const edit = weightInput({ previousDate: '2026-11-14', date: '2026-11-16' });
  assert.throws(() => saveWeightRecord(edit), /already exists/);
  assert.equal(edit.saved.history, null);

  const deleted = deleteWeightRecord(weightInput({ date: '2026-11-16' }));
  assert.equal(deleted.removed.date, '2026-11-16');
  assert.equal(deleted.profile.currentWeight, 66);
  const restored = restoreWeightRecord(weightInput({
    history: deleted.history,
    record: deleted.removed,
    date: undefined,
    weight: undefined
  }));
  assert.deepEqual(restored.history.map((record) => record.date), [
    '2026-11-16',
    '2026-11-14'
  ]);
  assert.equal(restored.profile.currentWeight, 65);
});

test('weight history protects the final record and rejects future or invalid entries', () => {
  const single = weightInput({ history: [{ date: '2026-11-16', weight: 65 }], date: '2026-11-16' });
  const result = deleteWeightRecord(single);
  assert.equal(result.removed, null);
  assert.equal(single.saved.history, null);
  assert.throws(() => saveWeightRecord(weightInput({ date: '2026-11-18' })), /future/);
  assert.throws(() => saveWeightRecord(weightInput({ weight: 501 })), /500 kg/);
});

function measurementInput(overrides = {}) {
  return {
    history: [
      { date: '2026-11-16', values: { height: 165, 'Талия': 80 } },
      { date: '2026-11-14', values: { height: 164, 'Талия': 82 } }
    ],
    profile: { currentWeight: 65, height: 165 },
    date: '2026-11-17',
    values: { height: 166, 'Талия': 78 },
    today: '2026-11-17',
    ...createRepositories(),
    ...overrides
  };
}

test('measurement snapshots upsert, expose current values, and synchronize height', () => {
  const input = measurementInput();
  const result = saveMeasurementSnapshot(input);
  assert.equal(result.history[0].date, '2026-11-17');
  assert.equal(result.profile.height, 166);
  assert.equal(result.measurements.find((measurement) => measurement.name === 'Талия').value, 78);
  assert.equal(input.profile.height, 165);

  const older = saveMeasurementSnapshot(measurementInput({
    date: '2026-11-15',
    values: { height: 160, 'Талия': 90 }
  }));
  assert.equal(older.profile.height, 165);
});

test('deleting and restoring measurements keeps current body values and height in sync', () => {
  const deleted = deleteMeasurementSnapshot(measurementInput({ date: '2026-11-16' }));
  assert.equal(deleted.removed.date, '2026-11-16');
  assert.equal(deleted.profile.height, 164);
  assert.equal(deleted.measurements.find((measurement) => measurement.name === 'Талия').value, 82);

  const restored = restoreMeasurementSnapshot(measurementInput({
    history: deleted.history,
    snapshot: deleted.removed
  }));
  assert.equal(restored.profile.height, 165);
  assert.equal(restored.measurements.find((measurement) => measurement.name === 'Талия').value, 80);
});

test('measurement snapshots enforce date and value boundaries', () => {
  assert.throws(() => saveMeasurementSnapshot(measurementInput({ date: '2026-11-18' })), /future/);
  assert.throws(() => saveMeasurementSnapshot(measurementInput({ values: { height: 79 } })), /80 and 250/);
  assert.throws(() => saveMeasurementSnapshot(measurementInput({
    values: { height: 166, 'Талия': 301 }
  })), /between 0 and 300/);
});
