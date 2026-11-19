import assert from 'node:assert/strict';
import test from 'node:test';
import { createSeedCatalog } from '../src/domain/catalog/catalog-seed.js';
import {
  addCatalogFilterSelection,
  createCustomFilterCategory,
  addCatalogFilterValue,
  productFilterCount,
  productFilterDefaults,
  getProductFilterCategoryValues,
  getRecipeFilterCategoryValues,
  productMatchesFilters,
  recipeFilterCount,
  recipeFilterDefaults,
  recipeMatchesFilters,
  removeCustomFilterCategory,
  renameCatalogFilterCategory,
  updateCatalogFilterValue,
  toggleCatalogFilterSelection,
  updateCatalogFilterSelections,
  updateProductFilterValue,
  updateRecipeFilterValue
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

test('custom filter categories normalize labels and avoid ids already in use', () => {
  const recipeCategory = createCustomFilterCategory({
    label: ' Flavor / color ',
    isProducts: false,
    existingCategories: [
      { id: 'custom-flavor-color' },
      { id: 'custom-flavor-color-2' }
    ]
  });
  const productCategory = createCustomFilterCategory({
    label: '!!!',
    isProducts: true,
    existingCategories: [{ id: 'custom-filter' }]
  });

  assert.deepEqual(recipeCategory, {
    id: 'custom-flavor-color-3',
    label: 'Flavor / color',
    kind: 'customMulti',
    recipeField: 'customAttributes',
    values: []
  });
  assert.deepEqual(productCategory, {
    id: 'custom-filter-2',
    label: '!!!',
    kind: 'customMulti',
    productField: 'customAttributes',
    values: []
  });
  assert.equal(createCustomFilterCategory({ label: '   ', existingCategories: [] }), null);
});

test('renaming a filter category trims the label and preserves its other fields', () => {
  const category = {
    id: 'custom-origin',
    kind: 'customMulti',
    recipeField: 'customAttributes',
    label: 'Origin',
    values: ['North']
  };

  assert.deepEqual(renameCatalogFilterCategory(category, '  Source  '), {
    ...category,
    label: 'Source'
  });
  assert.equal(renameCatalogFilterCategory(category, '   '), null);
  assert.equal(category.label, 'Origin');
});

test('removing a custom filter category clears only its associated catalog state', () => {
  const recipe = {
    customAttributes: { origin: ['North'], package: ['Bag'] }
  };
  const recipeFilters = {
    ...recipeFilterDefaults(),
    customAttributes: { origin: ['North'], package: ['Bag'] }
  };
  const settings = {
    recipes: { origin: true, package: true },
    products: { origin: true }
  };
  const removedRecipeCategory = removeCustomFilterCategory({
    categoryId: 'origin',
    categories: [{ id: 'origin' }, { id: 'package' }],
    items: [recipe, { name: 'No custom attributes' }],
    filters: recipeFilters,
    cardSettings: settings
  });
  const removedProductCategory = removeCustomFilterCategory({
    categoryId: 'origin',
    categories: [{ id: 'origin' }],
    items: [{ customAttributes: { origin: ['Local'], state: ['Fresh'] } }],
    filters: { ...productFilterDefaults(), customAttributes: { origin: ['Local'] } },
    cardSettings: settings,
    isProducts: true
  });

  assert.deepEqual(removedRecipeCategory.categories, [{ id: 'package' }]);
  assert.deepEqual(removedRecipeCategory.items[0].customAttributes, { package: ['Bag'] });
  assert.deepEqual(removedRecipeCategory.filters.customAttributes, { package: ['Bag'] });
  assert.deepEqual(removedRecipeCategory.cardSettings, {
    recipes: { package: true },
    products: { origin: true }
  });
  assert.deepEqual(recipe.customAttributes, { origin: ['North'], package: ['Bag'] });
  assert.deepEqual(removedProductCategory.items[0].customAttributes, { state: ['Fresh'] });
  assert.deepEqual(removedProductCategory.cardSettings.products, {});
  assert.equal(removeCustomFilterCategory({
    categoryId: 'missing',
    categories: [],
    items: [],
    filters: recipeFilterDefaults(),
    cardSettings: settings
  }), null);
});

test('recipe filter value edits rename and remove normalized values without mutating recipes', () => {
  const recipe = {
    cuisine: 'Italian',
    tags: ['Fresh', 'fresh', 'Seasonal'],
    customAttributes: { origin: ['North', 'north', 'South'], package: ['Box'] }
  };
  const renamedTags = updateRecipeFilterValue(
    recipe,
    { recipeField: 'tags' },
    'FRESH',
    'Garden'
  );
  const renamedCuisine = updateRecipeFilterValue(
    recipe,
    { recipeField: 'cuisine' },
    'italian',
    'Home'
  );
  const removedOrigin = updateRecipeFilterValue(
    recipe,
    { id: 'origin', recipeField: 'customAttributes' },
    'north',
    '',
    true
  );

  assert.deepEqual(renamedTags.tags, ['Garden', 'Seasonal']);
  assert.equal(renamedCuisine.cuisine, 'Home');
  assert.deepEqual(removedOrigin.customAttributes, { origin: ['South'], package: ['Box'] });
  assert.deepEqual(recipe.tags, ['Fresh', 'fresh', 'Seasonal']);
  assert.equal(recipe.cuisine, 'Italian');
});

test('product filter value edits preserve component metadata and remove empty components', () => {
  const product = {
    brand: 'Local',
    components: [
      { name: 'Vitamin C', amount: 12, unit: 'mg' },
      'vitamin c',
      { name: 'Iron', amount: 3, unit: 'mg' }
    ]
  };
  const renamed = updateProductFilterValue(
    product,
    { productField: 'components' },
    'VITAMIN C',
    'Ascorbic acid'
  );
  const removed = updateProductFilterValue(
    renamed,
    { productField: 'components' },
    'ascorbic acid',
    '',
    true
  );
  const renamedBrand = updateProductFilterValue(
    product,
    { productField: 'brand' },
    'local',
    'Farm'
  );

  assert.deepEqual(renamed.components, [
    { name: 'Ascorbic acid', amount: 12, unit: 'mg' },
    'Ascorbic acid',
    { name: 'Iron', amount: 3, unit: 'mg' }
  ]);
  assert.deepEqual(removed.components, [{ name: 'Iron', amount: 3, unit: 'mg' }]);
  assert.equal(renamedBrand.brand, 'Farm');
  assert.equal(product.components[0].name, 'Vitamin C');
});

test('catalog filter selections update allergen, custom, and product brand selections', () => {
  const filters = {
    ...recipeFilterDefaults(),
    allergenInclude: ['Milk', ' milk ', 'Egg'],
    allergenExclude: ['Milk'],
    customAttributes: { origin: ['North', 'north'], package: ['Box'] }
  };
  const allergens = updateCatalogFilterSelections(
    filters,
    { id: 'allergens' },
    'milk',
    'Dairy'
  );
  const custom = updateCatalogFilterSelections(
    allergens,
    { id: 'origin', kind: 'customMulti' },
    'North',
    '',
    true
  );
  const productFilters = updateCatalogFilterSelections(
    { ...productFilterDefaults(), brand: ['Local', 'local', 'Other'] },
    { id: 'brand' },
    'local',
    'Farm',
    false,
    true
  );

  assert.deepEqual(allergens.allergenInclude, ['Dairy', 'Egg']);
  assert.deepEqual(allergens.allergenExclude, ['Dairy']);
  assert.deepEqual(custom.customAttributes, { origin: [], package: ['Box'] });
  assert.deepEqual(productFilters.brand, ['Farm', 'Other']);
  assert.deepEqual(filters.allergenInclude, ['Milk', ' milk ', 'Egg']);
});

test('filter selection toggles standard and custom values without mutating state', () => {
  const filters = {
    ...recipeFilterDefaults(),
    mealTypes: ['Завтрак'],
    customAttributes: { origin: ['North'] }
  };
  const removedStandard = toggleCatalogFilterSelection(filters, 'mealTypes', 'завтрак');
  const addedCustom = toggleCatalogFilterSelection(removedStandard, 'customAttributes', 'South', 'origin');
  const removedCustom = toggleCatalogFilterSelection(addedCustom, 'customAttributes', 'south', 'origin');

  assert.deepEqual(removedStandard.mealTypes, []);
  assert.deepEqual(addedCustom.customAttributes, { origin: ['North', 'South'] });
  assert.deepEqual(removedCustom.customAttributes, { origin: ['North'] });
  assert.deepEqual(filters.mealTypes, ['Завтрак']);
  assert.deepEqual(filters.customAttributes, { origin: ['North'] });
});

test('adding a newly created filter tag selects it uniquely without mutation', () => {
  const filters = {
    ...recipeFilterDefaults(),
    customTags: ['Fresh', 'fresh', 'Seasonal']
  };
  const updated = addCatalogFilterSelection(filters, 'customTags', 'Fresh');
  const withNewTag = addCatalogFilterSelection(updated, 'customTags', 'Quick');

  assert.deepEqual(updated.customTags, ['Fresh', 'Seasonal']);
  assert.deepEqual(withNewTag.customTags, ['Fresh', 'Seasonal', 'Quick']);
  assert.deepEqual(filters.customTags, ['Fresh', 'fresh', 'Seasonal']);
});

test('catalog filter value changes update categories, items, and selections without mutation', () => {
  const category = {
    id: 'origin',
    kind: 'customMulti',
    recipeField: 'customAttributes',
    values: ['North']
  };
  const recipe = { customAttributes: { origin: ['North'], package: ['Bag'] } };
  const filters = {
    ...recipeFilterDefaults(),
    customAttributes: { origin: ['North'], package: ['Bag'] }
  };
  const renamed = updateCatalogFilterValue({
    category,
    availableValues: ['North', 'South'],
    items: [recipe],
    filters,
    oldValue: 'North',
    newValue: 'Northern'
  });
  const removed = updateCatalogFilterValue({
    category: renamed.category,
    availableValues: ['Northern'],
    items: renamed.items,
    filters: renamed.filters,
    oldValue: 'Northern',
    newValue: '',
    remove: true
  });
  const duplicate = updateCatalogFilterValue({
    category,
    availableValues: ['North', 'South'],
    items: [recipe],
    filters,
    oldValue: 'North',
    newValue: 'south'
  });

  assert.deepEqual(renamed.category.values, ['Northern']);
  assert.deepEqual(renamed.items[0].customAttributes, { origin: ['Northern'], package: ['Bag'] });
  assert.deepEqual(renamed.filters.customAttributes, { origin: ['Northern'], package: ['Bag'] });
  assert.deepEqual(removed.category.values, []);
  assert.deepEqual(removed.items[0].customAttributes, { origin: [], package: ['Bag'] });
  assert.deepEqual(removed.filters.customAttributes, { origin: [], package: ['Bag'] });
  assert.equal(duplicate, null);
  assert.deepEqual(category.values, ['North']);
  assert.deepEqual(recipe.customAttributes, { origin: ['North'], package: ['Bag'] });
  assert.deepEqual(filters.customAttributes, { origin: ['North'], package: ['Bag'] });
});

test('adding a catalog filter value trims it and rejects normalized duplicates', () => {
  const category = { id: 'customTags', values: ['Quick'] };
  const added = addCatalogFilterValue({
    category,
    availableValues: ['Quick', 'Seasonal'],
    value: '  Fresh  '
  });

  assert.deepEqual(added, { id: 'customTags', values: ['Quick', 'Fresh'] });
  assert.equal(addCatalogFilterValue({
    category,
    availableValues: ['Quick', 'Seasonal'],
    value: ' seasonal '
  }), null);
  assert.equal(addCatalogFilterValue({
    category,
    availableValues: ['Quick'],
    value: '   '
  }), null);
  assert.deepEqual(category.values, ['Quick']);
});

test('recipe filter options merge configured and observed values for standard and custom fields', () => {
  const recipes = [{
    tags: ['Quick', 'quick', 'Fresh'],
    mealTypes: ['Завтрак'],
    cuisine: 'Домашняя',
    dishTypes: ['Салат'],
    categories: ['Овощи'],
    allergens: ['Орехи'],
    customAttributes: { origin: ['Север'] }
  }];
  const products = [];

  assert.deepEqual(
    getRecipeFilterCategoryValues({ id: 'customTags', values: ['Fresh'] }, recipes, products),
    ['Fresh', 'Quick']
  );
  assert.deepEqual(
    getRecipeFilterCategoryValues({ id: 'mealTypes', recipeField: 'mealTypes', values: ['Ужин'] }, recipes, products),
    ['Ужин', 'Завтрак']
  );
  assert.deepEqual(
    getRecipeFilterCategoryValues({ id: 'allergens', values: ['Молоко'] }, recipes, products),
    ['Молоко', 'Орехи']
  );
  assert.deepEqual(
    getRecipeFilterCategoryValues({ id: 'origin', recipeField: 'customAttributes', values: [] }, recipes, products),
    ['Север']
  );
});

test('product filter options include observed brands, components, and custom values', () => {
  const products = [
    {
      brand: 'Local',
      categories: ['Овощи'],
      allergens: ['Орехи'],
      state: ['Сырой'],
      tags: ['Fresh'],
      components: [{ name: 'Vitamin C', amount: 10, unit: 'mg' }, 'Iron'],
      customAttributes: { origin: ['North'] }
    },
    { brand: '', tags: ['fresh'], components: [{ name: 'Iron' }] }
  ];

  assert.deepEqual(
    getProductFilterCategoryValues({ id: 'brand', productField: 'brand', values: ['Regional'] }, products),
    ['Regional', 'Local']
  );
  assert.deepEqual(
    getProductFilterCategoryValues({ id: 'components', productField: 'components', values: [] }, products),
    ['Vitamin C', 'Iron']
  );
  assert.deepEqual(
    getProductFilterCategoryValues({ id: 'origin', productField: 'customAttributes', values: [] }, products),
    ['North']
  );
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
