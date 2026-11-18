import assert from 'node:assert/strict';
import test from 'node:test';
import { createSeedCatalog } from '../src/domain/catalog/catalog-seed.js';
import {
  diaryMealShare,
  DEFAULT_MEAL_COUNT,
  getDiaryMealOptions,
  getMealShares,
  getStandardMeals
} from '../src/domain/diary/meal-config.js';
import {
  createDiaryRepository,
  DIARY_STORAGE_KEY
} from '../src/infrastructure/persistence/repositories/diary.repository.js';
import {
  createMeasurementHistoryRepository,
  MEASUREMENT_HISTORY_STORAGE_KEY
} from '../src/infrastructure/persistence/repositories/measurement.repository.js';
import {
  createWaterRepository,
  WATER_STORAGE_KEY
} from '../src/infrastructure/persistence/repositories/water.repository.js';
import {
  createWeightHistoryRepository,
  WEIGHT_HISTORY_STORAGE_KEY
} from '../src/infrastructure/persistence/repositories/weight.repository.js';
import { createArrayRepository } from '../src/infrastructure/persistence/storage.js';
import { initializeCoreData } from '../src/application/services/initialize-core-data.js';
import { addFoodEntry } from '../src/application/usecases/diary/add-food-entry.js';
import { addWaterEntry } from '../src/application/usecases/water/add-water-entry.js';
import { createFoodDiaryEntry } from '../src/domain/diary/diary-entry.js';
import { createWaterEntry } from '../src/domain/water/water-entry.js';
import { createDefaultPlan } from '../src/domain/planning/plan.defaults.js';
import { createDefaultProfile } from '../src/domain/profile/profile.defaults.js';

function createMemoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, value);
    }
  };
}

test('seed catalog returns independent recipe and product data with legacy metadata defaults', () => {
  const first = createSeedCatalog();
  const second = createSeedCatalog();

  assert.equal(first.recipes.length, 6);
  assert.equal(first.products.length, 7);
  assert.deepEqual(first.products[0].categories, ['Зерновые']);
  assert.deepEqual(first.products[0].allergens, ['Глютен']);
  assert.equal(first.products[0].basisUnit, 'г');
  assert.equal(first.products[0].favorite, false);

  first.recipes[0].tags.push('test');
  first.products[0].categories.push('test');
  assert.equal(second.recipes[0].tags.includes('test'), false);
  assert.equal(second.products[0].categories.includes('test'), false);
});

test('meal configuration preserves default, bounded meal count, shares, and diary options', () => {
  assert.equal(DEFAULT_MEAL_COUNT, 5);
  assert.deepEqual(getStandardMeals(), ['Завтрак', 'Обед', 'Полдник', 'Ужин', 'Поздний ужин']);
  assert.deepEqual(getStandardMeals({ mealCount: 0 }), getStandardMeals());
  assert.equal(getStandardMeals({ mealCount: 99 }).length, 6);
  assert.equal(getStandardMeals({ mealCount: -2 }).length, 1);
  assert.ok(Math.abs(getMealShares({ mealCount: 5 }).reduce((sum, share) => sum + share, 0) - 1) < 1e-12);
  assert.equal(diaryMealShare('Перекус'), null);
  assert.deepEqual(
    getDiaryMealOptions({ mealCount: 1 }, [
      { meal: 'Полдник' },
      { meal: 'Полдник' },
      { meal: 'Калории за день' },
      { meal: 'Набор питания' }
    ]),
    ['Завтрак', 'Полдник', 'Перекус']
  );
});

test('array repositories read and write legacy arrays using unchanged localStorage keys', () => {
  const storage = createMemoryStorage({
    [DIARY_STORAGE_KEY]: '[{"id":1}]',
    [WATER_STORAGE_KEY]: '[]'
  });
  const diary = createDiaryRepository(storage);
  const water = createWaterRepository(storage);
  const weight = createWeightHistoryRepository(storage);
  const measurements = createMeasurementHistoryRepository(storage);

  assert.deepEqual(diary.load(), [{ id: 1 }]);
  assert.deepEqual(water.load(), []);
  diary.save([{ id: 2 }]);
  assert.equal(storage.getItem(DIARY_STORAGE_KEY), '[{"id":2}]');
  assert.deepEqual(weight.load(), []);
  assert.deepEqual(measurements.load(), []);
  assert.equal(WEIGHT_HISTORY_STORAGE_KEY, 'nutrition-weight-history-v1');
  assert.equal(MEASUREMENT_HISTORY_STORAGE_KEY, 'nutrition-measurement-history-v1');
});

test('array repository rejects malformed JSON, invalid writes, and reports storage failures', () => {
  const malformed = createArrayRepository(createMemoryStorage({ diary: '{' }), 'diary');
  assert.throws(() => malformed.load(), SyntaxError);
  assert.throws(() => malformed.save({}), /must be an array/);

  const failingStorage = {
    getItem() {
      throw new Error('read failed');
    },
    setItem() {
      throw new Error('write failed');
    }
  };
  const repository = createArrayRepository(failingStorage, 'diary');
  assert.throws(() => repository.load(), /read failed/);
  assert.throws(() => repository.save([]), /write failed/);
});

test('core data initialization composes catalog, settings, and persisted records', () => {
  const storage = createMemoryStorage({
    [DIARY_STORAGE_KEY]: '[{"id":7,"date":"2026-11-17"}]',
    [WATER_STORAGE_KEY]: '[{"id":8,"ml":250}]',
    [WEIGHT_HISTORY_STORAGE_KEY]: '[{"id":9,"weight":65}]',
    [MEASUREMENT_HISTORY_STORAGE_KEY]: '[{"id":10,"height":166}]'
  });

  const state = initializeCoreData(storage);

  assert.equal(state.recipes.length, 6);
  assert.equal(state.products.length, 7);
  assert.deepEqual(state.collections, []);
  assert.deepEqual(state.mealSettings, { mealCount: 5 });
  assert.deepEqual(state.profile, createDefaultProfile());
  assert.deepEqual(state.plan, createDefaultPlan());
  assert.deepEqual(state.diaryEntries, [{ id: 7, date: '2026-11-17' }]);
  assert.deepEqual(state.waterEntries, [{ id: 8, ml: 250 }]);
  assert.deepEqual(state.weightHistory, [{ id: 9, weight: 65 }]);
  assert.deepEqual(state.measurementHistory, [{ id: 10, height: 166 }]);
});

test('core data initialization syncs the latest valid measurement into profile and current values', () => {
  const storage = createMemoryStorage({
    [MEASUREMENT_HISTORY_STORAGE_KEY]: JSON.stringify([
      { date: '2026-11-15', values: { height: 165, 'Талия': 80 } },
      { date: '2026-11-17', values: { height: 170, 'Талия': 76 } }
    ])
  });

  const state = initializeCoreData(storage);

  assert.equal(state.profile.height, 170);
  assert.equal(state.measurements.find((measurement) => measurement.name === 'Талия').value, 76);
  assert.equal(state.measurements.find((measurement) => measurement.name === 'Грудь').value, null);
});

test('default profile and plan factories return independent initial settings', () => {
  const firstProfile = createDefaultProfile();
  const secondProfile = createDefaultProfile();
  const firstPlan = createDefaultPlan();
  const secondPlan = createDefaultPlan();

  firstProfile.trainingDays.push('Пн');
  firstPlan.personalWeeklyGoals.completeness.dairy = 1;
  assert.deepEqual(secondProfile.trainingDays, []);
  assert.deepEqual(secondPlan.personalWeeklyGoals.completeness, {});
});

test('adding a food entry snapshots nutrients and persists without mutating the old list', () => {
  const storage = createMemoryStorage();
  const repository = createDiaryRepository(storage);
  const entries = [];
  const recipe = createSeedCatalog().recipes[0];
  const nextEntries = addFoodEntry({
    repository,
    entries,
    id: 42,
    item: recipe,
    kind: 'recipe',
    meal: 'Завтрак',
    date: '2026-11-17',
    today: '2026-11-17',
    grams: 150
  });

  assert.equal(entries.length, 0);
  assert.equal(nextEntries[0].recipeId, recipe.id);
  assert.equal(nextEntries[0].grams, 150);
  assert.equal(nextEntries[0].kcal, 219);
  assert.equal(nextEntries[0].nutritionSnapshot.kcal, recipe.kcal);
  assert.deepEqual(repository.load(), nextEntries);
});

test('food and water entry factories enforce date and amount rules', () => {
  const recipe = createSeedCatalog().recipes[0];
  assert.throws(() => createFoodDiaryEntry({
    id: 1,
    date: '2026-11-18',
    today: '2026-11-17',
    meal: 'Завтрак',
    item: recipe,
    kind: 'recipe',
    grams: 100
  }), /future date/);
  assert.throws(() => createFoodDiaryEntry({
    id: 1,
    date: '2026-11-17',
    today: '2026-11-17',
    meal: 'Завтрак',
    item: recipe,
    kind: 'recipe',
    grams: 30001
  }), /30000 g/);
  assert.throws(() => createWaterEntry({
    id: 1,
    date: '2026-11-17',
    today: '2026-11-17',
    ml: 0
  }), /1 and 5000 ml/);
  assert.throws(() => createWaterEntry({
    id: 1,
    date: '2026-11-18',
    today: '2026-11-17',
    ml: 250
  }), /future date/);
});

test('adding water persists the entry and leaves the previous list intact', () => {
  const storage = createMemoryStorage();
  const repository = createWaterRepository(storage);
  const entries = [];
  const nextEntries = addWaterEntry({
    repository,
    entries,
    id: 24,
    date: '2026-11-17',
    today: '2026-11-17',
    ml: 250
  });

  assert.equal(entries.length, 0);
  assert.deepEqual(nextEntries, [{ id: 24, date: '2026-11-17', ml: 250 }]);
  assert.deepEqual(repository.load(), nextEntries);
});
