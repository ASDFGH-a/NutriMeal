import assert from 'node:assert/strict';
import test from 'node:test';
import { createSeedCatalog } from '../src/domain/catalog/catalog-seed.js';
import {
  aggregateNutritionWeeks,
  getNutritionSetAverage,
  getNutritionSetFoodGroupCount,
  getNutritionWeekAverage,
  getNutritionWeekFoodStats,
  getPersonalWeeklyGoal,
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
  assert.equal(aggregate.totals.kcal, 496);
  assert.equal(aggregate.productNames.has('Овсянка'), true);
  assert.ok(Math.abs(weeklyAverage.totals.kcal - 496 / 7) < 1e-10);
  assert.ok(Math.abs(setAverage.totals.kcal - 496 / 28) < 1e-10);
  assert.equal(getNutritionWeekAverage({ mainDishes: [], snacks: [] }, recipes, products).hasData, false);
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
