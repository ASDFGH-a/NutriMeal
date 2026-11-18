import { normalizeRecipeSeed } from '../../../domain/recipe/recipe.defaults.js';
import { assertValidRecipe, uniqueAllergens } from '../../../domain/recipe/recipe.model.js';
import { calculateRecipeNutrition } from '../../../domain/shared/nutrient-calculations.js';
import {
  assertCatalogCollections,
  assertRecipeSaveResult
} from '../../../contracts/catalog.contract.js';

function nextRecipeId(recipes) {
  return Math.max(0, ...recipes.map((recipe) => Number(recipe.id) || 0)) + 1;
}

export function saveRecipe({ recipes, products, draft, existingId = null }) {
  assertCatalogCollections({ recipes, products });

  const existingIndex = existingId === null
    ? -1
    : recipes.findIndex((recipe) => String(recipe.id) === String(existingId));
  if (existingId !== null && existingIndex < 0) {
    throw new Error(`Recipe "${existingId}" was not found.`);
  }

  const existing = existingIndex >= 0 ? recipes[existingIndex] : null;
  const normalized = normalizeRecipeSeed(draft);
  const ingredientItems = (Array.isArray(normalized.ingredientItems) ? normalized.ingredientItems : [])
    .filter((ingredient) => (
      Number(ingredient?.amount ?? ingredient?.grams) > 0 && ingredient?.productId
    ))
    .map((ingredient) => {
      const product = products.find((item) => String(item.id) === String(ingredient.productId));
      return {
        ...ingredient,
        productName: ingredient.productName || product?.name || '',
        productAllergens: product
          ? [...(Array.isArray(product.allergens) ? product.allergens : [])]
          : [...(Array.isArray(ingredient.productAllergens) ? ingredient.productAllergens : [])]
      };
    });

  const recipe = {
    ...normalized,
    id: existing ? existing.id : nextRecipeId(recipes),
    name: String(normalized.name ?? '').trim(),
    time: Number(normalized.time) >= 0 ? Number(normalized.time) : 0,
    ingredientItems,
    allergens: uniqueAllergens([
      ...(Array.isArray(normalized.allergens) ? normalized.allergens : []),
      ...ingredientItems.flatMap((ingredient) => ingredient.productAllergens)
    ]),
    ingredients: ingredientItems.map((ingredient) => (
      `${ingredient.productName || 'Продукт'} — ${Number(ingredient.amount ?? ingredient.grams)} ${ingredient.unit || 'г'}`
    )).join(', '),
    steps: (Array.isArray(normalized.steps) ? normalized.steps : [])
      .map((step) => String(step).trim())
      .filter(Boolean),
    mine: true,
    favorite: existing ? Boolean(normalized.favorite ?? existing.favorite) : false
  };
  assertValidRecipe(recipe, products);

  const nutrition = calculateRecipeNutrition(recipe, products).per100;
  Object.assign(recipe, { kcal: nutrition.kcal, p: nutrition.p, f: nutrition.f, c: nutrition.c });

  const nextRecipes = [...recipes];
  if (existing) nextRecipes[existingIndex] = recipe;
  else nextRecipes.unshift(recipe);
  return assertRecipeSaveResult({ recipe, recipes: nextRecipes });
}
