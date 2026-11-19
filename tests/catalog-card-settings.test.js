import assert from 'node:assert/strict';
import test from 'node:test';
import { initializeCoreDataFromStorage } from './helpers/core-data.js';
import {
  createDefaultCatalogCardSettings,
  normalizeCatalogCardSettings
} from '../src/domain/catalog/catalog-card-settings.js';
import {
  CATALOG_CARD_SETTINGS_STORAGE_KEY,
  createCatalogCardSettingsRepository
} from '../src/infrastructure/persistence/repositories/catalog-card-settings.repository.js';

function createMemoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, value);
    }
  };
}

test('card display defaults include hidden custom categories without changing standard defaults', () => {
  const settings = createDefaultCatalogCardSettings({
    recipeCustomCategories: [{ id: 'difficulty' }],
    productCustomCategories: [{ id: 'origin' }]
  });

  assert.deepEqual(settings.recipes, {
    time: true,
    mealTypes: true,
    cuisines: false,
    dishTypes: false,
    allergens: false,
    categories: false,
    composition: true,
    products: false,
    customTags: true,
    difficulty: false
  });
  assert.equal(settings.products.origin, false);
  assert.equal(settings.products.brand, true);
});

test('card settings migrate old recipe keys and preserve stored selections', () => {
  const settings = normalizeCatalogCardSettings({
    recipes: { mealType: false, energy: false, macros: true, tags: false },
    products: { brand: false, components: true }
  });

  assert.equal(settings.recipes.mealTypes, false);
  assert.equal(settings.recipes.composition, true);
  assert.equal(settings.recipes.customTags, false);
  assert.equal(settings.products.brand, false);
  assert.equal(settings.products.components, true);
  assert.equal(settings.products.energy, true);
});

test('card settings repository uses the existing key and is included in core initialization', () => {
  const storage = createMemoryStorage({
    [CATALOG_CARD_SETTINGS_STORAGE_KEY]: JSON.stringify({
      recipes: { composition: false },
      products: { allergens: true }
    })
  });
  const repository = createCatalogCardSettingsRepository(storage);

  assert.equal(repository.load().recipes.composition, false);
  assert.equal(repository.load().products.allergens, true);
  repository.save(repository.load());
  assert.equal(JSON.parse(storage.getItem(CATALOG_CARD_SETTINGS_STORAGE_KEY)).recipes.composition, false);
  assert.equal(CATALOG_CARD_SETTINGS_STORAGE_KEY, 'nutrition-catalog-card-settings');
  assert.equal(initializeCoreDataFromStorage(storage).catalogCardSettings.products.allergens, true);
});
