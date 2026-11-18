const PRODUCT_NUTRIENTS = ['kcal', 'p', 'f', 'c'];

export function assertValidProduct(product) {
  if (!product || typeof product !== 'object' || Array.isArray(product)) {
    throw new TypeError('A product object is required.');
  }
  if (!String(product.name ?? '').trim()) throw new TypeError('Product name is required.');

  for (const nutrient of PRODUCT_NUTRIENTS) {
    const value = Number(product[nutrient]);
    if (!Number.isFinite(value) || value < 0) {
      throw new RangeError(`Product ${nutrient} must be a finite non-negative number.`);
    }
  }

  if (!['г', 'мл'].includes(product.basisUnit)) {
    throw new TypeError('Product basis unit must be г or мл.');
  }

  if (product.density !== null && product.density !== undefined && product.density !== '') {
    const density = Number(product.density);
    if (!Number.isFinite(density) || density <= 0 || density > 100) {
      throw new RangeError('Product density must be greater than 0 and no more than 100 g/ml.');
    }
  }

  for (const component of Array.isArray(product.components) ? product.components : []) {
    if (!String(component?.name ?? '').trim()) continue;
    if (component.amount === undefined || component.amount === null || component.amount === '') {
      throw new RangeError(`Component "${component.name}" must have a valid amount and unit.`);
    }
    const amount = Number(component.amount);
    if (!Number.isFinite(amount) || amount < 0 || !component.unit) {
      throw new RangeError(`Component "${component.name}" must have a valid amount and unit.`);
    }
  }
}
