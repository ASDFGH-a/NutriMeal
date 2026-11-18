import { getEffectiveRecipeAllergens, getRecipeCategories } from '../recipe/recipe.model.js';
import { calculateRecipeNutrition } from '../shared/nutrient-calculations.js';
import { normalizeRecipeFilterValue, recipeArray } from '../shared/filter-utils.js';

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
