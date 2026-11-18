import assert from 'node:assert/strict';
import test from 'node:test';
import { applyMassEntry, previewMassEntry } from '../src/application/usecases/mass-entry/mass-entry.js';
import {
  createCalorieOnlyDiaryEntry,
  createNutritionSetAverageDiaryEntry,
  normalizeMassEntryDates,
  planMassEntryDates,
  selectMassEntryDates
} from '../src/domain/mass-entry/mass-entry.model.js';

function createRepository() {
  return {
    saved: null,
    save(entries) {
      this.saved = entries;
    }
  };
}

function idSequence(start = 100) {
  let id = start;
  return () => id++;
}

test('mass-entry date selection validates, deduplicates, and expands ranges', () => {
  assert.deepEqual(normalizeMassEntryDates(
    ['2026-11-17', '2026-11-16', '2026-11-17'],
    '2026-11-17'
  ), ['2026-11-16', '2026-11-17']);
  assert.deepEqual(selectMassEntryDates({
    mode: 'range',
    rangeStart: '2026-11-15',
    rangeEnd: '2026-11-17',
    today: '2026-11-17'
  }), ['2026-11-15', '2026-11-16', '2026-11-17']);
  assert.deepEqual(selectMassEntryDates({
    mode: 'days',
    selectedDays: ['2026-11-17', '2026-11-16', '2026-11-17'],
    today: '2026-11-17'
  }), ['2026-11-16', '2026-11-17']);
  assert.throws(() => selectMassEntryDates({
    mode: 'range',
    rangeStart: '2026-11-18',
    today: '2026-11-17'
  }), /future dates/);
});

test('mass-entry collision planning distinguishes skip, append, and replace', () => {
  const existingEntries = [{ date: '2026-11-16' }];
  const options = { dates: ['2026-11-16', '2026-11-17'], existingEntries, today: '2026-11-17' };
  assert.deepEqual(planMassEntryDates({ ...options, collisionMode: 'skip' }).targetDates, ['2026-11-17']);
  assert.deepEqual(planMassEntryDates({ ...options, collisionMode: 'append' }).targetDates, ['2026-11-16', '2026-11-17']);
  assert.deepEqual(planMassEntryDates({ ...options, collisionMode: 'replace' }).targetDates, ['2026-11-16', '2026-11-17']);
});

test('system diary entry factories preserve unknown nutrients and set averages', () => {
  const calorieEntry = createCalorieOnlyDiaryEntry({
    id: 1,
    date: '2026-11-17',
    kcal: 2000,
    today: '2026-11-17'
  });
  assert.equal(calorieEntry.p, null);
  assert.equal(calorieEntry.calorieOnly, true);
  const averageEntry = createNutritionSetAverageDiaryEntry({
    id: 2,
    date: '2026-11-17',
    setId: 'set-1',
    setName: 'Набор',
    totals: { kcal: 1800, p: 80, f: 60, c: 200 },
    today: '2026-11-17'
  });
  assert.equal(averageEntry.isNutritionSetAverage, true);
  assert.equal(averageEntry.sourceNutritionSetId, 'set-1');
  assert.equal(averageEntry.nutritionSnapshot.kcal, 1800);
});

test('preview reports per-day and period calorie values with skip counts', () => {
  const preview = previewMassEntry({
    entries: [{ id: 1, date: '2026-11-16' }],
    dates: ['2026-11-16', '2026-11-17'],
    source: 'calories',
    calorieMode: 'period',
    calories: 3000,
    today: '2026-11-17'
  });
  assert.deepEqual(preview.skippedDates, ['2026-11-16']);
  assert.deepEqual(preview.targetDates, ['2026-11-17']);
  assert.equal(preview.daysToWrite, 1);
  assert.equal(preview.dailyTotals.kcal, 1500);
  assert.equal(preview.totalKcal, 3000);
});

test('applying period calories appends system entries and persists the new diary', () => {
  const repository = createRepository();
  const existing = [{ id: 1, date: '2026-11-16', name: 'Existing' }];
  const result = applyMassEntry({
    repository,
    entries: existing,
    dates: ['2026-11-16', '2026-11-17'],
    source: 'calories',
    calorieMode: 'period',
    calories: 3000,
    collisionMode: 'append',
    today: '2026-11-17',
    idFactory: idSequence()
  });
  assert.equal(result.created.length, 2);
  assert.deepEqual(result.created.map((entry) => entry.kcal), [1500, 1500]);
  assert.ok(result.created.every((entry) => entry.calorieOnly && entry.p === null));
  assert.equal(result.entries[0], existing[0]);
  assert.equal(repository.saved, result.entries);
});

test('applying library entries repeats the complete meal with distinct ids and portion data', () => {
  const repository = createRepository();
  const result = applyMassEntry({
    repository,
    entries: [],
    dates: ['2026-11-16', '2026-11-17'],
    source: 'library',
    items: [{
      kind: 'recipe',
      item: { id: 'recipe-1', name: 'Каша', kcal: 120, p: 4, f: 3, c: 20, portionGrams: 200 },
      grams: 200,
      quantityMode: 'portions',
      quantityValue: 1,
      portionGrams: 200,
      meal: 'Завтрак'
    }, {
      kind: 'product',
      item: { id: 'product-1', name: 'Молоко', kcal: 50, p: 3, f: 2, c: 5, basisUnit: 'мл' },
      grams: 100,
      meal: 'Завтрак'
    }],
    today: '2026-11-17',
    idFactory: idSequence()
  });
  assert.equal(result.created.length, 4);
  assert.equal(new Set(result.created.map((entry) => entry.id)).size, 4);
  assert.deepEqual(result.created.map((entry) => entry.date), [
    '2026-11-16', '2026-11-16', '2026-11-17', '2026-11-17'
  ]);
  assert.equal(result.created[0].quantityMode, 'portions');
  assert.equal(result.created[0].grams, 200);
  assert.ok(result.created.every((entry) => entry.foodMetadataSnapshot && entry.nutritionSnapshot));
});

test('replace mode removes all prior diary entries only for selected dates', () => {
  const repository = createRepository();
  const entries = [
    { id: 1, date: '2026-11-16' },
    { id: 2, date: '2026-11-17' },
    { id: 3, date: '2026-11-15' }
  ];
  const result = applyMassEntry({
    repository,
    entries,
    dates: ['2026-11-16', '2026-11-17'],
    source: 'calories',
    calories: 1800,
    today: '2026-11-17',
    collisionMode: 'replace',
    idFactory: idSequence()
  });
  assert.deepEqual(result.entries.filter((entry) => entry.id < 100), [entries[2]]);
  assert.equal(result.created.length, 2);
  assert.equal(repository.saved, result.entries);
});

test('nutrition-set mass entries use the 28-day average', () => {
  const repository = createRepository();
  const recipes = [{
    id: 'recipe-1',
    name: 'Рецепт',
    totalWeight: 100,
    ingredientItems: [{ productId: 'product-1', amount: 100, unit: 'г' }]
  }];
  const products = [{
    id: 'product-1',
    name: 'Продукт',
    kcal: 100,
    p: 10,
    f: 2,
    c: 5,
    basisUnit: 'г'
  }];
  const set = {
    id: 'set-1',
    name: 'План',
    weeks: [
      { mainDishes: [{ id: 'slot-1', recipeId: 'recipe-1' }], snacks: [] },
      {}, {}, {}
    ]
  };
  const result = applyMassEntry({
    repository,
    entries: [],
    dates: ['2026-11-17'],
    source: 'set',
    set,
    recipes,
    products,
    today: '2026-11-17',
    idFactory: idSequence()
  });
  assert.equal(result.created[0].isNutritionSetAverage, true);
  assert.equal(result.created[0].sourceNutritionSetId, 'set-1');
  assert.ok(Math.abs(result.created[0].kcal - 100 / 28) < 1e-10);
});
