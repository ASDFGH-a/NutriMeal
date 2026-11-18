function copyArray(value, fallback = []) {
  const values = Array.isArray(value) ? value : Array.isArray(fallback) ? fallback : [];
  return [...values].map((item) => (
    item && typeof item === 'object' ? { ...item } : item
  ));
}

export function normalizeProduct(product, seedMetadata = {}) {
  if (!product || typeof product !== 'object' || Array.isArray(product)) {
    throw new TypeError('A product object is required.');
  }

  const attributes = product.customAttributes;
  return {
    ...product,
    favorite: typeof product.favorite === 'boolean' ? product.favorite : false,
    categories: copyArray(product.categories, seedMetadata.categories),
    allergens: copyArray(product.allergens, seedMetadata.allergens),
    state: copyArray(product.state, seedMetadata.state),
    components: copyArray(product.components),
    tags: copyArray(product.tags),
    customAttributes: attributes && typeof attributes === 'object' && !Array.isArray(attributes)
      ? { ...attributes }
      : {},
    basisUnit: product.basisUnit || 'г'
  };
}
