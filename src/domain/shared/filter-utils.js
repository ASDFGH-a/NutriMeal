export function recipeArray(value) {
  return Array.isArray(value) ? value : value ? [value] : [];
}

export function normalizeRecipeFilterValue(value) {
  return String(value ?? '').trim().toLocaleLowerCase('ru-RU');
}

export function uniqueRecipeValues(values) {
  const seen = new Set();
  return values
    .map((value) => String(value ?? '').trim())
    .filter((value) => {
      const key = normalizeRecipeFilterValue(value);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export const uniqueProductValues = uniqueRecipeValues;
