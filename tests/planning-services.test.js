import assert from 'node:assert/strict';
import test from 'node:test';
import { createPlanningServices } from '../src/application/services/planning-services.js';
import { createSeedCatalog } from '../src/domain/catalog/catalog-seed.js';
import { createDefaultPlan } from '../src/domain/planning/plan.defaults.js';
import { createDefaultProfile } from '../src/domain/profile/profile.defaults.js';
import { createCoreRepositoriesFromStorage } from './helpers/core-data.js';
import { ACTIVE_NUTRITION_SET_STORAGE_KEY } from '../src/infrastructure/persistence/repositories/active-nutrition-set.repository.js';
import { NUTRITION_SETS_STORAGE_KEY } from '../src/infrastructure/persistence/repositories/nutrition-sets.repository.js';
import { PLAN_PRESETS_STORAGE_KEY } from '../src/infrastructure/persistence/repositories/plan-presets.repository.js';
import { PLAN_STORAGE_KEY } from '../src/infrastructure/persistence/repositories/plan.repository.js';

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

test('planning service persists plans and preset mutations through existing repositories', () => {
  const storage = createMemoryStorage();
  const repositories = createCoreRepositoriesFromStorage(storage);
  const services = createPlanningServices({
    planRepository: repositories.plan,
    presetRepository: repositories.planPresets,
    nutritionSetRepository: repositories.nutritionSets,
    activeNutritionSetRepository: repositories.activeNutritionSet
  });
  const plan = { ...createDefaultPlan(), goal: 'Сушка', targetWeight: 60 };
  const savedPlan = services.savePlan({ plan });
  assert.equal(savedPlan.goal, 'Снижение веса');
  assert.equal(JSON.parse(storage.getItem(PLAN_STORAGE_KEY)).targetWeight, 60);

  const created = services.savePlanPreset({
    presets: [],
    name: 'Мой план',
    plan,
    id: 'preset-1'
  });
  assert.equal(JSON.parse(storage.getItem(PLAN_PRESETS_STORAGE_KEY))[0].id, 'preset-1');

  const profile = {
    ...createDefaultProfile(),
    sex: 'Женский',
    birthDate: '1995-01-01',
    height: 165,
    currentWeight: 70,
    activityFactor: 1.375
  };
  const applied = services.applyPlanPreset({
    presets: created.presets,
    presetId: 'preset-1',
    profile,
    plan: createDefaultPlan(),
    referenceDate: new Date(2026, 10, 17)
  });
  assert.equal(applied.plan.targetWeight, 60);
  assert.equal(JSON.parse(storage.getItem(PLAN_STORAGE_KEY)).targetWeight, 60);

  const renamed = services.renamePlanPreset(created.presets, 'preset-1', 'Новый план');
  assert.equal(JSON.parse(storage.getItem(PLAN_PRESETS_STORAGE_KEY))[0].name, 'Новый план');
  const deleted = services.deletePlanPreset(renamed.presets, 'preset-1');
  assert.deepEqual(deleted.presets, []);
  assert.deepEqual(JSON.parse(storage.getItem(PLAN_PRESETS_STORAGE_KEY)), []);
});

test('planning service persists nutrition-set edits, weekly goals, and active-set fallback', () => {
  const storage = createMemoryStorage();
  const { products } = createSeedCatalog();
  const repositories = createCoreRepositoriesFromStorage(storage, products);
  const services = createPlanningServices({
    planRepository: repositories.plan,
    presetRepository: repositories.planPresets,
    nutritionSetRepository: repositories.nutritionSets,
    activeNutritionSetRepository: repositories.activeNutritionSet,
    products
  });
  const created = services.createNutritionSet({
    sets: [],
    name: 'Рабочий набор',
    id: 'set-1',
    products,
    weeks: [{ mainDishes: [{ id: 'main-1', recipeId: '1' }] }],
    personalWeeklyGoals: { completeness: { vegetables: 3 }, diversity: { fruit: 4 } }
  });
  assert.equal(created.set.weeks[0].mainDishes[0].recipeId, '1');
  assert.deepEqual(created.set.personalWeeklyGoals.completeness, { vegetables: 3 });
  assert.equal(JSON.parse(storage.getItem(NUTRITION_SETS_STORAGE_KEY))[0].id, 'set-1');

  const updatedWeek = services.updateNutritionSetWeek({
    sets: created.sets,
    setId: 'set-1',
    weekIndex: 1,
    week: { snacks: [{ id: 'snack-1', recipeId: '2' }] }
  });
  const updatedGoals = services.updateNutritionSetWeeklyGoals({
    sets: updatedWeek.sets,
    setId: 'set-1',
    completeness: { vegetables: 5 },
    diversity: { fruit: 6 }
  });
  assert.deepEqual(updatedGoals.set.weeks[1].snacks, [{ id: 'snack-1', recipeId: '2' }]);
  assert.deepEqual(services.loadNutritionSets(), updatedGoals.sets);

  const second = services.createNutritionSet({
    sets: updatedGoals.sets,
    name: 'Другой набор',
    id: 'set-2',
    products
  });
  assert.equal(services.selectActiveNutritionSet({ sets: second.sets, id: 'set-2' }), 'set-2');
  const deleted = services.deleteNutritionSet({
    sets: second.sets,
    id: 'set-2',
    activeId: 'set-2'
  });
  assert.deepEqual(deleted.sets.map((set) => set.id), ['set-1']);
  assert.equal(deleted.activeId, 'set-1');
  assert.equal(storage.getItem(ACTIVE_NUTRITION_SET_STORAGE_KEY), 'set-1');
});
