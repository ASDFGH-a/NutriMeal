import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isCalorieOnlyEntry,
  isMassSystemEntry,
  isNutritionSetAverageEntry,
  macrosFor
} from '../src/domain/diary/diary-calculations.js';
import {
  measurementValue,
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

test('measurement calculations handle missing values and compare paired measurements', () => {
  assert.equal(measurementValue('Талия', { Талия: '72.5' }), 72.5);
  assert.equal(measurementValue('Талия', { Талия: 0 }), null);
  assert.equal(measurementValue('Рост', null, [{ name: 'Рост', value: 166 }]), 166);
  assert.equal(ratioPercent(70, 100), 70);
  assert.equal(ratioPercent(0, 100), null);
  assert.deepEqual(symmetryDifference(32, 30), { cm: 2, percent: 6.451612903225806 });
  assert.equal(symmetryDifference(0, 30), null);
});
