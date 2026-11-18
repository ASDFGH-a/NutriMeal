import { normalizeRecipeFilterValue, recipeArray } from './filter-utils.js';

const RECIPE_NUTRIENT_KEYS = ['kcal', 'p', 'f', 'c', 'fiber', 'sugar', 'sodium', 'cholesterol', 'potassium'];

export function productBasisUnit(product) {
  return product?.basisUnit === 'мл' ? 'мл' : 'г';
}

export function ingredientAmountInProductBasis(row, product) {
  const amount = Math.max(0, Number(row?.amount ?? row?.grams) || 0);
  const enteredUnit = row?.unit || (row?.grams !== undefined ? 'г' : productBasisUnit(product));
  const basis = productBasisUnit(product);
  if (enteredUnit === basis) return { amount, valid: true, basis };

  const density = Number(product?.density);
  if (!Number.isFinite(density) || density <= 0) {
    return { amount: null, valid: false, basis, enteredUnit };
  }

  return {
    amount: enteredUnit === 'мл' && basis === 'г' ? amount * density : amount / density,
    valid: true,
    basis
  };
}

export function calculateRecipeNutrition(recipe, products) {
  if (!Array.isArray(products)) throw new TypeError('Products must be an array.');

  const totals = Object.fromEntries(RECIPE_NUTRIENT_KEYS.map((key) => [key, 0]));
  const missingProducts = [];
  const conversionIssues = [];
  const componentTotals = new Map();
  const ingredientRows = Array.isArray(recipe?.ingredientItems) ? recipe.ingredientItems : [];
  const manualComponents = recipeArray(recipe?.components)
    .filter((item) => item && item.name && Number.isFinite(Number(item.amount)));
  const manualNames = new Set(manualComponents.map((item) => normalizeRecipeFilterValue(item.name)));

  function addComponent(name, amount, unit = 'мг') {
    const cleanName = String(name || '').trim();
    if (!cleanName) return;
    const normalizedName = normalizeRecipeFilterValue(cleanName);
    const normalizedUnit = String(unit || 'мг').trim();
    const key = `${normalizedName}|${normalizedUnit.toLocaleLowerCase('ru-RU')}`;
    const current = componentTotals.get(key) || { name: cleanName, unit: normalizedUnit, amount: 0 };
    current.amount += Number(amount) || 0;
    componentTotals.set(key, current);
  }

  for (const row of ingredientRows) {
    const product = products.find((item) => String(item.id) === String(row.productId));
    if (!product) {
      missingProducts.push(row);
      continue;
    }

    const converted = ingredientAmountInProductBasis(row, product);
    if (!converted.valid) {
      conversionIssues.push({ row, product, enteredUnit: converted.enteredUnit, basis: converted.basis });
      continue;
    }
    if (!(converted.amount > 0)) continue;

    const factor = converted.amount / 100;
    for (const key of RECIPE_NUTRIENT_KEYS) {
      totals[key] += (Number(product[key]) || 0) * factor;
    }

    const productComponents = recipeArray(product.components)
      .filter((item) => item && item.name && Number.isFinite(Number(item.amount)));
    for (const component of productComponents) {
      if (!manualNames.has(normalizeRecipeFilterValue(component.name))) {
        addComponent(component.name, Math.max(0, Number(component.amount) || 0) * factor, component.unit || 'мг');
      }
    }

    const automatic = [['fiber', 'Клетчатка', 'г'], ['sodium', 'Натрий', 'мг'], ['potassium', 'Калий', 'мг']];
    for (const [key, name, unit] of automatic) {
      if (
        !manualNames.has(normalizeRecipeFilterValue(name))
        && !productComponents.some((component) => normalizeRecipeFilterValue(component.name) === normalizeRecipeFilterValue(name))
      ) {
        addComponent(name, Math.max(0, Number(product[key]) || 0) * factor, unit);
      }
    }
  }

  const weight = Math.max(1, Number(recipe?.totalWeight) || 100);
  const portionGrams = Math.max(1, Number(recipe?.portionGrams) || 100);
  const per100 = Object.fromEntries(RECIPE_NUTRIENT_KEYS.map((key) => [key, totals[key] / weight * 100]));
  const portion = Object.fromEntries(RECIPE_NUTRIENT_KEYS.map((key) => [key, per100[key] * portionGrams / 100]));

  for (const component of manualComponents) {
    addComponent(component.name, Math.max(0, Number(component.amount) || 0) * weight / 100, component.unit || 'мг');
  }

  const componentsTotal = [...componentTotals.values()];
  const componentsPer100 = componentsTotal.map((item) => ({ ...item, amount: item.amount * 100 / weight }));
  const componentsPortion = componentsPer100.map((item) => ({ ...item, amount: item.amount * portionGrams / 100 }));

  return {
    total: totals,
    per100,
    portion,
    weight,
    portionGrams,
    missingProducts,
    conversionIssues,
    components: {
      total: componentsTotal,
      per100: componentsPer100,
      portion: componentsPortion
    }
  };
}
