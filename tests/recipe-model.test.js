import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getEffectiveRecipeAllergens,
  getRecipeAllergyMatches,
  getRecipeCategories,
  getRecipeMissingProducts,
  uniqueAllergens
} from '../src/domain/recipe/recipe.model.js';

test('recipe allergens combine explicit values and current ingredient-product values', () => {
  const recipe = {
    allergens: ['Молоко', 'Глютен'],
    ingredientItems: [
      { productId: 'egg', productAllergens: ['Яйца'] },
      { productId: 'milk' }
    ]
  };
  const products = [
    { id: 'egg', allergens: ['яйца', 'Соя'] },
    { id: 'milk', allergens: ['МОЛОКО'] }
  ];

  assert.deepEqual(
    getEffectiveRecipeAllergens(recipe, products),
    ['МОЛОКО', 'Глютен', 'яйца', 'Соя']
  );
  assert.deepEqual(getRecipeAllergyMatches(recipe, ['яйца', 'соя'], products), ['яйца', 'Соя']);
});

test('recipe categories deduplicate case-insensitively and missing references remain visible', () => {
  const recipe = {
    categories: ['Зерновые', 'Молочные продукты'],
    foodCategories: [' зерновые ', 'Фрукты'],
    ingredientItems: [{ productId: 'known' }, { productId: 'missing' }]
  };

  assert.deepEqual(getRecipeCategories(recipe), ['Зерновые', 'Молочные продукты', 'Фрукты']);
  assert.deepEqual(getRecipeMissingProducts(recipe, [{ id: 'known' }]), [{ productId: 'missing' }]);
  assert.deepEqual(uniqueAllergens(['Глютен', 'глютен', 'Молоко']), ['глютен', 'Молоко']);
});
