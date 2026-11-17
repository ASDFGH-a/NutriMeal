import test from 'node:test';
import assert from 'node:assert/strict';

import { PROFILE_WEEKDAYS } from '../src/domain/profile/profile.constants.js';
import { profileAllergenSuggestions } from '../src/domain/profile/profile-allergen-suggestions.js';
import {
  defaultRecipeCardDisplaySettings,
  DEFAULT_PRODUCT_CARD_DISPLAY_SETTINGS,
  defaultCatalogCardSettings,
  normalizeCatalogCardSettings
} from '../src/domain/catalog/catalog-card-settings.js';
import {
  CATALOG_CARD_SETTINGS_STORAGE_KEY,
  createCatalogCardSettingsRepository
} from '../src/infrastructure/persistence/repositories/catalog-card-settings.repository.js';
import {
  profileTokenChipMarkup,
  profileTokenDisplayMarkup,
  profileTokenEditorMarkup
} from '../src/ui/components/profile/profile-token-markup.js';

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    values,
    getItem: key => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value))
  };
}
const quietLogger = { warn() {} };
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char]));

test('profile weekdays match v60 order', () => {
  assert.deepEqual(PROFILE_WEEKDAYS, ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']);
});

test('allergen suggestions merge defaults, recipe filter values and selected profile values uniquely', () => {
  assert.deepEqual(profileAllergenSuggestions({
    productAllergenDefaults: ['Молоко', 'Яйца', 'Орехи'],
    recipeAllergens: ['молоко', 'Соя', ''],
    selectedAllergies: [' СОЯ ', 'Кунжут']
  }), ['Молоко', 'Яйца', 'Орехи', 'Соя', 'Кунжут']);
});

test('catalog card defaults reproduce v60 and add custom recipe categories hidden', () => {
  assert.deepEqual(defaultRecipeCardDisplaySettings([{ id: 'my-category' }, { id: 'time' }]), {
    time: true, mealTypes: true, cuisines: false, dishTypes: false,
    allergens: false, categories: false, composition: true, products: false,
    customTags: true, 'my-category': false
  });
  assert.deepEqual(defaultCatalogCardSettings().products, { ...DEFAULT_PRODUCT_CARD_DISPLAY_SETTINGS });
});

test('catalog card settings merge saved values and migrate v35 legacy fields', () => {
  const normalized = normalizeCatalogCardSettings({
    recipes: { mealType: false, energy: true, macros: false, tags: false, cuisines: true },
    products: { brand: false, customProductField: true }
  }, [{ id: 'new-category' }]);

  assert.equal(normalized.recipes.mealTypes, false);
  assert.equal(normalized.recipes.composition, true);
  assert.equal(normalized.recipes.customTags, false);
  assert.equal(normalized.recipes.cuisines, true);
  assert.equal(normalized.recipes['new-category'], false);
  assert.equal(normalized.products.brand, false);
  assert.equal(normalized.products.energy, true);
  assert.equal(normalized.products.customProductField, true);

  const explicitModern = normalizeCatalogCardSettings({
    recipes: { mealTypes: true, mealType: false, composition: false, energy: true, customTags: true, tags: false }
  });
  assert.equal(explicitModern.recipes.mealTypes, true);
  assert.equal(explicitModern.recipes.composition, false);
  assert.equal(explicitModern.recipes.customTags, true);
});

test('catalog card settings repository preserves v60 key and round-trips settings', () => {
  const storage = memoryStorage();
  const repo = createCatalogCardSettingsRepository(storage, {
    customRecipeCategories: [{ id: 'custom' }],
    logger: quietLogger
  });
  const defaults = repo.load();
  assert.equal(defaults.recipes.custom, false);
  assert.equal(repo.save({ recipes: { custom: true }, products: { brand: false } }), true);
  assert.deepEqual(repo.load(), {
    recipes: { ...defaultRecipeCardDisplaySettings([{ id: 'custom' }]), custom: true },
    products: { ...DEFAULT_PRODUCT_CARD_DISPLAY_SETTINGS, brand: false }
  });
  assert.equal(storage.values.has(CATALOG_CARD_SETTINGS_STORAGE_KEY), true);
});

test('catalog card settings repository safely defaults for malformed JSON and invalid shapes', () => {
  const malformed = memoryStorage({ [CATALOG_CARD_SETTINGS_STORAGE_KEY]: '{bad json' });
  const malformedRepo = createCatalogCardSettingsRepository(malformed, { logger: quietLogger });
  assert.deepEqual(malformedRepo.load(), defaultCatalogCardSettings());

  const invalid = memoryStorage({ [CATALOG_CARD_SETTINGS_STORAGE_KEY]: JSON.stringify(['not', 'an object']) });
  const invalidRepo = createCatalogCardSettingsRepository(invalid, { logger: quietLogger });
  assert.deepEqual(invalidRepo.load(), defaultCatalogCardSettings());
});

test('profile token markup escapes dynamic values and renders empty state', () => {
  assert.equal(
    profileTokenChipMarkup(['<img src=x>', 'Milk & eggs'], 'allergies', escapeHtml),
    '<span class="profile-token-chip"><span>&lt;img src=x&gt;</span><button type="button" aria-label="Удалить &lt;img src=x&gt;" data-profile-token-remove="allergies" data-index="0">×</button></span><span class="profile-token-chip"><span>Milk &amp; eggs</span><button type="button" aria-label="Удалить Milk &amp; eggs" data-profile-token-remove="allergies" data-index="1">×</button></span>'
  );
  assert.equal(profileTokenDisplayMarkup([], escapeHtml), '<span class="profile-no-data">Не указано</span>');
  assert.match(profileTokenEditorMarkup('allergies', '<Аллергии>', '"введите"', '<help>', escapeHtml), /&lt;Аллергии&gt;/);
  assert.match(profileTokenEditorMarkup('allergies', 'Аллергии', 'введите', '', escapeHtml), /id="profile-allergies-add"/);
});

test('profile token markup requires an explicit HTML escaper', () => {
  assert.throws(() => profileTokenDisplayMarkup(['Milk']), /requires escapeHtml/);
});
