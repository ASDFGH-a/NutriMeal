import {
  normalizeRecipeFilterValue,
  recipeArray,
  uniqueProductValues
} from '../shared/filter-utils.js';
import { ingredientAmountInProductBasis } from '../shared/nutrient-calculations.js';

export function assertValidRecipe(recipe, products) {
  if (!recipe || typeof recipe !== 'object' || Array.isArray(recipe)) {
    throw new TypeError('A recipe object is required.');
  }
  if (!Array.isArray(products)) throw new TypeError('Products must be an array.');
  if (!String(recipe.name ?? '').trim()) throw new TypeError('Recipe name is required.');

  const totalWeight = Number(recipe.totalWeight);
  const portionGrams = Number(recipe.portionGrams);
  if (!Number.isFinite(totalWeight) || totalWeight <= 0) {
    throw new RangeError('Cooked recipe weight must be greater than 0 g.');
  }
  if (!Number.isFinite(portionGrams) || portionGrams <= 0) {
    throw new RangeError('Recipe portion must be greater than 0 g.');
  }

  const time = Number(recipe.time) || 0;
  if (!Number.isFinite(time) || time < 0 || time > 1440) {
    throw new RangeError('Recipe preparation time must be between 0 and 1440 minutes.');
  }

  const ingredients = Array.isArray(recipe.ingredientItems) ? recipe.ingredientItems : [];
  const validIngredients = ingredients.filter((ingredient) => {
    const amount = Number(ingredient?.amount ?? ingredient?.grams);
    return ingredient?.productId && Number.isFinite(amount) && amount > 0;
  });
  if (!validIngredients.some((ingredient) => (
    products.some((product) => product && String(product.id) === String(ingredient.productId))
  ))) {
    throw new TypeError('Recipe must contain at least one positive-quantity catalog product.');
  }

  for (const ingredient of validIngredients) {
    if (ingredient.unit && !['г', 'мл'].includes(ingredient.unit)) {
      throw new TypeError('Ingredient unit must be г or мл.');
    }
    const product = products.find((item) => item && String(item.id) === String(ingredient.productId));
    if (product && !ingredientAmountInProductBasis(ingredient, product).valid) {
      throw new RangeError(`Product "${product.name}" needs density to convert ingredient units.`);
    }
  }

  for (const component of Array.isArray(recipe.components) ? recipe.components : []) {
    if (!String(component?.name ?? '').trim()) continue;
    if (component.amount === undefined || component.amount === null || component.amount === '') {
      throw new RangeError(`Recipe micronutrient "${component.name}" must have a valid amount and unit.`);
    }
    const amount = Number(component.amount);
    if (!Number.isFinite(amount) || amount < 0 || !component.unit) {
      throw new RangeError(`Recipe micronutrient "${component.name}" must have a valid amount and unit.`);
    }
  }
}

export function uniqueAllergens(values) {
  return [...new Map(recipeArray(values).map((value) => [
    normalizeRecipeFilterValue(value),
    String(value).trim()
  ])).values()].filter(Boolean);
}

export function getEffectiveRecipeAllergens(recipe, products) {
  const allergens = [...recipeArray(recipe?.allergens)];
  for (const ingredient of recipeArray(recipe?.ingredientItems)) {
    allergens.push(...recipeArray(ingredient.productAllergens));
    const product = products.find((item) => String(item.id) === String(ingredient.productId));
    if (product) allergens.push(...recipeArray(product.allergens));
  }
  return uniqueAllergens(allergens);
}

export function getRecipeAllergyMatches(recipe, profileAllergies, products) {
  const normalizedProfileAllergies = recipeArray(profileAllergies).map(normalizeRecipeFilterValue);
  return getEffectiveRecipeAllergens(recipe, products)
    .filter((allergen) => normalizedProfileAllergies.includes(normalizeRecipeFilterValue(allergen)));
}

export function getRecipeCategories(recipe) {
  return uniqueProductValues([
    ...recipeArray(recipe?.categories),
    ...recipeArray(recipe?.foodCategories)
  ]);
}

export function getRecipeMissingProducts(recipe, products) {
  return recipeArray(recipe?.ingredientItems).filter((ingredient) => (
    !products.some((product) => String(product.id) === String(ingredient.productId))
  ));
}
