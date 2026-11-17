export function defaultRecipeCardDisplaySettings(customCategories = []) {
  const defaults = {
    time: true,
    mealTypes: true,
    cuisines: false,
    dishTypes: false,
    allergens: false,
    categories: false,
    composition: true,
    products: false,
    customTags: true
  };

  for (const category of Array.isArray(customCategories) ? customCategories : []) {
    const id = String(category?.id ?? '');
    if (id && !(id in defaults)) defaults[id] = false;
  }

  return defaults;
}

export const DEFAULT_PRODUCT_CARD_DISPLAY_SETTINGS = Object.freeze({
  brand: true,
  energy: true,
  macros: true,
  categories: true,
  components: false,
  allergens: false,
  state: false,
  tags: false
});

export function defaultCatalogCardSettings(customRecipeCategories = []) {
  return {
    recipes: defaultRecipeCardDisplaySettings(customRecipeCategories),
    products: { ...DEFAULT_PRODUCT_CARD_DISPLAY_SETTINGS }
  };
}

export function normalizeCatalogCardSettings(saved, customRecipeCategories = []) {
  const source = saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {};
  const savedRecipes = source.recipes && typeof source.recipes === 'object' && !Array.isArray(source.recipes)
    ? source.recipes
    : {};
  const savedProducts = source.products && typeof source.products === 'object' && !Array.isArray(source.products)
    ? source.products
    : {};

  const recipeSettings = {
    ...defaultRecipeCardDisplaySettings(customRecipeCategories),
    ...savedRecipes
  };

  // Preferences saved by v35's narrower card-settings panel.
  if (!('mealTypes' in savedRecipes) && 'mealType' in savedRecipes) {
    recipeSettings.mealTypes = savedRecipes.mealType;
  }
  if (!('composition' in savedRecipes) && ('energy' in savedRecipes || 'macros' in savedRecipes)) {
    recipeSettings.composition = Boolean(savedRecipes.energy || savedRecipes.macros);
  }
  if (!('customTags' in savedRecipes) && 'tags' in savedRecipes) {
    recipeSettings.customTags = savedRecipes.tags;
  }

  return {
    recipes: recipeSettings,
    products: { ...DEFAULT_PRODUCT_CARD_DISPLAY_SETTINGS, ...savedProducts }
  };
}
