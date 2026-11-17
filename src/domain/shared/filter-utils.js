/**
 * Утилита для нормализации строк в фильтрах каталога.
 * Извлечена из PWA v60 F138 (строка ~1257).
 */
export function normalizeRecipeFilterValue(value) {
  return String(value ?? '').trim().toLocaleLowerCase('ru-RU');
}

/**
 * Извлекает уникальные строковые значения из массива.
 * Сохраняет первый encountered вариант, игнорирует дубликаты.
 * Извлечено из PWA v60 F141/F142.
 */
export function uniqueRecipeValues(values) {
  const seen = new Set();
  return values.map(x => String(x ?? '').trim()).filter(x => {
    const key = normalizeRecipeFilterValue(x);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export const uniqueProductValues = uniqueRecipeValues;

/**
 * Обёртка: превращает одиночное значение в массив или возвращает существующий массив.
 * Извлечено из PWA v60 F140.
 */
export function recipeArray(value) {
  return Array.isArray(value) ? value : (value ? [value] : []);
}

/**
 * Формирует пустой объект фильтров рецептов с дефолтными значениями.
 * Соответствует F139 (recipeFilterDefaults).
 */
export function recipeFilterDefaults() {
  return {
    timeMin: '', timeMax: '', mealTypes: [], cuisines: [], dishTypes: [],
    allergenInclude: [], allergenExclude: [], categories: [],
    kcalMin: '', kcalMax: '', pMin: '', pMax: '', cMin: '', cMax: '',
    productsInclude: [], productsExclude: [], customTags: [],
    customAttributes: {}
  };
}

/**
 * Пустые дефолтные фильтры продуктов — аналогично рецептам.
 */
export function productFilterDefaults() {
  return {
    basisUnit: '', kcalMin: '', kcalMax: '', pMin: '', pMax: '', fMin: '', fMax: '', cMin: '', cMax: '',
    brand: [], categories: [], components: [], state: [],
    allergenInclude: [], allergenExclude: [], customTags: [], customAttributes: {}
  };
}

/**
 * Подсчёт количества применённых фильтров.
 * Аналог PWA v60 F147 (recipeFilterCount).
 */
export function countAppliedFilters(filters) {
  return Object.entries(filters).reduce((total, [key, value]) => {
    if (Array.isArray(value)) return total + value.length;
    if (key === 'customAttributes' && value && typeof value === 'object') {
      return total + Object.values(value).reduce(
        (sum, items) => sum + (Array.isArray(items) ? items.length : 0), 0
      );
    }
    return total + (value !== '' && value !== null ? 1 : 0);
  }, 0);
}
