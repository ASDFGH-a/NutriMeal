import assert from 'node:assert/strict';
import test from 'node:test';
import { initializeCoreData } from '../src/application/services/initialize-core-data.js';
import {
  addNutritionDishSlot,
  assignNutritionDishRecipe,
  createNutritionSet,
  deleteNutritionSet,
  removeNutritionDishSlot,
  selectActiveNutritionSet,
  updateNutritionSet,
  updateNutritionSetWeek,
  updateNutritionSetWeeklyGoals
} from '../src/application/usecases/planning/nutrition-sets.js';
import { createDefaultNutritionSets } from '../src/domain/nutrition-set/nutrition-set.defaults.js';
import {
  emptyNutritionWeek,
  getPlannerWeekCompletion,
  normalizeNutritionSet,
  normalizeNutritionWeek
} from '../src/domain/nutrition-set/nutrition-set.model.js';
import { createSeedCatalog } from '../src/domain/catalog/catalog-seed.js';
import {
  ACTIVE_NUTRITION_SET_STORAGE_KEY,
  createActiveNutritionSetRepository
} from '../src/infrastructure/persistence/repositories/active-nutrition-set.repository.js';
import {
  createNutritionSetsRepository,
  NUTRITION_SETS_STORAGE_KEY
} from '../src/infrastructure/persistence/repositories/nutrition-sets.repository.js';

function createMemoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
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

test('nutrition set normalization keeps four weeks and migrates legacy recipe and goal fields', () => {
  const { products } = createSeedCatalog();
  const week = normalizeNutritionWeek({
    firstDishId: 5,
    secondDishId: 2,
    mainDishes: ['3', { id: 'slot', recipeId: 4 }],
    snacks: [7],
    productIds: ['oat', 'unknown', 'oat']
  }, 1, products);

  assert.deepEqual(week.mainDishes, [
    { id: 'main-2-1', recipeId: '3' },
    { id: 'slot', recipeId: '4' }
  ]);
  assert.deepEqual(week.snacks, [{ id: 'snack-2-1', recipeId: '7' }]);
  assert.deepEqual(week.productIds, ['oat']);

  const set = normalizeNutritionSet({
    id: 'legacy',
    weeklyGoals: { completeness: { vegetables: 4 }, diversity: { fruit: 3 } },
    weeks: [{ firstDishId: 5 }, emptyNutritionWeek(), emptyNutritionWeek(), emptyNutritionWeek(), emptyNutritionWeek()]
  }, 0, products);
  assert.equal(set.weeks.length, 4);
  assert.deepEqual(set.personalWeeklyGoals.completeness, { vegetables: 4 });
  assert.deepEqual(set.personalWeeklyGoals.diversity, { fruit: 3 });
  assert.equal(getPlannerWeekCompletion(set.weeks[0]), 1);
  assert.deepEqual(normalizeNutritionSet({ name: 'Short' }, 0, products).weeks.length, 4);
});

test('default nutrition sets preserve the original three four-week examples', () => {
  const { products } = createSeedCatalog();
  const sets = createDefaultNutritionSets(products);
  assert.deepEqual(sets.map((set) => set.id), ['nutrition-set-a', 'nutrition-set-b', 'nutrition-set-c']);
  assert.ok(sets.every((set) => set.weeks.length === 4));
  assert.deepEqual(sets[0].weeks[0].mainDishes.map((dish) => dish.recipeId), ['5', '2']);
  assert.deepEqual(sets[0].weeks[0].productIds, ['oat', 'egg', 'milk', 'cottage']);
});

test('nutrition set repositories preserve existing keys, seed defaults, and validate active selection', () => {
  const { products } = createSeedCatalog();
  const storage = createMemoryStorage();
  const setsRepository = createNutritionSetsRepository(storage, products);
  const activeRepository = createActiveNutritionSetRepository(storage);
  const sets = setsRepository.load();

  assert.equal(sets.length, 3);
  assert.equal(sets[0].weeks.length, 4);
  setsRepository.save(sets);
  assert.equal(JSON.parse(storage.getItem(NUTRITION_SETS_STORAGE_KEY)).length, 3);
  activeRepository.save(sets[1].id);
  assert.equal(activeRepository.load(), sets[1].id);
  activeRepository.save('');
  assert.equal(storage.getItem(ACTIVE_NUTRITION_SET_STORAGE_KEY), null);
});

test('nutrition set use cases validate, persist, edit weeks, preserve goals, and choose a fallback on delete', () => {
  const { products } = createSeedCatalog();
  const storage = createMemoryStorage();
  const repository = createNutritionSetsRepository(storage, products);
  const activeRepository = createActiveNutritionSetRepository(storage);
  let sets = [];

  const created = createNutritionSet({
    sets,
    repository,
    name: '  Рабочий план  ',
    comment: '  На неделю  ',
    id: 'set-1',
    products
  });
  sets = created.sets;
  assert.equal(created.set.name, 'Рабочий план');
  assert.equal(created.set.comment, 'На неделю');
  assert.equal(created.set.weeks.length, 4);
  assert.throws(() => createNutritionSet({ sets, repository, name: 'рабочий ПЛАН', id: 'set-2' }), /already exists/);
  assert.throws(() => createNutritionSet({ sets, repository, name: 'x'.repeat(49), id: 'set-2' }), /48 characters/);
  assert.throws(() => createNutritionSet({ sets, repository, name: 'Новый', comment: 'x'.repeat(301), id: 'set-2' }), /300 characters/);

  const updated = updateNutritionSet({
    sets,
    repository,
    id: 'set-1',
    changes: { name: 'Рабочий план 2', comment: 'Актуально' },
    products
  });
  sets = updated.sets;
  const editedWeek = updateNutritionSetWeek({
    sets,
    repository,
    setId: 'set-1',
    weekIndex: 2,
    week: { mainDishes: [{ id: 'main', recipeId: 5 }] },
    products
  });
  sets = editedWeek.sets;
  assert.equal(getPlannerWeekCompletion(editedWeek.set.weeks[2]), 1);
  assert.equal(editedWeek.set.weeks.length, 4);

  const withGoals = updateNutritionSetWeeklyGoals({
    sets,
    repository,
    setId: 'set-1',
    completeness: { vegetables: 2.4, empty: 0 },
    diversity: { fruit: 5 },
    products
  });
  sets = withGoals.sets;
  assert.deepEqual(withGoals.set.personalWeeklyGoals.completeness, { vegetables: 2 });
  assert.deepEqual(withGoals.set.personalWeeklyGoals.diversity, { fruit: 5 });
  assert.deepEqual(repository.load(), sets);

  const withSlot = addNutritionDishSlot({
    sets,
    repository,
    setId: 'set-1',
    weekIndex: 1,
    group: 'snacks',
    id: 'snack-slot',
    products
  });
  sets = withSlot.sets;
  const assigned = assignNutritionDishRecipe({
    sets,
    repository,
    setId: 'set-1',
    weekIndex: 1,
    group: 'snacks',
    dishId: 'snack-slot',
    recipeId: 1,
    recipes: createSeedCatalog().recipes,
    products
  });
  sets = assigned.sets;
  assert.equal(assigned.set.weeks[1].snacks[0].recipeId, '1');
  assert.throws(() => assignNutritionDishRecipe({
    sets,
    repository,
    setId: 'set-1',
    weekIndex: 1,
    group: 'snacks',
    dishId: 'snack-slot',
    recipeId: 'unknown',
    recipes: createSeedCatalog().recipes,
    products
  }), /was not found/);
  const withoutSlot = removeNutritionDishSlot({
    sets,
    repository,
    setId: 'set-1',
    weekIndex: 1,
    group: 'snacks',
    dishId: 'snack-slot',
    products
  });
  sets = withoutSlot.sets;
  assert.deepEqual(withoutSlot.set.weeks[1].snacks, []);

  const second = createNutritionSet({ sets, repository, name: 'Ещё план', id: 'set-2', products });
  sets = second.sets;
  assert.equal(selectActiveNutritionSet({ sets, id: 'set-2', activeRepository }), 'set-2');
  const removed = deleteNutritionSet({
    sets,
    id: 'set-2',
    repository,
    activeId: 'set-2',
    activeRepository
  });
  assert.equal(removed.activeId, 'set-1');
  assert.equal(activeRepository.load(), 'set-1');
  assert.deepEqual(removed.sets.map((set) => set.id), ['set-1']);
  assert.throws(() => updateNutritionSetWeek({
    sets: removed.sets,
    repository,
    setId: 'set-1',
    weekIndex: 4,
    week: emptyNutritionWeek(),
    products
  }), /between 0 and 3/);
});

test('core initialization persists defaults, resolves invalid active ids, and migrates legacy goals', () => {
  const { products } = createSeedCatalog();
  const legacySet = {
    id: 'legacy-set',
    name: 'Сохранённый',
    weeks: [{ firstDishId: 5 }, {}, {}, {}]
  };
  const storage = createMemoryStorage({
    'nutrition-sets-v1': JSON.stringify([legacySet]),
    'nutrition-active-set-v1': 'missing-set',
    'nutrition-plan-v2': JSON.stringify({
      personalWeeklyGoals: { completeness: { vegetables: 3 }, diversity: { fruit: 4 } }
    })
  });

  const state = initializeCoreData(storage);
  assert.equal(state.nutritionSets.length, 1);
  assert.equal(state.nutritionSets[0].weeks.length, 4);
  assert.equal(state.activeNutritionSetId, 'legacy-set');
  assert.equal(storage.getItem(ACTIVE_NUTRITION_SET_STORAGE_KEY), 'legacy-set');
  assert.deepEqual(state.nutritionSets[0].personalWeeklyGoals.completeness, { vegetables: 3 });
  assert.deepEqual(state.nutritionSets[0].personalWeeklyGoals.diversity, { fruit: 4 });
  assert.equal(JSON.parse(storage.getItem(NUTRITION_SETS_STORAGE_KEY))[0].id, 'legacy-set');

  const emptyStorage = createMemoryStorage();
  const initialized = initializeCoreData(emptyStorage);
  assert.deepEqual(initialized.nutritionSets, createDefaultNutritionSets(products));
  assert.equal(initialized.activeNutritionSetId, 'nutrition-set-a');
  assert.ok(emptyStorage.getItem(NUTRITION_SETS_STORAGE_KEY));
  assert.equal(emptyStorage.getItem(ACTIVE_NUTRITION_SET_STORAGE_KEY), 'nutrition-set-a');
});
