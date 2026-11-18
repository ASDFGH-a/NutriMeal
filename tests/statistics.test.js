import assert from 'node:assert/strict';
import test from 'node:test';
import { getDiaryStatistics } from '../src/application/usecases/statistics/get-diary-statistics.js';
import {
  calculateBodyStatistics,
  calculateDiaryStatistics,
  getDiaryStatisticsBuckets,
  getDiaryStatisticsRange,
  getMeasurementDelta,
  getNutrientReferenceValue
} from '../src/domain/statistics/diary-statistics.js';

const RANGE = { startKey: '2026-11-15', endKey: '2026-11-19' };
const PROFILE = { birthDate: '1990-01-01', sex: 'Женский' };
const PRODUCTS = [];
const RECIPES = [];
const SET = {
  personalWeeklyGoals: {
    completeness: { vegetables: 2 },
    diversity: { vegetables: 1 }
  }
};

function foodEntry(id, date, nutrients, metadata, components = []) {
  return {
    id,
    date,
    meal: 'Обед',
    name: 'Еда',
    grams: 100,
    ...nutrients,
    foodMetadataSnapshot: metadata,
    nutritionSnapshot: { components }
  };
}

function statistics(entries = [], waterEntries = []) {
  return calculateDiaryStatistics({
    diaryEntries: entries,
    waterEntries,
    products: PRODUCTS,
    recipes: RECIPES,
    profile: PROFILE,
    activeNutritionSet: SET,
    ...RANGE,
    referenceDate: new Date(2026, 10, 17)
  });
}

test('statistics ranges preserve presets, custom periods, and invalid-range fallback', () => {
  const today = new Date(2026, 10, 17);
  const week = getDiaryStatisticsRange({ period: 'Неделя', today });
  assert.equal(week.startKey, '2026-11-11');
  assert.equal(week.endKey, '2026-11-17');
  assert.equal(week.days, 7);

  const custom = getDiaryStatisticsRange({
    period: 'Произвольный период',
    customStart: '2026-11-01',
    customEnd: '2026-11-05',
    today
  });
  assert.equal(custom.days, 5);
  assert.equal(custom.startKey, '2026-11-01');

  const fallback = getDiaryStatisticsRange({
    period: 'Произвольный период',
    customStart: '2026-11-20',
    customEnd: '2026-11-21',
    today
  });
  assert.equal(fallback.startKey, '2026-11-11');
  assert.equal(fallback.endKey, '2026-11-17');
});

test('diary analytics distinguish missing records, calorie-only days, and known macros', () => {
  const entries = [
    foodEntry(1, '2026-11-15', { kcal: 300, p: 20, f: 10, c: 40 }, {
      categories: ['Овощи'], items: ['Морковь']
    }, [
      { name: 'Кальций', amount: 100, unit: 'мг' },
      { name: 'Клетчатка', amount: 3, unit: 'г' }
    ]),
    { id: 2, date: '2026-11-16', kcal: 1000, calorieOnly: true },
    foodEntry(3, '2026-11-16', { kcal: 200, p: 10, f: 5, c: 20 }, {
      categories: ['Овощи'], items: ['Морковь']
    }),
    { id: 4, date: '2026-11-17', kcal: 500, calorieOnly: true },
    foodEntry(5, '2026-11-18', { kcal: 500, p: 30, f: 20, c: 50 }, {
      categories: ['Молочные продукты'], items: ['Творог']
    }, [
      { name: 'Кальций', amount: 200, unit: 'мг' },
      { name: 'Клетчатка', amount: 2, unit: 'г' }
    ])
  ];
  const model = statistics(entries, [
    { date: '2026-11-15', ml: 250 },
    { date: '2026-11-18', ml: 250 }
  ]);

  assert.equal(model.totals.kcal, 2500);
  assert.equal(model.averages.kcal, 500);
  assert.equal(model.macroKnownDays, 2);
  assert.equal(model.averages.p, 25);
  assert.equal(model.averages.f, 15);
  assert.equal(model.averages.c, 45);
  assert.equal(model.macroIncompleteDays, 2);
  assert.equal(model.onlyCalorieDays, 1);
  assert.equal(model.mixedCalorieDays, 1);
  assert.equal(model.noRecordDays, 1);
  assert.equal(model.loggedFoodDays, 4);
  assert.equal(model.waterTotalMl, 500);
  assert.equal(model.waterAverageMl, 100);
  assert.equal(model.loggedWaterDays, 2);
  assert.equal(model.allFoodItemCount, 2);
  assert.equal(model.groupStats.find((item) => item.group.id === 'vegetables').targetEntries, 2);
  assert.equal(model.groupStats.find((item) => item.group.id === 'vegetables').frequencyPercent, 50);
  assert.equal(model.micronutrients.find((item) => item.name === 'Кальций').dailyAmount, 150);
  assert.equal(model.micronutrients.find((item) => item.name === 'Кальций').percent, 15);
});

test('statistics buckets use calendar-day averages and omit unknown macro values', () => {
  const model = statistics([
    foodEntry(1, '2026-11-15', { kcal: 300, p: 20, f: 10, c: 40 }, { categories: [], items: [] }),
    { id: 2, date: '2026-11-16', kcal: 1000, calorieOnly: true },
    foodEntry(3, '2026-11-16', { kcal: 200, p: 10, f: 5, c: 20 }, { categories: [], items: [] })
  ]);
  const calories = getDiaryStatisticsBuckets(model, 'kcal', 'Неделя');
  const protein = getDiaryStatisticsBuckets(model, 'p', 'Неделя');

  assert.equal(calories.length, 5);
  assert.deepEqual(calories.map((item) => item.value), [300, 1200, 0, 0, 0]);
  assert.equal(protein[0].value, 20);
  assert.equal(protein[1].value, null);
});

test('body analytics order measurements and calculate weight and circumference changes', () => {
  const body = calculateBodyStatistics({
    weightHistory: [
      { date: '2026-11-17', weight: 60 },
      { date: '2026-11-15', weight: 62 }
    ],
    measurementHistory: [
      { date: '2026-11-15', values: { 'Талия': 80 } },
      { date: '2026-11-17', values: { 'Талия': 78 } }
    ],
    ...RANGE
  });

  assert.equal(body.weightChange, -2);
  assert.equal(body.latestWeight.date, '2026-11-17');
  assert.equal(getMeasurementDelta('Талия', body.latestMeasure, body.previousMeasure), -2);
  assert.equal(getMeasurementDelta('Грудь', body.latestMeasure, body.previousMeasure), null);
});

test('nutrient reference values depend on age and sex and unit-compatible components', () => {
  assert.deepEqual(getNutrientReferenceValue('Кальций', PROFILE, new Date(2026, 10, 17)), {
    value: 1000,
    unit: 'мг',
    kind: 'RDA'
  });
  assert.equal(getNutrientReferenceValue('Кальций', { birthDate: '', sex: 'Женский' }), null);
});

test('statistics use case composes diary and body history for the selected date range', () => {
  const model = getDiaryStatistics({
    diaryEntries: [foodEntry(1, '2026-11-17', { kcal: 300, p: 20, f: 10, c: 40 }, { categories: [], items: [] })],
    waterEntries: [],
    weightHistory: [{ date: '2026-11-17', weight: 60 }],
    measurementHistory: [],
    recipes: RECIPES,
    products: PRODUCTS,
    profile: PROFILE,
    nutritionSets: [SET],
    period: 'Неделя',
    periodEnd: '2026-11-17',
    today: new Date(2026, 10, 17)
  });

  assert.equal(model.days, 7);
  assert.equal(model.body.latestWeight.weight, 60);
  assert.equal(model.averages.kcal, 300 / 7);
});
