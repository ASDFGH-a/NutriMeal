import { getEffectiveRecipeAllergens, getRecipeCategories } from '../recipe/recipe.model.js';
import { calculateRecipeNutrition } from '../shared/nutrient-calculations.js';
import {
  normalizeRecipeFilterValue,
  recipeArray,
  uniqueRecipeValues
} from '../shared/filter-utils.js';

export function recipeFilterDefaults() {
  return {
    timeMin: '',
    timeMax: '',
    mealTypes: [],
    cuisines: [],
    dishTypes: [],
    allergenInclude: [],
    allergenExclude: [],
    categories: [],
    kcalMin: '',
    kcalMax: '',
    pMin: '',
    pMax: '',
    cMin: '',
    cMax: '',
    productsInclude: [],
    productsExclude: [],
    customTags: [],
    customAttributes: {}
  };
}

export function productFilterDefaults() {
  return {
    basisUnit: '',
    kcalMin: '',
    kcalMax: '',
    pMin: '',
    pMax: '',
    fMin: '',
    fMax: '',
    cMin: '',
    cMax: '',
    brand: [],
    categories: [],
    components: [],
    allergenInclude: [],
    allergenExclude: [],
    state: [],
    customTags: [],
    customAttributes: {}
  };
}

export function createRecipeStandardFilterCategories() {
  return [
    { id: 'time', label: 'Время приготовления', kind: 'timeRange' },
    {
      id: 'mealTypes',
      label: 'Приём пищи',
      kind: 'multi',
      filterKey: 'mealTypes',
      recipeField: 'mealTypes',
      values: ['Завтрак', 'Второй завтрак', 'Обед', 'Полдник', 'Ужин', 'Поздний ужин', 'Перекус']
    },
    {
      id: 'cuisines',
      label: 'Тип кухни',
      kind: 'multi',
      filterKey: 'cuisines',
      recipeField: 'cuisine',
      values: ['Домашняя', 'Русская']
    },
    {
      id: 'dishTypes',
      label: 'Тип блюда',
      kind: 'multi',
      filterKey: 'dishTypes',
      recipeField: 'dishTypes',
      values: ['Первое', 'Второе', 'Гарнир', 'Салат']
    },
    {
      id: 'allergens',
      label: 'Аллергены',
      kind: 'includeExclude',
      recipeField: 'allergens',
      values: ['Молоко', 'Яйца', 'Глютен', 'Орехи', 'Рыба', 'Соя']
    },
    {
      id: 'categories',
      label: 'Категории продуктов',
      kind: 'multi',
      filterKey: 'categories',
      recipeField: 'categories',
      values: ['Молочные продукты', 'Овощи', 'Фрукты', 'Зерновые', 'Бобовые', 'Рыба', 'Орехи']
    },
    { id: 'composition', label: 'Состав на 100 г', kind: 'composition' },
    { id: 'products', label: 'Продукты', kind: 'products' }
  ];
}

export function createProductStandardFilterCategories() {
  return [
    { id: 'composition', label: 'КБЖУ', kind: 'composition' },
    { id: 'brand', label: 'Производитель', kind: 'multi', productField: 'brand', values: [] },
    {
      id: 'categories',
      label: 'Категория продукта',
      kind: 'multi',
      productField: 'categories',
      values: ['Молочные продукты', 'Овощи', 'Фрукты', 'Зерновые', 'Бобовые', 'Рыба', 'Орехи', 'Мясо и птица', 'Яйца', 'Масла и жиры', 'Специи и приправы', 'Сладости и прочие продукты']
    },
    {
      id: 'components',
      label: 'Полезные компоненты',
      kind: 'multi',
      productField: 'components',
      values: ['Витамин A', 'Витамин C', 'Витамин D', 'Витамин E', 'Витамин K', 'Витамин B1', 'Витамин B2', 'Витамин B3 (ниацин)', 'Витамин B5 (пантотеновая кислота)', 'Витамин B6', 'Биотин (B7)', 'Витамин B9', 'Витамин B12', 'Холин', 'Кальций', 'Железо', 'Магний', 'Калий', 'Цинк', 'Фосфор', 'Йод', 'Натрий', 'Селен', 'Медь', 'Марганец', 'Хром', 'Молибден', 'Фтор', 'Хлорид', 'Клетчатка', 'Омега-3']
    },
    {
      id: 'allergens',
      label: 'Аллергены',
      kind: 'includeExclude',
      productField: 'allergens',
      values: ['Молоко', 'Яйца', 'Глютен', 'Орехи', 'Арахис', 'Рыба', 'Соя', 'Кунжут', 'Горчица', 'Сельдерей', 'Ракообразные', 'Сульфиты']
    },
    {
      id: 'state',
      label: 'Состояние продукта',
      kind: 'multi',
      productField: 'state',
      values: ['Сырой', 'Сухой', 'Приготовленный', 'Готовый', 'Пастеризованный', 'Замороженный', 'Консервированный', 'Сушёный']
    }
  ];
}

export function createCustomFilterCategory({ label, isProducts, existingCategories } = {}) {
  const name = String(label ?? '').trim();
  if (!name) return null;
  if (!Array.isArray(existingCategories)) {
    throw new TypeError('Existing filter categories must be an array.');
  }
  const base = `custom-${name.toLocaleLowerCase('ru-RU').replace(/[^a-zа-яё0-9]+/gi, '-').replace(/^-|-$/g, '').slice(0, 28)}`;
  const root = base === 'custom-' ? 'custom-filter' : base;
  let id = root;
  let suffix = 2;
  while (existingCategories.some((category) => category.id === id)) id = `${root}-${suffix++}`;
  return {
    id,
    label: name,
    kind: 'customMulti',
    ...(isProducts ? { productField: 'customAttributes' } : { recipeField: 'customAttributes' }),
    values: []
  };
}

export function renameCatalogFilterCategory(category, label) {
  if (!category || typeof category !== 'object' || Array.isArray(category)) {
    throw new TypeError('A filter category is required.');
  }
  const name = String(label ?? '').trim();
  if (!name) return null;
  return { ...category, label: name };
}

export function removeCustomFilterCategory({
  categoryId,
  categories,
  items,
  filters,
  cardSettings,
  isProducts = false
} = {}) {
  if (typeof categoryId !== 'string' || !categoryId) {
    throw new TypeError('A custom filter category id is required.');
  }
  if (!Array.isArray(categories) || !Array.isArray(items)) {
    throw new TypeError('Filter categories and catalog items must be arrays.');
  }
  if (!filters || typeof filters !== 'object' || Array.isArray(filters)) {
    throw new TypeError('Catalog filters are required.');
  }
  if (!cardSettings || typeof cardSettings !== 'object' || Array.isArray(cardSettings)) {
    throw new TypeError('Catalog card settings are required.');
  }
  if (!categories.some((category) => category.id === categoryId)) return null;

  const settingsKey = isProducts ? 'products' : 'recipes';
  const updatedSettings = {
    ...cardSettings,
    [settingsKey]: { ...(cardSettings[settingsKey] || {}) }
  };
  delete updatedSettings[settingsKey][categoryId];

  const customAttributes = { ...(filters.customAttributes || {}) };
  delete customAttributes[categoryId];
  const updatedFilters = { ...filters, customAttributes };
  const updatedItems = items.map((item) => {
    const attributes = item?.customAttributes;
    if (
      !attributes
      || typeof attributes !== 'object'
      || Array.isArray(attributes)
      || !Object.prototype.hasOwnProperty.call(attributes, categoryId)
    ) return item;
    const updatedAttributes = { ...attributes };
    delete updatedAttributes[categoryId];
    return { ...item, customAttributes: updatedAttributes };
  });

  return {
    categories: categories.filter((category) => category.id !== categoryId),
    items: updatedItems,
    filters: updatedFilters,
    cardSettings: updatedSettings
  };
}

export function getRecipeFilterCategoryValues(category, recipes, products) {
  if (!category) return [];
  if (!Array.isArray(recipes) || !Array.isArray(products)) {
    throw new TypeError('Recipe and product catalogs must be arrays.');
  }
  let observed = [];
  if (category.id === 'customTags') observed = recipes.flatMap((recipe) => recipeArray(recipe.tags));
  else if (category.id === 'mealTypes') observed = recipes.flatMap((recipe) => recipeArray(recipe.mealTypes || recipe.mealType));
  else if (category.id === 'cuisines') observed = recipes.flatMap((recipe) => recipeArray(recipe.cuisine));
  else if (category.id === 'dishTypes') observed = recipes.flatMap((recipe) => recipeArray(recipe.dishTypes || recipe.dishType));
  else if (category.id === 'categories') observed = recipes.flatMap((recipe) => getRecipeCategories(recipe));
  else if (category.id === 'allergens') {
    observed = recipes.flatMap((recipe) => getEffectiveRecipeAllergens(recipe, products));
  } else if (category.recipeField === 'customAttributes') {
    observed = recipes.flatMap((recipe) => recipeArray(recipe.customAttributes?.[category.id]));
  } else if (category.recipeField) {
    observed = recipes.flatMap((recipe) => recipeArray(recipe[category.recipeField]));
  }
  return uniqueRecipeValues([...(category.values || []), ...observed]);
}

export function getProductFilterCategoryValues(category, products) {
  if (!category) return [];
  if (!Array.isArray(products)) throw new TypeError('Product catalog must be an array.');
  let observed = [];
  if (category.id === 'customTags') observed = products.flatMap((product) => recipeArray(product.tags));
  else if (category.productField === 'brand') observed = products.map((product) => product.brand || '');
  else if (['categories', 'allergens', 'state'].includes(category.productField)) {
    observed = products.flatMap((product) => recipeArray(product[category.productField]));
  } else if (category.productField === 'components') {
    observed = products.flatMap((product) => recipeArray(product.components)
      .map((item) => typeof item === 'string' ? item : item?.name));
  } else if (category.productField === 'customAttributes') {
    observed = products.flatMap((product) => recipeArray(product.customAttributes?.[category.id]));
  }
  return uniqueRecipeValues([...(category.values || []), ...observed]);
}

function filterCount(filters) {
  return Object.entries(filters).reduce((total, [key, value]) => {
    if (Array.isArray(value)) return total + value.length;
    if (key === 'customAttributes' && value && typeof value === 'object') {
      return total + Object.values(value).reduce((sum, items) => sum + (Array.isArray(items) ? items.length : 0), 0);
    }
    return total + (value !== '' && value !== null ? 1 : 0);
  }, 0);
}

export function recipeFilterCount(filters = recipeFilterDefaults()) {
  return filterCount(filters);
}

export function productFilterCount(filters = productFilterDefaults()) {
  return filterCount(filters);
}

function within(value, minimum, maximum) {
  if (minimum !== '' && Number.isFinite(Number(minimum)) && value < Number(minimum)) return false;
  if (maximum !== '' && Number.isFinite(Number(maximum)) && value > Number(maximum)) return false;
  return true;
}

function selected(filters, key) {
  return Array.isArray(filters[key]) ? filters[key] : [];
}

function replaceFilterValue(value, oldValue, newValue, remove) {
  return normalizeRecipeFilterValue(value) === normalizeRecipeFilterValue(oldValue)
    ? (remove ? '' : newValue)
    : value;
}

function replaceUniqueFilterValues(values, oldValue, newValue, remove) {
  return uniqueRecipeValues(values
    .map((value) => replaceFilterValue(value, oldValue, newValue, remove))
    .filter(Boolean));
}

export function updateRecipeFilterValue(recipe, category, oldValue, newValue, remove = false) {
  if (!recipe || !category) throw new TypeError('Recipe and filter category are required.');
  if (category.recipeField === 'cuisine') {
    return {
      ...recipe,
      cuisine: replaceFilterValue(recipe.cuisine, oldValue, newValue, remove)
    };
  }
  if (category.recipeField === 'customAttributes') {
    return {
      ...recipe,
      customAttributes: {
        ...(recipe.customAttributes || {}),
        [category.id]: replaceUniqueFilterValues(
          recipeArray(recipe.customAttributes?.[category.id]),
          oldValue,
          newValue,
          remove
        )
      }
    };
  }
  if (category.recipeField) {
    return {
      ...recipe,
      [category.recipeField]: replaceUniqueFilterValues(
        recipeArray(recipe[category.recipeField]),
        oldValue,
        newValue,
        remove
      )
    };
  }
  return recipe;
}

export function updateProductFilterValue(product, category, oldValue, newValue, remove = false) {
  if (!product || !category) throw new TypeError('Product and filter category are required.');
  if (category.productField === 'brand') {
    return {
      ...product,
      brand: replaceFilterValue(product.brand, oldValue, newValue, remove)
    };
  }
  if (category.productField === 'components') {
    return {
      ...product,
      components: recipeArray(product.components).map((item) => {
        if (typeof item === 'string') {
          return replaceFilterValue(item, oldValue, newValue, remove);
        }
        return normalizeRecipeFilterValue(item?.name) === normalizeRecipeFilterValue(oldValue)
          ? { ...item, name: remove ? '' : newValue }
          : item;
      }).filter((item) => typeof item === 'string' ? Boolean(item) : Boolean(item?.name))
    };
  }
  if (category.productField === 'customAttributes') {
    return {
      ...product,
      customAttributes: {
        ...(product.customAttributes || {}),
        [category.id]: replaceUniqueFilterValues(
          recipeArray(product.customAttributes?.[category.id]),
          oldValue,
          newValue,
          remove
        )
      }
    };
  }
  if (category.productField) {
    return {
      ...product,
      [category.productField]: replaceUniqueFilterValues(
        recipeArray(product[category.productField]),
        oldValue,
        newValue,
        remove
      )
    };
  }
  return product;
}

export function updateCatalogFilterSelections(filters, category, oldValue, newValue, remove = false, isProducts = false) {
  if (!filters || !category) throw new TypeError('Filters and filter category are required.');
  const updated = { ...filters };
  const replace = (values) => replaceUniqueFilterValues(values, oldValue, newValue, remove);
  if (category.filterKey && Array.isArray(filters[category.filterKey])) {
    updated[category.filterKey] = replace(filters[category.filterKey]);
  }
  if (category.id === 'allergens') {
    for (const key of ['allergenInclude', 'allergenExclude']) {
      if (Array.isArray(filters[key])) updated[key] = replace(filters[key]);
    }
  }
  if (category.id === 'customTags' && Array.isArray(filters.customTags)) {
    updated.customTags = replace(filters.customTags);
  }
  if (category.kind === 'customMulti' && Array.isArray(filters.customAttributes?.[category.id])) {
    updated.customAttributes = {
      ...(filters.customAttributes || {}),
      [category.id]: replace(filters.customAttributes[category.id])
    };
  }
  if (isProducts && category.id === 'brand' && Array.isArray(filters.brand)) {
    updated.brand = replace(filters.brand);
  }
  return updated;
}

export function addCatalogFilterValue({ category, availableValues, value } = {}) {
  if (!category || typeof category !== 'object' || Array.isArray(category)) {
    throw new TypeError('A filter category is required.');
  }
  if (!Array.isArray(availableValues)) {
    throw new TypeError('Available filter values must be an array.');
  }
  const cleanValue = String(value ?? '').trim();
  if (!cleanValue || availableValues.some((item) => (
    normalizeRecipeFilterValue(item) === normalizeRecipeFilterValue(cleanValue)
  ))) return null;

  return {
    ...category,
    values: uniqueRecipeValues([...recipeArray(category.values), cleanValue])
  };
}

export function toggleCatalogFilterSelection(filters, key, value, categoryId = '') {
  if (!filters || typeof filters !== 'object' || Array.isArray(filters)) {
    throw new TypeError('Catalog filters are required.');
  }
  if (typeof key !== 'string' || !key || typeof value !== 'string') {
    throw new TypeError('A filter key and value are required.');
  }
  if (typeof categoryId !== 'string') {
    throw new TypeError('A custom filter category id must be a string.');
  }

  const selected = categoryId
    ? (filters.customAttributes?.[categoryId] || [])
    : filters[key];
  if (!Array.isArray(selected)) return filters;
  const index = selected.findIndex((item) => (
    normalizeRecipeFilterValue(item) === normalizeRecipeFilterValue(value)
  ));
  const updatedSelection = selected.slice();
  if (index >= 0) updatedSelection.splice(index, 1);
  else updatedSelection.push(value);

  if (!categoryId) return { ...filters, [key]: updatedSelection };
  return {
    ...filters,
    customAttributes: {
      ...(filters.customAttributes || {}),
      [categoryId]: updatedSelection
    }
  };
}

export function addCatalogFilterSelection(filters, key, value) {
  if (!filters || typeof filters !== 'object' || Array.isArray(filters)) {
    throw new TypeError('Catalog filters are required.');
  }
  if (typeof key !== 'string' || !key || typeof value !== 'string' || !value) {
    throw new TypeError('A filter key and value are required.');
  }
  if (!Array.isArray(filters[key])) {
    throw new TypeError('Selected filter values must be an array.');
  }
  return {
    ...filters,
    [key]: uniqueRecipeValues([...filters[key], value])
  };
}

export function updateCatalogFilterValue({
  category,
  availableValues,
  items,
  filters,
  oldValue,
  newValue,
  remove = false,
  isProducts = false
} = {}) {
  if (!category || typeof category !== 'object' || Array.isArray(category)) {
    throw new TypeError('A filter category is required.');
  }
  if (!Array.isArray(availableValues) || !Array.isArray(items)) {
    throw new TypeError('Available filter values and catalog items must be arrays.');
  }
  if (!filters || typeof filters !== 'object' || Array.isArray(filters)) {
    throw new TypeError('Catalog filters are required.');
  }
  if (typeof oldValue !== 'string' || !oldValue) {
    throw new TypeError('An existing filter value is required.');
  }
  const cleanValue = String(newValue ?? '').trim();
  if (!remove && !cleanValue) throw new TypeError('A replacement filter value is required.');

  if (!remove && availableValues.some((value) => (
    normalizeRecipeFilterValue(value) === normalizeRecipeFilterValue(cleanValue)
    && normalizeRecipeFilterValue(value) !== normalizeRecipeFilterValue(oldValue)
  ))) return null;

  const updatedCategory = {
    ...category,
    values: replaceUniqueFilterValues(
      recipeArray(category.values),
      oldValue,
      cleanValue,
      remove
    )
  };
  const updateItem = isProducts ? updateProductFilterValue : updateRecipeFilterValue;

  return {
    category: updatedCategory,
    items: items.map((item) => updateItem(item, category, oldValue, cleanValue, remove)),
    filters: updateCatalogFilterSelections(filters, category, oldValue, cleanValue, remove, isProducts)
  };
}

export function productMatchesFilters(product, query = '', options) {
  const { filters, standardCategories = [], customCategories = [] } = options;
  const q = String(query || '').trim().toLocaleLowerCase('ru-RU');
  const searchable = [
    product.name,
    product.brand,
    ...recipeArray(product.categories),
    ...recipeArray(product.allergens),
    ...recipeArray(product.state),
    ...recipeArray(product.tags),
    ...recipeArray(product.components).map((item) => typeof item === 'string' ? item : item?.name)
  ].join(' ').toLocaleLowerCase('ru-RU');
  if (q && !searchable.includes(q)) return false;

  const hasCategory = (id) => standardCategories.some((category) => category.id === id);
  const basis = product.basisUnit || 'г';
  if (
    hasCategory('composition')
    && (
      (filters.basisUnit && String(basis) !== filters.basisUnit)
      || !within(Number(product.kcal) || 0, filters.kcalMin, filters.kcalMax)
      || !within(Number(product.p) || 0, filters.pMin, filters.pMax)
      || !within(Number(product.f) || 0, filters.fMin, filters.fMax)
      || !within(Number(product.c) || 0, filters.cMin, filters.cMax)
    )
  ) return false;

  if (hasCategory('brand') && selected(filters, 'brand').length
    && !selected(filters, 'brand').some((value) => normalizeRecipeFilterValue(value) === normalizeRecipeFilterValue(product.brand))) {
    return false;
  }
  if (hasCategory('categories') && selected(filters, 'categories').length
    && !selected(filters, 'categories').some((value) => recipeArray(product.categories)
      .some((item) => normalizeRecipeFilterValue(item) === normalizeRecipeFilterValue(value)))) {
    return false;
  }
  if (hasCategory('components') && selected(filters, 'components').length
    && !selected(filters, 'components').some((value) => recipeArray(product.components)
      .some((item) => normalizeRecipeFilterValue(typeof item === 'string' ? item : item?.name) === normalizeRecipeFilterValue(value)))) {
    return false;
  }

  const allergens = recipeArray(product.allergens).map(normalizeRecipeFilterValue);
  if (hasCategory('allergens') && selected(filters, 'allergenInclude').length
    && !selected(filters, 'allergenInclude').some((value) => allergens.includes(normalizeRecipeFilterValue(value)))) {
    return false;
  }
  if (hasCategory('allergens')
    && selected(filters, 'allergenExclude').some((value) => allergens.includes(normalizeRecipeFilterValue(value)))) {
    return false;
  }
  if (hasCategory('state') && selected(filters, 'state').length
    && !selected(filters, 'state').some((value) => recipeArray(product.state)
      .some((item) => normalizeRecipeFilterValue(item) === normalizeRecipeFilterValue(value)))) {
    return false;
  }

  const tags = recipeArray(product.tags).map(normalizeRecipeFilterValue);
  if (selected(filters, 'customTags').length
    && !selected(filters, 'customTags').some((value) => tags.includes(normalizeRecipeFilterValue(value)))) {
    return false;
  }
  for (const category of customCategories) {
    const chosen = recipeArray(filters.customAttributes?.[category.id]);
    if (chosen.length && !chosen.some((value) => recipeArray(product.customAttributes?.[category.id])
      .some((item) => normalizeRecipeFilterValue(item) === normalizeRecipeFilterValue(value)))) {
      return false;
    }
  }
  return true;
}

export function recipeMatchesFilters(recipe, query = '', options) {
  const { filters, standardCategories = [], customCategories = [], products } = options;
  const q = String(query || '').trim().toLocaleLowerCase('ru-RU');
  const tags = recipeArray(recipe.tags).map(normalizeRecipeFilterValue);
  const mealTypes = recipeArray(recipe.mealTypes || recipe.mealType).map(normalizeRecipeFilterValue);
  const cuisine = normalizeRecipeFilterValue(recipe.cuisine);
  const dishTypes = recipeArray(recipe.dishTypes || recipe.dishType).map(normalizeRecipeFilterValue);
  const allergens = getEffectiveRecipeAllergens(recipe, products).map(normalizeRecipeFilterValue);
  const categories = getRecipeCategories(recipe).map(normalizeRecipeFilterValue);
  const productIds = recipeArray(recipe.ingredientItems).map((row) => String(row.productId));
  const productNames = products
    .filter((product) => productIds.includes(String(product.id)))
    .map((product) => product.name.toLocaleLowerCase('ru-RU'));
  const ingredientText = String(recipe.ingredients || '').toLocaleLowerCase('ru-RU');
  const hasProduct = (id) => {
    const product = products.find((item) => String(item.id) === String(id));
    if (!product) return productIds.includes(String(id));
    const name = product.name.toLocaleLowerCase('ru-RU');
    return productIds.includes(String(id)) || productNames.includes(name) || ingredientText.includes(name);
  };
  const nutrition = calculateRecipeNutrition(recipe, products).per100;
  const enabled = (id) => standardCategories.some((category) => category.id === id)
    || customCategories.some((category) => category.id === id)
    || id === 'customTags';

  if (q && !`${recipe.name || ''} ${tags.join(' ')} ${recipe.ingredients || ''}`.toLocaleLowerCase('ru-RU').includes(q)) {
    return false;
  }
  if (enabled('time') && (filters.timeMin !== '' || filters.timeMax !== '')
    && !within(Number(recipe.time) || 0, filters.timeMin, filters.timeMax)) return false;
  if (enabled('mealTypes') && selected(filters, 'mealTypes').length
    && !selected(filters, 'mealTypes').some((value) => mealTypes.includes(normalizeRecipeFilterValue(value)))) return false;
  if (enabled('cuisines') && selected(filters, 'cuisines').length
    && !selected(filters, 'cuisines').some((value) => cuisine === normalizeRecipeFilterValue(value))) return false;
  if (enabled('dishTypes') && selected(filters, 'dishTypes').length
    && !selected(filters, 'dishTypes').some((value) => dishTypes.includes(normalizeRecipeFilterValue(value)))) return false;
  if (enabled('allergens') && selected(filters, 'allergenInclude').length
    && !selected(filters, 'allergenInclude').some((value) => allergens.includes(normalizeRecipeFilterValue(value)))) return false;
  if (enabled('allergens')
    && selected(filters, 'allergenExclude').some((value) => allergens.includes(normalizeRecipeFilterValue(value)))) return false;
  if (enabled('categories') && selected(filters, 'categories').length
    && !selected(filters, 'categories').some((value) => categories.includes(normalizeRecipeFilterValue(value)))) return false;
  if (enabled('composition')
    && (!within(nutrition.kcal, filters.kcalMin, filters.kcalMax)
      || !within(nutrition.p, filters.pMin, filters.pMax)
      || !within(nutrition.c, filters.cMin, filters.cMax))) return false;
  if (enabled('products') && selected(filters, 'productsInclude').some((id) => !hasProduct(id))) return false;
  if (enabled('products') && selected(filters, 'productsExclude').some((id) => hasProduct(id))) return false;
  if (selected(filters, 'customTags').length
    && !selected(filters, 'customTags').some((tag) => tags.includes(normalizeRecipeFilterValue(tag)))) return false;

  for (const category of customCategories) {
    const chosen = recipeArray(filters.customAttributes?.[category.id]);
    if (chosen.length) {
      const values = recipeArray(recipe.customAttributes?.[category.id]).map(normalizeRecipeFilterValue);
      if (!chosen.some((value) => values.includes(normalizeRecipeFilterValue(value)))) return false;
    }
  }
  return true;
}
