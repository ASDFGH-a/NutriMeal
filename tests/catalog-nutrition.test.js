import assert from 'node:assert/strict';
import test from 'node:test';
import { createSeedCatalog } from '../src/domain/catalog/catalog-seed.js';
import { normalizeProduct } from '../src/domain/product/product-normalizer.js';
import { calculateRecipeNutrition } from '../src/domain/shared/nutrient-calculations.js';

test('seed recipes retain their ingredient details and are independently normalized', () => {
  const first = createSeedCatalog();
  const second = createSeedCatalog();

  assert.equal(first.recipes[0].ingredientItems.length, 2);
  assert.equal(first.recipes[0].totalWeight, 340);
  assert.equal(first.recipes[0].portionGrams, 220);
  assert.equal(first.recipes[0].difficulty, 'Легко');
  assert.equal(first.recipes[0].cuisine, 'Домашняя');
  first.recipes[0].ingredientItems[0].grams = 1;
  assert.equal(second.recipes[0].ingredientItems[0].grams, 100);
});

test('recipe nutrition scales product values to cooked weight and reports missing products', () => {
  const { recipes, products } = createSeedCatalog();
  const result = calculateRecipeNutrition(recipes[0], products);
  const incompleteRecipe = calculateRecipeNutrition(recipes[2], products);

  assert.deepEqual(result.total, {
    kcal: 496,
    p: 19.3,
    f: 12.35,
    c: 71.25,
    fiber: 10.6,
    sugar: 12.75,
    sodium: 112,
    cholesterol: 25,
    potassium: 804
  });
  assert.ok(Math.abs(result.per100.kcal - 496 / 340 * 100) < 1e-10);
  assert.ok(Math.abs(result.portion.kcal - result.per100.kcal * 2.2) < 1e-10);
  assert.equal(result.missingProducts.length, 0);
  assert.deepEqual(incompleteRecipe.missingProducts.map((item) => item.productId), ['semolina', 'sugar']);
});

test('volume-to-mass recipe amounts require product density', () => {
  const recipe = {
    totalWeight: 100,
    portionGrams: 50,
    ingredientItems: [{ productId: 'oil', amount: 10, unit: 'мл' }]
  };
  const product = { id: 'oil', basisUnit: 'г', kcal: 900, p: 0, f: 100, c: 0 };
  const missingDensity = calculateRecipeNutrition(recipe, [product]);
  const withDensity = calculateRecipeNutrition(recipe, [{ ...product, density: 0.9 }]);

  assert.equal(missingDensity.conversionIssues.length, 1);
  assert.equal(missingDensity.total.kcal, 0);
  assert.equal(withDensity.conversionIssues.length, 0);
  assert.equal(withDensity.total.kcal, 81);
});

test('product normalization fills legacy seed defaults without mutating input', () => {
  const input = { id: 'x', name: 'Продукт', categories: null, customAttributes: [] };
  const normalized = normalizeProduct(input, {
    categories: ['Зерновые'],
    state: ['Сухой'],
    allergens: []
  });

  assert.deepEqual(normalized.categories, ['Зерновые']);
  assert.deepEqual(normalized.state, ['Сухой']);
  assert.deepEqual(normalized.allergens, []);
  assert.deepEqual(normalized.customAttributes, {});
  assert.equal(normalized.favorite, false);
  assert.equal(normalized.basisUnit, 'г');
  assert.equal(input.favorite, undefined);
  assert.deepEqual(normalizeProduct({ id: 'plain', name: 'Простой продукт' }).categories, []);
});
