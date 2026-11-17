import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_PROFILE } from '../src/domain/profile/profile.model.js';
import { normalizeProfileData } from '../src/domain/profile/profile.normalizer.js';
import { DEFAULT_PLAN } from '../src/domain/planning/plan.model.js';
import { normalizePlanData, normalizePlanPresets, clonePlanForPreset } from '../src/domain/planning/plan.normalizer.js';
import { calculateProfileAge, calculatePlanTargets } from '../src/domain/planning/plan-calculations.js';
import { emptyNutritionWeek, createDefaultNutritionSets } from '../src/domain/nutrition-set/nutrition-set.model.js';
import { normalizeNutritionSet, normalizeNutritionWeek } from '../src/domain/nutrition-set/nutrition-set.normalizer.js';
import { createProfileRepository } from '../src/infrastructure/persistence/repositories/profile.repository.js';
import { createPlanRepository } from '../src/infrastructure/persistence/repositories/plan.repository.js';
import { createPlanPresetsRepository } from '../src/infrastructure/persistence/repositories/plan-presets.repository.js';
import { createNutritionSetsRepository } from '../src/infrastructure/persistence/repositories/nutrition-sets.repository.js';
import { createActiveNutritionSetRepository } from '../src/infrastructure/persistence/repositories/active-nutrition-set.repository.js';
import { migrateLegacyWeeklyGoals } from '../src/application/usecases/migrate-legacy-weekly-goals.js';
import { resolveActiveNutritionSetId } from '../src/application/usecases/resolve-active-nutrition-set.js';

function memoryStorage() {
  const values = new Map();
  return {
    values,
    getItem: key => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value))
  };
}

const quietLogger = { warn() {} };

test('profile normalizer preserves v60 defaults and normalizes legacy activity and lists', () => {
  assert.deepEqual(normalizeProfileData({}), { ...DEFAULT_PROFILE, trainingDays: [], allergies: [], foodRestrictions: [] });
  const result = normalizeProfileData({
    dailyActivity: 'Физическая работа, много движения и нагрузок',
    trainingFrequency: 'Нет регулярных тренировок',
    trainingDays: ['Пн', 'Вт', 'bad', 'Пн'],
    allergies: ['Молоко', 'молоко', 'Яйца'],
    foodRestrictions: ['Без глютена', ' Без глютена '],
    sex: 'unknown', birthDate: 123
  });
  assert.equal(result.activityFactor, 1.725);
  assert.deepEqual(result.trainingDays, []);
  assert.deepEqual(result.allergies, ['Молоко', 'Яйца']);
  assert.deepEqual(result.foodRestrictions, ['Без глютена']);
  assert.equal(result.sex, '');
  assert.equal(result.birthDate, '');
  assert.equal('dailyActivity' in result, false);
});

test('plan normalizer preserves v60 goal, protein, fat and weekly-goal rules', () => {
  const result = normalizePlanData({
    goal: 'Сушка', targetWeight: '71', energyAdjustment: '', proteinPerKg: 1.4,
    fatPercent: 90, personalWeeklyGoals: { frequency: { fish: 2 }, diversity: { fish: 3 } }
  });
  assert.equal(result.goal, 'Снижение веса');
  assert.equal(result.targetWeight, 71);
  assert.equal(result.energyAdjustment, 0);
  assert.equal(result.proteinPerKg, 1.4);
  assert.equal(result.fatPercent, 35);
  assert.deepEqual(result.personalWeeklyGoals.completeness, { fish: 2 });
  assert.deepEqual(result.personalWeeklyGoals.frequency, { fish: 2 });
  assert.deepEqual(result.personalWeeklyGoals.diversity, { fish: 3 });
  assert.equal(normalizePlanData({ goal: 'Набор массы' }).energyAdjustment, 0); // v60 default plan supplies an explicit zero
  assert.equal(normalizePlanData({ proteinPerKg: 1.3 }).proteinPerKg, null);
});

test('plan preset normalization filters invalid records and snapshots only configured fields', () => {
  const plan = normalizePlanData({ ...DEFAULT_PLAN, kcal: 1900, p: 120 });
  const snapshot = clonePlanForPreset(plan);
  assert.equal('kcal' in snapshot, false);
  assert.equal('p' in snapshot, false);
  assert.deepEqual(normalizePlanPresets([{ id: 'p1', name: 'A', plan }, { id: 'bad' }]).map(x => x.id), ['p1']);
});

test('nutrition week normalizer keeps legacy dish references and injected product validation', () => {
  const week = normalizeNutritionWeek({ firstDishId: 5, secondDishId: '2', productIds: ['oat', 'missing', 'oat'] }, 0, id => id === 'oat');
  assert.deepEqual(week.mainDishes, [
    { id: 'legacy-main-1-1', recipeId: '5' },
    { id: 'legacy-main-1-2', recipeId: '2' }
  ]);
  assert.deepEqual(week.productIds, ['oat']);
  const modern = normalizeNutritionWeek({ mainDishes: ['r1', { id: 'custom', recipeId: 9 }], snacks: [3] });
  assert.deepEqual(modern.mainDishes, [{ id: 'main-1-1', recipeId: 'r1' }, { id: 'custom', recipeId: '9' }]);
  assert.deepEqual(modern.snacks, [{ id: 'snack-1-1', recipeId: '3' }]);
});

test('nutrition set always has four independent weeks and keeps goals/comment', () => {
  const normalized = normalizeNutritionSet({
    id: 'set-x', name: 'X', comment: 'note', weeks: [{ mainDishes: [{ id: 'd', recipeId: 'r' }] }],
    weeklyGoals: { completeness: { fish: 2 }, diversity: { fish: 4 } }
  });
  assert.equal(normalized.weeks.length, 4);
  assert.deepEqual(normalized.weeks[0].mainDishes, [{ id: 'd', recipeId: 'r' }]);
  assert.deepEqual(normalized.weeks[1], emptyNutritionWeek());
  assert.deepEqual(normalized.personalWeeklyGoals.completeness, { fish: 2 });
  assert.deepEqual(normalized.personalWeeklyGoals.diversity, { fish: 4 });
  assert.equal(normalizeNutritionSet({ weeks: [1, 2, 3, 4, 5] }).weeks.length, 4);
  assert.equal(createDefaultNutritionSets().length, 3);
});

test('nutrition sets repository seeds defaults only when the legacy key is absent', () => {
  const storage = memoryStorage();
  const repo = createNutritionSetsRepository(storage, { isProductIdValid: id => ['oat', 'egg', 'milk', 'cottage'].includes(id), logger: quietLogger });
  const initial = repo.loadAll();
  assert.equal(initial.length, 3);
  assert.equal(initial[0].weeks.length, 4);
  assert.equal(storage.values.has('nutrition-sets-v1'), true);
  repo.saveAll([]);
  assert.deepEqual(repo.loadAll(), []);
});

test('profile, plan, presets, sets and active-set repositories round-trip legacy keys', () => {
  const storage = memoryStorage();
  const profileRepo = createProfileRepository(storage, quietLogger);
  const planRepo = createPlanRepository(storage, quietLogger);
  const presetRepo = createPlanPresetsRepository(storage, quietLogger);
  const setsRepo = createNutritionSetsRepository(storage, { isProductIdValid: () => true, logger: quietLogger });
  const activeRepo = createActiveNutritionSetRepository(storage, quietLogger);

  assert.equal(profileRepo.save({ ...DEFAULT_PROFILE, currentWeight: 72 }), true);
  assert.equal(profileRepo.load().currentWeight, 72);
  assert.equal(planRepo.save({ ...DEFAULT_PLAN, targetWeight: 70 }), true);
  assert.equal(planRepo.load().targetWeight, 70);
  assert.equal(presetRepo.saveAll([{ id: 'p1', name: 'Plan', plan: DEFAULT_PLAN }]), true);
  assert.equal(presetRepo.loadAll()[0].id, 'p1');
  const sets = createDefaultNutritionSets();
  assert.equal(setsRepo.saveAll(sets), true);
  assert.equal(setsRepo.loadAll().length, 3);
  assert.equal(setsRepo.loadAll()[0].weeks.length, 4);
  assert.equal(setsRepo.saveAll([]), true);
  assert.deepEqual(setsRepo.loadAll(), []);
  assert.equal(setsRepo.saveAll(sets), true);
  assert.equal(activeRepo.save('nutrition-set-a'), true);
  assert.equal(activeRepo.load(), 'nutrition-set-a');

  for (const key of ['nutrition-profile-v1', 'nutrition-plan-v2', 'nutrition-plan-presets-v1', 'nutrition-sets-v1', 'nutrition-active-set-v1']) {
    assert.equal(storage.values.has(key), true, `missing key ${key}`);
  }
});

test('active nutrition set selection falls back safely when stored id is missing or stale', () => {
  const sets = [{ id: 'first' }, { id: 'second' }];
  let saved = '';
  assert.equal(resolveActiveNutritionSetId(sets, 'second', id => saved = id), 'second');
  assert.equal(saved, '');
  assert.equal(resolveActiveNutritionSetId(sets, 'deleted', id => saved = id), 'first');
  assert.equal(saved, 'first');
  assert.equal(resolveActiveNutritionSetId([], 'deleted', id => saved = id), '');
});

test('legacy weekly goals migrate only when active set has no goals', () => {
  const plan = { personalWeeklyGoals: { completeness: { fish: 2 }, frequency: {}, diversity: { nuts: 3 } } };
  const activeSet = { personalWeeklyGoals: { completeness: {}, frequency: {}, diversity: {} } };
  let saves = 0;
  assert.equal(migrateLegacyWeeklyGoals(plan, activeSet, () => saves++), true);
  assert.deepEqual(activeSet.personalWeeklyGoals.completeness, { fish: 2 });
  assert.deepEqual(activeSet.personalWeeklyGoals.diversity, { nuts: 3 });
  assert.equal(saves, 1);
  assert.equal(migrateLegacyWeeklyGoals(plan, activeSet, () => saves++), false);
  assert.equal(saves, 1);
});

test('profile age and plan calculations match v60 formula and validation', () => {
  const referenceDate = new Date(2026, 10, 17);
  assert.equal(calculateProfileAge('2000-12-14', referenceDate), 25);
  assert.equal(calculateProfileAge('2027-01-01', referenceDate), null);
  const profile = { sex: 'Мужской', birthDate: '2000-01-01', height: 180, currentWeight: 80, activityFactor: 1.55, trainingFrequency: '3–4 раза в неделю' };
  const result = calculatePlanTargets(profile, { goal: 'Поддержание веса', energyAdjustment: 100, proteinPerKg: null, fatPercent: 30 }, referenceDate);
  assert.equal(result.adjustment, 0);
  assert.equal(result.proteinRate, 1.6);
  assert.ok(result.kcal > 0 && result.bmr > 0 && result.tdee > 0);
  assert.equal(calculatePlanTargets({ ...profile, sex: '' }, DEFAULT_PLAN, referenceDate), null);
});
