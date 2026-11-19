import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getMealNutritionSummary,
  getNutritionGoalProgress,
  isCalorieOnlyEntry,
  isMassSystemEntry,
  isNutritionSetAverageEntry,
  macrosFor,
  scaleNutritionByGrams
} from '../src/domain/diary/diary-calculations.js';
import {
  measurementValue,
  measurementRatios,
  ratioPercent,
  symmetryDifference
} from '../src/domain/measurement/measurement-calculations.js';

test('diary calculations aggregate macros and recognize system entries', () => {
  assert.deepEqual(macrosFor([
    { kcal: 100, p: 10, f: 2, c: 15 },
    { kcal: 50, p: null, f: 3, c: 4 }
  ]), { kcal: 150, p: 10, f: 5, c: 19 });
  assert.deepEqual(macrosFor([]), { kcal: 0, p: 0, f: 0, c: 0 });

  assert.equal(isCalorieOnlyEntry({ calorieOnly: true }), true);
  assert.equal(isCalorieOnlyEntry({ quantityMode: 'calorie-only' }), true);
  assert.equal(isNutritionSetAverageEntry({ isNutritionSetAverage: true }), true);
  assert.equal(isNutritionSetAverageEntry({ quantityMode: 'set-average' }), true);
  assert.equal(isMassSystemEntry({ quantityMode: 'calorie-only' }), true);
  assert.equal(isMassSystemEntry({ quantityMode: 'set-average' }), true);
  assert.equal(isMassSystemEntry({ quantityMode: 'grams' }), false);
});

test('nutrition scaling applies one consistent per-100-gram conversion', () => {
  const per100 = { kcal: 210, p: 12.5, f: 6, c: 24 };
  assert.deepEqual(scaleNutritionByGrams(per100, 150), {
    kcal: 315,
    p: 18.75,
    f: 9,
    c: 36
  });
  assert.deepEqual(scaleNutritionByGrams(per100, 0), { kcal: 0, p: 0, f: 0, c: 0 });
  assert.throws(() => scaleNutritionByGrams(per100, -1), /non-negative number/);
  assert.throws(() => scaleNutritionByGrams({ ...per100, p: 'bad' }, 100), /for p must be finite/);
});

test('diary nutrition progress handles missing averages and meal targets', () => {
  const progress = getNutritionGoalProgress(
    { kcal: 1250, p: 50, f: null, c: 100 },
    { kcal: 2500, p: 100, f: 50, c: 0 }
  );
  assert.deepEqual(progress.calories, { actual: 1250, target: 2500, percent: 50 });
  assert.deepEqual(progress.macros, {
    p: { actual: 50, target: 100, percent: 50 },
    f: { actual: null, target: 50, percent: null },
    c: { actual: 100, target: 0, percent: null }
  });
  assert.deepEqual(getNutritionGoalProgress({ kcal: 0 }, { kcal: 0, p: 100 }).macros.p, {
    actual: null,
    target: 100,
    percent: null
  });
  assert.deepEqual(getMealNutritionSummary(
    [{ kcal: 200, p: 8, f: 5, c: 30 }],
    'Завтрак',
    { kcal: 2000 },
    { mealCount: 3 }
  ), {
    total: { kcal: 200, p: 8, f: 5, c: 30 },
    targetKcal: 667,
    progress: 200 / 667 * 100
  });
  assert.deepEqual(getMealNutritionSummary([], 'Вне стандартного расписания', { kcal: 2000 }, {}), {
    total: { kcal: 0, p: 0, f: 0, c: 0 },
    targetKcal: null,
    progress: 0
  });
});

test('measurement calculations handle missing values and compare paired measurements', () => {
  assert.equal(measurementValue('Талия', { Талия: '72.5' }), 72.5);
  assert.equal(measurementValue('Талия', { Талия: 0 }), null);
  assert.equal(measurementValue('Рост', null, [{ name: 'Рост', value: 166 }]), 166);
  assert.equal(ratioPercent(70, 100), 70);
  assert.equal(ratioPercent(0, 100), null);
  assert.deepEqual(measurementRatios({
    'Бицепс — левая рука': 30,
    'Бицепс — правая рука': 30,
    'Предплечье — левая рука': 25,
    'Предплечье — правая рука': 25,
    'Бедро — левая нога': 50,
    'Бедро — правая нога': 50,
    'Икра — левая нога': 40,
    'Икра — правая нога': 40,
    Плечи: 120,
    Талия: 80,
    Бёдра: 100
  }, 160), {
    armToForearm: 120,
    thighToCalf: 125,
    shoulderToWaist: 150,
    waistToHips: 80,
    waistToHeight: 50
  });
  assert.deepEqual(measurementRatios({ Талия: 80 }, 0), {
    armToForearm: null,
    thighToCalf: null,
    shoulderToWaist: null,
    waistToHips: null,
    waistToHeight: null
  });
  assert.deepEqual(symmetryDifference(32, 30), { cm: 2, percent: 6.451612903225806 });
  assert.equal(symmetryDifference(0, 30), null);
});
