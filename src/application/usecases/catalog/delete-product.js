import { uniqueAllergens } from '../../../domain/recipe/recipe.model.js';
import {
  assertCatalogCollections,
  assertProductDeletionResult
} from '../../../contracts/catalog.contract.js';

export function deleteProduct({ products, recipes, productId }) {
  assertCatalogCollections({ products, recipes });

  const index = products.findIndex((product) => String(product.id) === String(productId));
  if (index < 0) throw new Error(`Product "${productId}" was not found.`);

  const removed = products[index];
  const nextRecipes = recipes.map((recipe) => {
    if (!Array.isArray(recipe.ingredientItems)) return recipe;
    let changed = false;
    const ingredientItems = recipe.ingredientItems.map((ingredient) => {
      if (String(ingredient.productId) !== String(removed.id)) return ingredient;
      changed = true;
      return {
        ...ingredient,
        productName: ingredient.productName || removed.name,
        productAllergens: uniqueAllergens([
          ...(Array.isArray(ingredient.productAllergens) ? ingredient.productAllergens : []),
          ...(Array.isArray(removed.allergens) ? removed.allergens : [])
        ])
      };
    });
    return changed ? { ...recipe, ingredientItems } : recipe;
  });

  return assertProductDeletionResult({
    products: products.filter((_, productIndex) => productIndex !== index),
    recipes: nextRecipes,
    removed,
    index
  });
}

export function restoreProduct({ products, recipes, product, index }) {
  assertCatalogCollections({ products, recipes });
  if (!product || typeof product !== 'object' || product.id === undefined || product.id === null) {
    throw new TypeError('A product to restore is required.');
  }
  if (products.some((item) => String(item.id) === String(product.id))) {
    throw new Error(`Product "${product.id}" already exists.`);
  }
  if (!Number.isInteger(index) || index < 0) {
    throw new RangeError('Product restore index must be a non-negative integer.');
  }

  const nextProducts = [...products];
  nextProducts.splice(Math.min(index, nextProducts.length), 0, product);
  return { products: nextProducts, recipes: [...recipes] };
}
