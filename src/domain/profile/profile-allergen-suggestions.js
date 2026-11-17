function normalizeSuggestion(value) {
  return String(value ?? '').trim();
}

export function profileAllergenSuggestions({
  productAllergenDefaults = [],
  recipeAllergens = [],
  selectedAllergies = []
} = {}) {
  const seen = new Set();
  const result = [];

  for (const rawValue of [
    ...(Array.isArray(productAllergenDefaults) ? productAllergenDefaults : []),
    ...(Array.isArray(recipeAllergens) ? recipeAllergens : []),
    ...(Array.isArray(selectedAllergies) ? selectedAllergies : [])
  ]) {
    const value = normalizeSuggestion(rawValue);
    const key = value.toLocaleLowerCase('ru-RU');
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(value);
  }

  return result;
}
