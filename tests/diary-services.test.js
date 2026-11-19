import assert from 'node:assert/strict';
import test from 'node:test';
import { createDiaryServices } from '../src/application/services/diary-services.js';
import { DIARY_STORAGE_KEY } from '../src/infrastructure/persistence/repositories/diary.repository.js';
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

function food(id, name, kcal) {
  return { id, name, kcal, p: 5, f: 3, c: 25 };
}

test('diary service persists add, update, replace, remove, and restore operations', () => {
  const storage = createMemoryStorage();
  const services = createDiaryServices(createCoreRepositoriesFromStorage(storage).diary);
  const entries = services.addEntries({
    entries: [],
    today: '2026-11-18',
    items: [
      {
        id: 11,
        date: '2026-11-18',
        meal: 'Завтрак',
        item: food('oat', 'Овсянка', 150),
        kind: 'product',
        grams: 100,
        foodMetadataSnapshot: { categories: ['Зерновые'], items: ['Овсянка'] },
        nutritionSnapshot: {
          kcal: 150,
          p: 5,
          f: 3,
          c: 25,
          components: [{ name: 'Клетчатка', amount: 4, unit: 'г' }]
        }
      },
      {
        id: 12,
        date: '2026-11-18',
        meal: 'Обед',
        item: food('rice', 'Рис', 130),
        kind: 'product',
        grams: 100
      }
    ]
  });
  const updated = services.updateEntry({
    entries,
    id: 11,
    today: '2026-11-18',
    changes: { grams: 200, quantityValue: 200, meal: 'Перекус' }
  });
  const replaced = services.replaceEntry({
    entries: updated.entries,
    id: 12,
    today: '2026-11-18',
    item: food('millet', 'Пшено', 120),
    kind: 'product',
    grams: 150
  });
  const removed = services.removeEntry({ entries: replaced.entries, id: 11 });
  const restored = services.restoreEntry({
    entries: removed.entries,
    entry: removed.removed,
    index: removed.index
  });

  assert.deepEqual(restored.map(({ id, name }) => ({ id, name })), [
    { id: 11, name: 'Овсянка' },
    { id: 12, name: 'Пшено' }
  ]);
  assert.equal(restored[0].grams, 200);
  assert.equal(restored[0].kcal, 300);
  assert.deepEqual(restored[0].components, [{ name: 'Клетчатка', amount: 8, unit: 'г' }]);
  assert.deepEqual(restored[0].foodMetadataSnapshot, {
    categories: ['Зерновые'],
    items: ['Овсянка']
  });
  assert.deepEqual(restored[0].nutritionSnapshot.components, [
    { name: 'Клетчатка', amount: 4, unit: 'г' }
  ]);
  assert.deepEqual(JSON.parse(storage.getItem(DIARY_STORAGE_KEY)), restored);
});

test('diary batch add validates all entries before saving', () => {
  const storage = createMemoryStorage();
  const services = createDiaryServices(createCoreRepositoriesFromStorage(storage).diary);

  assert.throws(() => services.addEntries({
    entries: [],
    today: '2026-11-18',
    items: [
      {
        id: 1,
        date: '2026-11-18',
        meal: 'Завтрак',
        item: food('oat', 'Овсянка', 150),
        kind: 'product',
        grams: 100
      },
      {
        id: 2,
        date: '2026-11-19',
        meal: 'Обед',
        item: food('rice', 'Рис', 130),
        kind: 'product',
        grams: 100
      }
    ]
  }), /future date/);
  assert.equal(storage.getItem(DIARY_STORAGE_KEY), null);
});
