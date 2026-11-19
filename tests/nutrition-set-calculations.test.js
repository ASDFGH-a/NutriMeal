import assert from 'node:assert/strict';
import test from 'node:test';
import { createSeedCatalog } from '../src/domain/catalog/catalog-seed.js';
import {
  aggregateNutritionWeeks,
  getNutritionPeriodStats,
  getNutritionWeekGoalStats,
  getNutritionSetAverage,
  getNutritionSetFoodGroupCount,
  getNutritionWeekAverage,
  getNutritionWeekFoodStats,
  getPersonalWeeklyGoal,
  recipeMatchesFoodGroup,
  WEEKLY_FOOD_GROUPS
} from '../src/domain/nutrition-set/nutrition-set.calculations.js';
import { createDefaultNutritionSets } from '../src/domain/nutrition-set/nutrition-set.defaults.js';

test('weekly food statistics count matching recipes and unique ingredient products', () => {
  const { recipes, products } = createSeedCatalog();
  const vegetables = getNutritionWeekFoodStats({
    mainDishes: [{ id: 'main', recipeId: '5' }],
    snacks: []
  }, recipes, products);
  const breakfast = getNutritionWeekFoodStats({
    mainDishes: [{ id: 'main', recipeId: '1' }],
    snacks: []
  }, recipes, products);

  assert.equal(vegetables.vegetables.count, 1);
  assert.deepEqual([...vegetables.vegetables.items], ['Картофель', 'Морковь']);
  assert.equal(breakfast.grains.count, 1);
  assert.deepEqual([...breakfast.grains.items], ['Овсянка']);
  assert.equal(breakfast.protein.count, 1);
  assert.deepEqual([...breakfast.protein.items], ['Молоко', 'Молоко 2,5%']);
  assert.equal(getNutritionSetFoodGroupCount(createDefaultNutritionSets(products)[0], recipes, products), 3);
  assert.equal(WEEKLY_FOOD_GROUPS.length, 7);
});

test('recipe selection matches food groups from recipe and ingredient categories', () => {
  const products = [{ id: 'carrot', name: 'Морковь', categories: ['Овощи'] }];
  const recipeCategoryMatch = {
    id: 'direct',
    name: 'Овощной суп',
    categories: [' овощи ']
  };
  const ingredientCategoryMatch = {
    id: 'ingredient',
    name: 'Морковный гарнир',
    ingredientItems: [{ productId: 'carrot' }]
  };
  const vegetableGroup = { categories: ['Овощи'] };

  assert.equal(recipeMatchesFoodGroup(recipeCategoryMatch, vegetableGroup, products), true);
  assert.equal(recipeMatchesFoodGroup(ingredientCategoryMatch, vegetableGroup, products), true);
  assert.equal(recipeMatchesFoodGroup(recipeCategoryMatch, { categories: ['Зерновые'] }, products), false);
  assert.throws(() => recipeMatchesFoodGroup(recipeCategoryMatch, {}, products), TypeError);
});

test('weekly goal stats apply default and personal frequency and diversity targets', () => {
  const { recipes, products } = createSeedCatalog();
  const stats = getNutritionWeekGoalStats({
    mainDishes: [{ id: 'vegetables', recipeId: '5' }],
    snacks: []
  }, {
    personalWeeklyGoals: {
      completeness: { vegetables: 1 },
      diversity: { vegetables: 3 }
    }
  }, recipes, products);
  const vegetables = stats.find((stat) => stat.group.id === 'vegetables');
  const fruit = stats.find((stat) => stat.group.id === 'fruit');

  assert.equal(vegetables.count, 1);
  assert.equal(vegetables.items.size, 2);
  assert.equal(vegetables.completionPercent, 100);
  assert.equal(vegetables.completionReached, true);
  assert.equal(vegetables.diversityPercent, 67);
  assert.equal(vegetables.diversityReached, false);
  assert.equal(vegetables.diversityRemaining, 1);
  assert.equal(fruit.completionTarget, 7);
  assert.equal(fruit.completionPercent, 0);
  assert.equal(fruit.completionReached, false);
  assert.equal(fruit.diversityTarget, null);
});

test('nutrition aggregation preserves recipe diagnostics and computes seven- and 28-day averages', () => {
  const { recipes, products } = createSeedCatalog();
  const week = {
    mainDishes: [{ id: 'known', recipeId: '1' }, { id: 'missing', recipeId: 'not-in-catalog' }],
    snacks: [],
    productIds: ['oat']
  };
  const aggregate = aggregateNutritionWeeks([week], recipes, products);
  const weeklyAverage = getNutritionWeekAverage(week, recipes, products);
  const setAverage = getNutritionSetAverage({ weeks: [week, {}, {}, {}] }, recipes, products);

  assert.equal(aggregate.recipeCount, 2);
  assert.equal(aggregate.unresolvedDishCount, 1);
  assert.equal(aggregate.missingProductCount, 0);
  assert.equal(aggregate.missingDataCount, 1);
  assert.equal(aggregate.totals.kcal, 496);
  assert.equal(aggregate.productNames.has('Овсянка'), true);
  assert.ok(Math.abs(weeklyAverage.totals.kcal - 496 / 7) < 1e-10);
  assert.ok(Math.abs(setAverage.totals.kcal - 496 / 28) < 1e-10);
  assert.equal(getNutritionWeekAverage({ mainDishes: [], snacks: [] }, recipes, products).hasData, false);
});

test('nutrition aggregation combines unresolved recipes and ingredient diagnostics', () => {
  const recipes = [
    { id: 'missing-product', totalWeight: 100, portionGrams: 100, ingredientItems: [{ productId: 'missing', amount: 10, unit: 'г' }] },
    { id: 'conversion', totalWeight: 100, portionGrams: 50, ingredientItems: [{ productId: 'oil', amount: 10, unit: 'мл' }] }
  ];
  const products = [{ id: 'oil', basisUnit: 'г', kcal: 900, p: 0, f: 100, c: 0 }];
  const aggregate = aggregateNutritionWeeks([{
    mainDishes: [
      { id: 'unresolved', recipeId: 'not-in-catalog' },
      { id: 'missing-product', recipeId: 'missing-product' },
      { id: 'conversion', recipeId: 'conversion' }
    ],
    snacks: []
  }], recipes, products);

  assert.equal(aggregate.unresolvedDishCount, 1);
  assert.equal(aggregate.missingProductCount, 1);
  assert.equal(aggregate.conversionIssueCount, 1);
  assert.equal(aggregate.missingDataCount, 3);
});

test('nutrition period stats scale targets and calculate macro completion for day and week', () => {
  const aggregate = {
    recipeCount: 1,
    totals: { kcal: 14000, p: 700, f: 350, c: 1400 },
    components: []
  };
  const targets = { kcal: 2000, protein: 100, fat: 60, carbs: 200 };

  const daily = getNutritionPeriodStats(aggregate, targets, 'day');
  assert.equal(daily.days, 1);
  assert.deepEqual(daily.totals, { kcal: 2000, p: 100, f: 50, c: 200 });
  assert.equal(daily.targetKcal, 2000);
  assert.deepEqual(daily.macros, [
    { key: 'p', actual: 100, target: 100, percent: 100 },
    { key: 'f', actual: 50, target: 60, percent: 83 },
    { key: 'c', actual: 200, target: 200, percent: 100 }
  ]);

  const weekly = getNutritionPeriodStats(aggregate, targets, 'week');
  assert.equal(weekly.days, 7);
  assert.equal(weekly.targetKcal, 14000);
  assert.deepEqual(weekly.totals, aggregate.totals);
  assert.deepEqual(weekly.macros, [
    { key: 'p', actual: 700, target: 700, percent: 100 },
    { key: 'f', actual: 350, target: 420, percent: 83 },
    { key: 'c', actual: 1400, target: 1400, percent: 100 }
  ]);
});

test('component aggregation converts grams and milligrams to the reference unit', () => {
  const recipes = [
    { id: 1, totalWeight: 100, portionGrams: 100, components: [{ name: 'Кальций', amount: 1, unit: 'г' }] },
    { id: 2, totalWeight: 100, portionGrams: 100, components: [{ name: 'Кальций', amount: 250, unit: 'мг' }] }
  ];
  const aggregate = aggregateNutritionWeeks([{
    mainDishes: [{ id: 'a', recipeId: 1 }, { id: 'b', recipeId: 2 }],
    snacks: []
  }], recipes, []);

  assert.deepEqual(aggregate.components, [{ name: 'Кальций', unit: 'мг', amount: 1250 }]);
  assert.equal(getPersonalWeeklyGoal({
    personalWeeklyGoals: { frequency: { vegetables: 4 } }
  }, 'vegetables', 'completeness'), 4);
});
