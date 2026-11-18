import assert from 'node:assert/strict';
import test from 'node:test';
import { removeFoodEntry, restoreFoodEntry } from '../src/application/usecases/diary/remove-food-entry.js';
import { replaceFoodEntry } from '../src/application/usecases/diary/replace-food-entry.js';
import { updateFoodEntry } from '../src/application/usecases/diary/update-food-entry.js';
import { createFoodDiaryEntry } from '../src/domain/diary/diary-entry.js';

function createRepository() {
  return {
    saved: null,
    save(entries) {
      this.saved = entries;
    }
  };
}

function createEntry(overrides = {}) {
  return {
    id: 1,
    date: '2026-11-17',
    meal: 'Обед',
    name: 'Овсянка',
    grams: 100,
    quantityMode: 'grams',
    quantityValue: 100,
    quantityUnit: 'г',
    kcal: 150,
    p: 5,
    f: 3,
    c: 25,
    components: [{ name: 'Клетчатка', amount: 4, unit: 'г' }],
    nutritionSnapshot: { kcal: 150, p: 5, f: 3, c: 25, components: [] },
    ...overrides
  };
}

test('food diary factory keeps portion quantity and calculates consumed nutrients', () => {
  const entry = createFoodDiaryEntry({
    id: 3,
    date: '2026-11-17',
    today: '2026-11-17',
    meal: 'Завтрак',
    item: {
      id: 9,
      name: 'Каша',
      kcal: 150,
      p: 5,
      f: 3,
      c: 25,
      components: [{ name: 'Клетчатка', amount: 4, unit: 'г' }]
    },
    kind: 'recipe',
    grams: 200,
    quantityMode: 'portions',
    quantityValue: 2,
    portionGrams: 100
  });

  assert.equal(entry.grams, 200);
  assert.equal(entry.quantityMode, 'portions');
  assert.equal(entry.quantityValue, 2);
  assert.equal(entry.portionGrams, 100);
  assert.equal(entry.kcal, 300);
  assert.deepEqual(entry.components, [{ name: 'Клетчатка', amount: 8, unit: 'г' }]);
});

test('updating a food entry scales nutrients and components while preserving snapshots', () => {
  const repository = createRepository();
  const existing = createEntry();
  const { entry, entries } = updateFoodEntry({
    repository,
    entries: [existing],
    id: 1,
    changes: { grams: 150, meal: 'Ужин' },
    today: '2026-11-17'
  });

  assert.equal(entries.length, 1);
  assert.equal(entry.grams, 150);
  assert.equal(entry.kcal, 225);
  assert.equal(entry.components[0].amount, 6);
  assert.equal(entry.meal, 'Ужин');
  assert.equal(entry.nutritionSnapshot, existing.nutritionSnapshot);
  assert.equal(repository.saved, entries);
});

test('updating a food entry rejects future dates and system diary entries', () => {
  const repository = createRepository();
  assert.throws(() => updateFoodEntry({
    repository,
    entries: [createEntry()],
    id: 1,
    changes: { date: '2026-11-18' },
    today: '2026-11-17'
  }), /future date/);
  assert.throws(() => updateFoodEntry({
    repository,
    entries: [createEntry({ calorieOnly: true })],
    id: 1,
    changes: { grams: 100 },
    today: '2026-11-17'
  }), /System diary entries/);
});

test('replacing one entry preserves its position and id', () => {
  const repository = createRepository();
  const first = createEntry();
  const third = createEntry({ id: 3, name: 'Йогурт' });
  const { entry, entries } = replaceFoodEntry({
    repository,
    entries: [first, third],
    id: 1,
    item: { id: 8, name: 'Рис', kcal: 130, p: 2, f: 1, c: 28 },
    kind: 'product',
    grams: 200,
    today: '2026-11-17'
  });

  assert.deepEqual(entries.map(({ id }) => id), [1, 3]);
  assert.equal(entry.name, 'Рис');
  assert.equal(entry.productId, 8);
  assert.equal(entry.kcal, 260);
  assert.equal(repository.saved, entries);
});

test('removing and restoring a food entry preserves its original list position', () => {
  const repository = createRepository();
  const entries = [createEntry(), createEntry({ id: 2, name: 'Рис' }), createEntry({ id: 3, name: 'Йогурт' })];
  const removedResult = removeFoodEntry({ repository, entries, id: 2 });
  assert.deepEqual(removedResult.entries.map(({ id }) => id), [1, 3]);
  assert.equal(removedResult.index, 1);

  const restored = restoreFoodEntry({
    repository,
    entries: removedResult.entries,
    entry: removedResult.removed,
    index: removedResult.index
  });
  assert.deepEqual(restored.map(({ id }) => id), [1, 2, 3]);
  assert.equal(repository.saved, restored);
});
