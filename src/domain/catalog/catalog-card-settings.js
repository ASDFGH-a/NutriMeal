const DEFAULT_RECIPE_CARD_SETTINGS = Object.freeze({
  time: true,
  mealTypes: true,
  cuisines: false,
  dishTypes: false,
  allergens: false,
  categories: false,
  composition: true,
  products: false,
  customTags: true
});

const DEFAULT_PRODUCT_CARD_SETTINGS = Object.freeze({
  brand: true,
  energy: true,
  macros: true,
  categories: true,
  components: false,
  allergens: false,
  state: false,
  tags: false
});

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function categoryIds(categories) {
  if (!Array.isArray(categories)) throw new TypeError('Card setting categories must be an array.');
  return categories.map((category) => category?.id).filter((id) => typeof id === 'string' && id);
}

export function createDefaultCatalogCardSettings({
  recipeCustomCategories = [],
  productCustomCategories = []
} = {}) {
  const recipes = { ...DEFAULT_RECIPE_CARD_SETTINGS };
  const products = { ...DEFAULT_PRODUCT_CARD_SETTINGS };
  for (const id of categoryIds(recipeCustomCategories)) {
    if (!(id in recipes)) recipes[id] = false;
  }
  for (const id of categoryIds(productCustomCategories)) {
    if (!(id in products)) products[id] = false;
  }
  return { recipes, products };
}

export function normalizeCatalogCardSettings(saved = {}, options = {}) {
  if (!isRecord(saved)) throw new TypeError('Catalog card settings must be an object.');
  const defaults = createDefaultCatalogCardSettings(options);
  const savedRecipes = isRecord(saved.recipes) ? saved.recipes : {};
  const recipeSettings = { ...defaults.recipes, ...savedRecipes };

  if (!Object.prototype.hasOwnProperty.call(savedRecipes, 'mealTypes')
    && Object.prototype.hasOwnProperty.call(savedRecipes, 'mealType')) {
    recipeSettings.mealTypes = savedRecipes.mealType;
  }
  if (!Object.prototype.hasOwnProperty.call(savedRecipes, 'composition')
    && ('energy' in savedRecipes || 'macros' in savedRecipes)) {
    recipeSettings.composition = Boolean(savedRecipes.energy || savedRecipes.macros);
  }
  if (!Object.prototype.hasOwnProperty.call(savedRecipes, 'customTags')
    && Object.prototype.hasOwnProperty.call(savedRecipes, 'tags')) {
    recipeSettings.customTags = savedRecipes.tags;
  }

  return {
    recipes: recipeSettings,
    products: {
      ...defaults.products,
      ...(isRecord(saved.products) ? saved.products : {})
    }
  };
}
