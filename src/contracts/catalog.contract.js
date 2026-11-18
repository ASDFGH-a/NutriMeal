/**
 * @typedef {Object} CatalogCollections
 * @property {Array<Object>} products
 * @property {Array<Object>} recipes
 */

/** @param {CatalogCollections} collections */
export function assertCatalogCollections(collections) {
  if (!collections || typeof collections !== 'object' || Array.isArray(collections)) {
    throw new TypeError('Catalog collections are required.');
  }
  if (!Array.isArray(collections.products) || !Array.isArray(collections.recipes)) {
    throw new TypeError('Products and recipes must be arrays.');
  }
  return collections;
}

/** @param {Array<Object>} collections */
export function assertCollectionArray(collections) {
  if (!Array.isArray(collections)) throw new TypeError('Collections must be an array.');
  return collections;
}

export function assertProductSaveResult(result) {
  if (!result || typeof result !== 'object' || Array.isArray(result)) {
    throw new TypeError('Product save result must be an object.');
  }
  if (!['confirmation-required', 'saved'].includes(result.status)) {
    throw new TypeError('Product save result has an invalid status.');
  }
  assertCatalogCollections(result);
  if (result.status === 'confirmation-required' && !Array.isArray(result.affectedRecipes)) {
    throw new TypeError('Product confirmation result must include affected recipes.');
  }
  if (result.status === 'saved'
    && (!result.product || !Number.isInteger(result.recalculatedRecipeCount))) {
    throw new TypeError('Product save result is incomplete.');
  }
  return result;
}

export function assertRecipeSaveResult(result) {
  if (!result || typeof result !== 'object' || Array.isArray(result)
    || !result.recipe || !Array.isArray(result.recipes)) {
    throw new TypeError('Recipe save result must include a recipe and recipes array.');
  }
  return result;
}

export function assertProductDeletionResult(result) {
  if (!result || typeof result !== 'object' || Array.isArray(result)
    || !result.removed || !Number.isInteger(result.index) || result.index < 0) {
    throw new TypeError('Product deletion result is incomplete.');
  }
  assertCatalogCollections(result);
  return result;
}

export function assertCollectionDeletionResult(result) {
  if (!result || typeof result !== 'object' || Array.isArray(result)
    || !Array.isArray(result.collections) || !Number.isInteger(result.index)) {
    throw new TypeError('Collection deletion result is incomplete.');
  }
  return result;
}
