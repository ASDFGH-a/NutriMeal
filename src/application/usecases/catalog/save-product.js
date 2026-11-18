import { calculateRecipeNutrition } from '../../../domain/shared/nutrient-calculations.js';
import { normalizeProduct } from '../../../domain/product/product-normalizer.js';
import { assertValidProduct } from '../../../domain/product/product.model.js';
import {
  assertCatalogCollections,
  assertProductSaveResult
} from '../../../contracts/catalog.contract.js';

function usesProduct(recipe, productId) {
  return Array.isArray(recipe.ingredientItems)
    && recipe.ingredientItems.some((ingredient) => String(ingredient.productId) === String(productId));
}

export function saveProduct({
  products,
  recipes,
  productData,
  existingId = null,
  id = `my-${Date.now()}`,
  confirmDensityChange = false
}) {
  assertCatalogCollections({ products, recipes });
  if (!productData || typeof productData !== 'object' || Array.isArray(productData)) {
    throw new TypeError('Product data is required.');
  }

  const existingIndex = existingId === null
    ? -1
    : products.findIndex((product) => String(product.id) === String(existingId));
  if (existingId !== null && existingIndex < 0) {
    throw new Error(`Product "${existingId}" was not found.`);
  }

  const existing = existingIndex >= 0 ? products[existingIndex] : null;
  const product = normalizeProduct({
    ...(existing || {}),
    ...productData,
    id: existing ? existing.id : id,
    favorite: existing ? existing.favorite : false,
    name: String(productData.name ?? '').trim()
  });
  if (!existing && products.some((item) => String(item.id) === String(product.id))) {
    throw new Error(`Product id "${product.id}" already exists.`);
  }
  assertValidProduct(product);

  const densityChanged = Boolean(existing)
    && Number(existing.density || 0) !== Number(product.density || 0);
  const affectedRecipes = densityChanged
    ? recipes.filter((recipe) => usesProduct(recipe, product.id))
    : [];
  if (affectedRecipes.length && !confirmDensityChange) {
    return assertProductSaveResult({
      status: 'confirmation-required',
      products,
      recipes,
      affectedRecipes: affectedRecipes.map(({ id: recipeId, name }) => ({ id: recipeId, name }))
    });
  }

  const nextProducts = [...products];
  if (existing) nextProducts[existingIndex] = product;
  else nextProducts.unshift(product);

  const affectedIds = new Set(affectedRecipes.map((recipe) => String(recipe.id)));
  const nextRecipes = affectedIds.size
    ? recipes.map((recipe) => {
      if (!affectedIds.has(String(recipe.id))) return recipe;
      const nutrition = calculateRecipeNutrition(recipe, nextProducts).per100;
      return { ...recipe, kcal: nutrition.kcal, p: nutrition.p, f: nutrition.f, c: nutrition.c };
    })
    : recipes;

  return assertProductSaveResult({
    status: 'saved',
    product,
    products: nextProducts,
    recipes: nextRecipes,
    recalculatedRecipeCount: affectedIds.size
  });
}
