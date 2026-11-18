import assert from 'node:assert/strict';
import test from 'node:test';
import { createSeedCatalog } from '../src/domain/catalog/catalog-seed.js';
import {
  productFilterCount,
  productFilterDefaults,
  productMatchesFilters,
  recipeFilterCount,
  recipeFilterDefaults,
  recipeMatchesFilters
} from '../src/domain/catalog/catalog-filters.js';

test('filter defaults are empty and counts include ranges and custom attributes', () => {
  const productFilters = productFilterDefaults();
  const recipeFilters = recipeFilterDefaults();

  assert.equal(productFilterCount(productFilters), 0);
  assert.equal(recipeFilterCount(recipeFilters), 0);
  productFilters.kcalMin = '100';
  productFilters.customAttributes.package = ['Пакет'];
  recipeFilters.timeMax = '30';
  recipeFilters.customTags = ['быстро'];
  assert.equal(productFilterCount(productFilters), 2);
  assert.equal(recipeFilterCount(recipeFilters), 2);
});

test('product matching combines query, standard filters, and custom attributes', () => {
  const { products } = createSeedCatalog();
  const oat = products.find((product) => product.id === 'oat');
  oat.brand = 'Местный';
  oat.customAttributes.package = ['Пакет'];

  const options = {
    filters: {
      ...productFilterDefaults(),
      categories: ['Зерновые'],
      allergenExclude: ['Молоко'],
      customAttributes: { package: ['Пакет'] }
    },
    standardCategories: [
      { id: 'categories' },
      { id: 'allergens' }
    ],
    customCategories: [{ id: 'package' }]
  };

  assert.equal(productMatchesFilters(oat, 'овсянка', options), true);
  assert.equal(productMatchesFilters(oat, 'молоко', options), false);
  assert.equal(productMatchesFilters(oat, '', {
    ...options,
    filters: { ...options.filters, allergenInclude: ['Молоко'] }
  }), false);
  assert.equal(productMatchesFilters(oat, '', {
    ...options,
    filters: { ...options.filters, customAttributes: { package: ['Банка'] } }
  }), false);
});

test('recipe matching applies include/exclude, nutrition, and missing-product filters', () => {
  const { recipes, products } = createSeedCatalog();
  const recipe = recipes[0];
  const standardCategories = [
    { id: 'mealTypes' },
    { id: 'allergens' },
    { id: 'composition' },
    { id: 'products' }
  ];
  const options = {
    filters: {
      ...recipeFilterDefaults(),
      mealTypes: ['Завтрак'],
      allergenExclude: ['Яйца'],
      kcalMax: '200',
      productsInclude: ['oat']
    },
    standardCategories,
    products
  };

  assert.equal(recipeMatchesFilters(recipe, 'каша', options), true);
  assert.equal(recipeMatchesFilters(recipe, 'суп', options), false);
  assert.equal(recipeMatchesFilters(recipe, '', {
    ...options,
    filters: { ...options.filters, productsInclude: ['missing-product'] }
  }), false);
  assert.equal(recipeMatchesFilters(recipe, '', {
    ...options,
    filters: { ...options.filters, allergenExclude: ['Молоко'] }
  }), false);
});
