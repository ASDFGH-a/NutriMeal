/**
 * Applies the same fallback fields used by PWA v60 R01.
 * Mutates and returns the supplied product to preserve the legacy catalog model.
 */
export function normalizeProductSeed(product, seedMetadata = {}) {
  const seed = seedMetadata[product.id] || {};

  if (!Array.isArray(product.categories)) product.categories = [...(seed.categories || [])];
  if (!Array.isArray(product.allergens)) product.allergens = [...(seed.allergens || [])];
  if (!Array.isArray(product.state)) product.state = [...(seed.state || [])];
  if (!Array.isArray(product.components)) product.components = [];
  if (!Array.isArray(product.tags)) product.tags = [];
  if (!product.customAttributes || typeof product.customAttributes !== 'object') {
    product.customAttributes = {};
  }
  if (!product.basisUnit) product.basisUnit = 'г';
  if (typeof product.favorite !== 'boolean') product.favorite = false;

  return product;
}

export function normalizeProductCatalog(products, seedMetadata = {}) {
  return products.map(product => normalizeProductSeed(product, seedMetadata));
}
