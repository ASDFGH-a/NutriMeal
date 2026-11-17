import test from 'node:test';
import assert from 'node:assert/strict';
import { recipes } from '../src/domain/recipe/recipe.defaults.js';
import { productDB } from '../src/domain/product/product.defaults.js';
import { productSeedMetadata } from '../src/domain/product/product-seed-metadata.js';
import { normalizeProductCatalog } from '../src/domain/product/product-normalizer.js';
import { getStandardMeals, getMealShares, getDiaryMealOptions, diaryMealShare } from '../src/domain/diary/meal-config.js';
import { createDiaryRepository } from '../src/infrastructure/persistence/repositories/diary.repository.js';
import { createWaterRepository } from '../src/infrastructure/persistence/repositories/water.repository.js';
import { createWeightRepository } from '../src/infrastructure/persistence/repositories/weight.repository.js';
import { createMeasurementRepository } from '../src/infrastructure/persistence/repositories/measurement.repository.js';

test('seed catalogs are extracted and non-empty', () => {
  assert.equal(recipes.length, 6);
  assert.equal(productDB.length, 7);
});

test('product normalizer preserves legacy defaults and existing values', () => {
  const products = structuredClone(productDB);
  normalizeProductCatalog(products, productSeedMetadata);
  const oat = products.find(item => item.id === 'oat');
  assert.deepEqual(oat.categories, ['Зерновые']);
  assert.deepEqual(oat.allergens, ['Глютен']);
  assert.deepEqual(oat.state, ['Сухой']);
  assert.deepEqual(oat.components, []);
  assert.equal(oat.basisUnit, 'г');
  assert.equal(oat.favorite, false);
});

test('meal configuration reproduces v60 meal sets and normalized shares', () => {
  assert.deepEqual(getStandardMeals(3), ['Завтрак', 'Обед', 'Ужин']);
  const shares = getMealShares(3);
  assert.ok(Math.abs(shares.reduce((a, b) => a + b, 0) - 1) < 1e-12);
  assert.equal(diaryMealShare(3, 'Обед'), shares[1]);
  assert.equal(diaryMealShare(3, 'Перекус'), null);
  assert.deepEqual(getDiaryMealOptions(1, [{ meal: 'Ночной перекус' }, { meal: 'Калории за день' }]), ['Завтрак', 'Ночной перекус', 'Перекус']);
});

test('repositories retain v60 storage keys and round-trip arrays', () => {
  const values = new Map();
  const storage = {
    getItem: key => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, value)
  };
  const repos = [
    [createDiaryRepository(storage), 'nutrition-diary-v1'],
    [createWaterRepository(storage), 'nutrition-water-v1'],
    [createWeightRepository(storage), 'nutrition-weight-history-v1'],
    [createMeasurementRepository(storage), 'nutrition-measurement-history-v1']
  ];
  for (const [repo, key] of repos) {
    const sample = [{ id: key, value: 1 }];
    assert.equal(repo.saveAll(sample), true);
    assert.deepEqual(repo.loadAll(), sample);
    assert.ok(values.has(key));
  }
});
