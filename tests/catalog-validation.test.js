import assert from 'node:assert/strict';
import test from 'node:test';
import { createSeedCatalog } from '../src/domain/catalog/catalog-seed.js';
import { assertValidProduct } from '../src/domain/product/product.model.js';
import { assertValidRecipe } from '../src/domain/recipe/recipe.model.js';

test('product validation enforces name, non-negative nutrients, basis, density, and components', () => {
  const product = {
    name: 'Овсянка',
    kcal: 366,
    p: 12.3,
    f: 6.1,
    c: 59.5,
    basisUnit: 'г',
    density: null,
    components: [{ name: 'Клетчатка', amount: 10, unit: 'г' }]
  };

  assert.doesNotThrow(() => assertValidProduct(product));
  assert.throws(() => assertValidProduct({ ...product, name: '  ' }), /name is required/);
  assert.throws(() => assertValidProduct({ ...product, kcal: -1 }), /non-negative/);
  assert.throws(() => assertValidProduct({ ...product, basisUnit: 'шт' }), /basis unit/);
  assert.throws(() => assertValidProduct({ ...product, density: 101 }), /density/);
  assert.throws(() => assertValidProduct({
    ...product,
    components: [{ name: 'Клетчатка', amount: '', unit: 'г' }]
  }), /valid amount/);
});

test('recipe validation requires a usable catalog ingredient and positive recipe weights', () => {
  const { recipes, products } = createSeedCatalog();
  assert.doesNotThrow(() => assertValidRecipe(recipes[0], products));

  assert.throws(() => assertValidRecipe({ ...recipes[0], name: ' ' }, products), /name is required/);
  assert.throws(() => assertValidRecipe({ ...recipes[0], totalWeight: 0 }, products), /weight must be greater/);
  assert.throws(() => assertValidRecipe({ ...recipes[0], time: 1441 }, products), /between 0 and 1440/);
  assert.throws(() => assertValidRecipe({
    ...recipes[0],
    ingredientItems: [{ productId: 'missing', grams: 20 }]
  }, products), /catalog product/);
});
