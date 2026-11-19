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

function idSequence(start) {
  let id = start;
  return () => id++;
}

test('mass-entry service previews and applies skip, append, and replace modes', () => {
  const storage = createMemoryStorage();
  const services = createDiaryServices(createCoreRepositoriesFromStorage(storage).diary);
  const initialEntries = [{ id: 1, date: '2026-11-17', name: 'Existing' }];
  const baseRequest = {
    entries: initialEntries,
    dates: ['2026-11-16', '2026-11-17'],
    source: 'calories',
    calorieMode: 'period',
    calories: 2000,
    today: '2026-11-17'
  };
  const preview = services.massEntry.preview({ ...baseRequest, collisionMode: 'skip' });

  assert.deepEqual(preview.targetDates, ['2026-11-16']);
  assert.deepEqual(preview.skippedDates, ['2026-11-17']);
  assert.equal(preview.dailyTotals.kcal, 1000);
  assert.equal(preview.totalKcal, 2000);

  const skipped = services.massEntry.apply({
    ...baseRequest,
    collisionMode: 'skip',
    idFactory: idSequence(100)
  });
  const appended = services.massEntry.apply({
    entries: skipped.entries,
    dates: baseRequest.dates,
    source: 'calories',
    calorieMode: 'daily',
    calories: 1800,
    collisionMode: 'append',
    today: '2026-11-17',
    idFactory: idSequence(200)
  });
  const replaced = services.massEntry.apply({
    entries: appended.entries,
    dates: ['2026-11-17'],
    source: 'calories',
    calories: 1600,
    collisionMode: 'replace',
    today: '2026-11-17',
    idFactory: idSequence(300)
  });

  assert.equal(skipped.created.length, 1);
  assert.equal(appended.created.length, 2);
  assert.deepEqual(replaced.entries.filter((entry) => entry.date === '2026-11-17').map((entry) => entry.kcal), [1600]);
  assert.deepEqual(JSON.parse(storage.getItem(DIARY_STORAGE_KEY)), replaced.entries);
});

test('mass-entry service applies library and nutrition-set sources through diary storage', () => {
  const storage = createMemoryStorage();
  const services = createDiaryServices(createCoreRepositoriesFromStorage(storage).diary);
  const recipe = {
    id: 'recipe-1',
    name: 'Каша',
    kcal: 120,
    p: 4,
    f: 3,
    c: 20,
    portionGrams: 200
  };
  const libraryResult = services.massEntry.apply({
    entries: [],
    dates: ['2026-11-16'],
    source: 'library',
    items: [{
      kind: 'recipe',
      item: recipe,
      grams: 200,
      quantityMode: 'portions',
      quantityValue: 1,
      portionGrams: 200,
      meal: 'Завтрак',
      nutritionSnapshot: { kcal: 120, p: 4, f: 3, c: 20, components: [] },
      foodMetadataSnapshot: { categories: ['Зерновые'], items: ['Овсянка'] }
    }],
    recipes: [recipe],
    products: [],
    today: '2026-11-17',
    idFactory: idSequence(400)
  });
  const setRecipe = {
    id: 'set-recipe',
    name: 'Рецепт',
    totalWeight: 100,
    ingredientItems: [{ productId: 'product-1', amount: 100, unit: 'г' }]
  };
  const set = {
    id: 'set-1',
    name: 'План',
    weeks: [{ mainDishes: [{ id: 'slot-1', recipeId: 'set-recipe' }], snacks: [] }, {}, {}, {}]
  };
  const setResult = services.massEntry.apply({
    entries: libraryResult.entries,
    dates: ['2026-11-17'],
    source: 'set',
    set,
    sets: [set],
    recipes: [setRecipe],
    products: [{
      id: 'product-1',
      name: 'Продукт',
      kcal: 100,
      p: 10,
      f: 2,
      c: 5,
      basisUnit: 'г'
    }],
    today: '2026-11-17',
    idFactory: idSequence(500)
  });

  assert.equal(libraryResult.created[0].quantityMode, 'portions');
  assert.deepEqual(libraryResult.created[0].foodMetadataSnapshot, {
    categories: ['Зерновые'],
    items: ['Овсянка']
  });
  assert.equal(setResult.created[0].isNutritionSetAverage, true);
  assert.ok(Math.abs(setResult.created[0].kcal - 100 / 28) < 1e-10);
  assert.deepEqual(JSON.parse(storage.getItem(DIARY_STORAGE_KEY)), setResult.entries);
});
