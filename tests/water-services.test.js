import assert from 'node:assert/strict';
import test from 'node:test';
import { createWaterServices } from '../src/application/services/water-services.js';
import { WATER_STORAGE_KEY } from '../src/infrastructure/persistence/repositories/water.repository.js';

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

test('water service adds, removes, and restores entries through its repository', () => {
  const storage = createMemoryStorage();
  const services = createWaterServices(storage);
  let entries = [];
  for (const [id, ml] of [[21, 250], [22, 300], [23, 400]]) {
    entries = services.addEntry({
      entries,
      id,
      date: '2026-11-18',
      today: '2026-11-18',
      ml
    });
  }
  const removed = services.removeEntry({ entries, id: '22' });
  const restored = services.restoreEntry({
    entries: removed.entries,
    entry: removed.removed,
    index: removed.index
  });

  assert.deepEqual(restored, [
    { id: 21, date: '2026-11-18', ml: 250 },
    { id: 22, date: '2026-11-18', ml: 300 },
    { id: 23, date: '2026-11-18', ml: 400 }
  ]);
  assert.deepEqual(JSON.parse(storage.getItem(WATER_STORAGE_KEY)), restored);
});

test('water service preserves the list and avoids writes when removal target is missing', () => {
  const storage = createMemoryStorage();
  const services = createWaterServices(storage);
  const entries = [{ id: 1, date: '2026-11-18', ml: 250 }];

  const result = services.removeEntry({ entries, id: 2 });

  assert.deepEqual(result, { entries, removed: null, index: -1 });
  assert.equal(storage.getItem(WATER_STORAGE_KEY), null);
});
