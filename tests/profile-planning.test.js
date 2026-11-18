import assert from 'node:assert/strict';
import test from 'node:test';
import { initializeCoreData } from '../src/application/services/initialize-core-data.js';
import { applyPlanPreset, recalculatePlan } from '../src/application/usecases/planning/plan.js';
import {
  deletePlanPreset,
  renamePlanPreset,
  savePlanPreset
} from '../src/application/usecases/planning/plan-presets.js';
import { createDefaultPlan } from '../src/domain/planning/plan.defaults.js';
import {
  calculatePlanTargets,
  calculateProfileAge
} from '../src/domain/planning/plan-calculations.js';
import {
  normalizePlanData,
  normalizePlanPreset
} from '../src/domain/planning/plan.model.js';
import { createDefaultProfile } from '../src/domain/profile/profile.defaults.js';
import { normalizeProfileData } from '../src/domain/profile/profile.model.js';
import {
  createPlanPresetsRepository,
  PLAN_PRESETS_STORAGE_KEY
} from '../src/infrastructure/persistence/repositories/plan-presets.repository.js';
import {
  createPlanRepository,
  PLAN_STORAGE_KEY
} from '../src/infrastructure/persistence/repositories/plan.repository.js';
import {
  createProfileRepository,
  PROFILE_STORAGE_KEY
} from '../src/infrastructure/persistence/repositories/profile.repository.js';
import { WEIGHT_HISTORY_STORAGE_KEY } from '../src/infrastructure/persistence/repositories/weight.repository.js';

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

test('profile normalization migrates legacy activity and sanitizes training and food preferences', () => {
  const profile = normalizeProfileData({
    sex: 'invalid',
    birthDate: 25,
    dailyActivity: 'Преимущественно сижу',
    trainingFrequency: 'Нет регулярных тренировок',
    trainingDays: ['Пн', 'Funday', 'Пн'],
    allergies: [' Глютен ', 'глютен', 'Молоко'],
    foodRestrictions: ['Вегетарианство']
  });

  assert.equal(profile.sex, '');
  assert.equal(profile.birthDate, '');
  assert.equal(profile.activityFactor, 1.2);
  assert.deepEqual(profile.trainingDays, []);
  assert.deepEqual(profile.allergies, ['Глютен', 'Молоко']);
  assert.deepEqual(profile.foodRestrictions, ['Вегетарианство']);
  assert.equal('dailyActivity' in profile, false);

  assert.deepEqual(normalizeProfileData({ activityFactor: 1.725 }).activityFactor, 1.725);
  assert.deepEqual(normalizeProfileData({ activityFactor: 9 }).activityFactor, 1.375);
});

test('plan normalization canonicalizes goal aliases and migrates weekly-goal fields', () => {
  const plan = normalizePlanData({
    goal: 'Сушка',
    targetWeight: 0,
    energyAdjustment: 'invalid',
    proteinPerKg: 1.3,
    fatPercent: 50,
    personalWeeklyGoals: { frequency: { vegetables: 4 } }
  });

  assert.equal(plan.goal, 'Снижение веса');
  assert.equal(plan.targetWeight, 65);
  assert.equal(plan.energyAdjustment, -400);
  assert.equal(plan.proteinPerKg, null);
  assert.equal(plan.fatPercent, 35);
  assert.deepEqual(plan.personalWeeklyGoals.completeness, { vegetables: 4 });
  assert.deepEqual(plan.personalWeeklyGoals.diversity, {});

  const preset = normalizePlanPreset({ id: 'legacy', name: 'План', plan: { goal: 'Набор массы' } });
  assert.equal(preset.plan.goal, 'Набор веса');
  assert.equal(normalizePlanPreset({ id: 'bad', name: 'Без плана' }), null);
});

test('profile age and plan targets preserve the existing Mifflin-St Jeor calculations', () => {
  const referenceDate = new Date(2026, 10, 17);
  assert.equal(calculateProfileAge('1990-11-17', referenceDate), 36);
  assert.equal(calculateProfileAge('1990-11-18', referenceDate), 35);
  assert.equal(calculateProfileAge('2027-01-01', referenceDate), null);
  assert.equal(calculateProfileAge('1990-02-30', referenceDate), null);

  const profile = {
    ...createDefaultProfile(),
    sex: 'Мужской',
    birthDate: '1990-11-17',
    height: 180,
    currentWeight: 80,
    activityFactor: 1.2,
    trainingFrequency: 'Нет регулярных тренировок'
  };
  const plan = { ...createDefaultPlan(), goal: 'Снижение веса' };
  const result = calculatePlanTargets(profile, plan, referenceDate);

  assert.deepEqual({
    age: result.age,
    bmr: result.bmr,
    tdee: result.tdee,
    kcal: result.kcal,
    protein: result.protein,
    fat: result.fat,
    carbs: result.carbs
  }, {
    age: 36,
    bmr: 1750,
    tdee: 2100,
    kcal: 1700,
    protein: 64,
    fat: 57,
    carbs: 233
  });
  assert.equal(calculatePlanTargets({ ...profile, sex: '' }, plan, referenceDate), null);
});

test('profile, plan, and preset repositories retain legacy storage keys and normalize data', () => {
  const storage = createMemoryStorage({
    [PROFILE_STORAGE_KEY]: JSON.stringify({ dailyActivity: 'Большую часть дня стою или хожу' }),
    [PLAN_STORAGE_KEY]: JSON.stringify({ goal: 'Набор массы', fatPercent: 10 }),
    [PLAN_PRESETS_STORAGE_KEY]: JSON.stringify([
      { id: 'p1', name: 'Legacy', plan: { goal: 'Сушка' } },
      { id: '', name: 'Invalid', plan: {} }
    ]),
    [WEIGHT_HISTORY_STORAGE_KEY]: JSON.stringify([{ date: '2026-11-16', weight: 72 }])
  });

  const profileRepository = createProfileRepository(storage);
  const planRepository = createPlanRepository(storage);
  const presetsRepository = createPlanPresetsRepository(storage);

  assert.equal(profileRepository.load().activityFactor, 1.55);
  assert.equal(planRepository.load().goal, 'Набор веса');
  assert.equal(planRepository.load().fatPercent, 20);
  assert.deepEqual(presetsRepository.load().map((preset) => preset.plan.goal), ['Снижение веса']);
  assert.equal(PLAN_PRESETS_STORAGE_KEY, 'nutrition-plan-presets-v1');
  presetsRepository.save(presetsRepository.load());
  assert.equal(JSON.parse(storage.getItem(PLAN_PRESETS_STORAGE_KEY))[0].id, 'p1');

  const initialized = initializeCoreData(storage);
  assert.equal(initialized.profile.currentWeight, 72);
  assert.equal(initialized.plan.goal, 'Набор веса');
  assert.equal(initialized.planPresets.length, 1);
});

test('plan presets are saved, renamed, applied, and deleted without mutating prior values', () => {
  const initialPlan = {
    ...createDefaultPlan(),
    goal: 'Набор веса',
    targetWeight: 75,
    personalWeeklyGoals: { completeness: { vegetables: 3 }, frequency: {}, diversity: {} }
  };
  const saved = savePlanPreset({
    presets: [],
    name: '  Мой план  ',
    plan: initialPlan,
    id: 'preset-1',
    updatedAt: '2026-11-17T00:00:00.000Z'
  });
  const updated = savePlanPreset({
    presets: saved.presets,
    name: 'мой ПЛАН',
    plan: { ...initialPlan, targetWeight: 76 },
    id: 'ignored-id',
    updatedAt: '2026-11-18T00:00:00.000Z'
  });

  assert.equal(saved.presets.length, 1);
  assert.equal(updated.presets.length, 1);
  assert.equal(updated.preset.id, 'preset-1');
  assert.equal(updated.preset.plan.targetWeight, 76);
  assert.equal(saved.preset.plan.targetWeight, 75);
  assert.throws(() => savePlanPreset({ presets: [], name: 'x'.repeat(49), plan: initialPlan }), /48 characters/);

  const renamed = renamePlanPreset(updated.presets, 'preset-1', ' Новый план ', '2026-11-19');
  assert.equal(renamed.preset.name, 'Новый план');
  assert.throws(() => renamePlanPreset([
    ...renamed.presets,
    { id: 'preset-2', name: 'Другое', plan: createDefaultPlan() }
  ], 'preset-1', 'Другое'), /already exists/);

  const profile = {
    ...createDefaultProfile(),
    sex: 'Женский',
    birthDate: '1995-01-01',
    height: 165,
    currentWeight: 70,
    activityFactor: 1.375
  };
  const applied = applyPlanPreset({
    presets: renamed.presets,
    presetId: 'preset-1',
    profile,
    plan: createDefaultPlan(),
    referenceDate: new Date(2026, 10, 17)
  });
  assert.equal(applied.plan.targetWeight, 76);
  assert.ok(applied.plan.kcal > 0);
  assert.deepEqual(applied.plan.personalWeeklyGoals.completeness, { vegetables: 3 });
  assert.ok(recalculatePlan({ profile, plan: createDefaultPlan(), referenceDate: new Date(2026, 10, 17) }).targets);

  const deleted = deletePlanPreset(renamed.presets, 'preset-1');
  assert.deepEqual(deleted.presets, []);
  assert.equal(deleted.removed.name, 'Новый план');
});
