export const RECIPE_SEED_DETAILS = Object.freeze({
  1: {
    totalWeight: 340,
    portionGrams: 220,
    difficulty: 'Легко',
    cuisine: 'Домашняя',
    mealTypes: ['Завтрак'],
    dishType: 'Второе',
    categories: ['Зерновые', 'Молочные продукты'],
    allergens: ['Глютен', 'Молоко'],
    ingredientItems: [{ productId: 'oat', grams: 100 }, { productId: 'milk', grams: 250 }],
    steps: ['Налей молоко в кастрюлю и нагрей на среднем огне.', 'Добавь овсяные хлопья и перемешай.', 'Вари до желаемой густоты, периодически помешивая.']
  },
  2: {
    totalWeight: 253,
    portionGrams: 300,
    difficulty: 'Средне',
    cuisine: 'Домашняя',
    mealTypes: ['Обед'],
    dishType: 'Второе',
    categories: ['Зерновые'],
    allergens: [],
    ingredientItems: [{ productId: 'chicken', grams: 150 }, { productId: 'buckwheat', grams: 200 }],
    steps: ['Подготовь куриную грудку и нарежь её кусочками.', 'Приготовь гречку до мягкости.', 'Обжарь или запеки курицу до готовности и подай с гречкой.']
  },
  3: {
    totalWeight: 240,
    portionGrams: 180,
    difficulty: 'Средне',
    cuisine: 'Русская',
    mealTypes: ['Завтрак'],
    dishType: 'Второе',
    categories: ['Молочные продукты', 'Зерновые'],
    allergens: ['Молоко', 'Яйца', 'Глютен'],
    ingredientItems: [{ productId: 'cottage', grams: 200 }, { productId: 'egg', grams: 50 }, { productId: 'semolina', grams: 25 }, { productId: 'sugar', grams: 15 }],
    steps: ['Разомни творог и смешай с яйцом.', 'Добавь манную крупу и сахар, перемешай.', 'Выложи массу в форму и запекай до готовности.']
  },
  4: {
    totalWeight: 150,
    portionGrams: 150,
    difficulty: 'Легко',
    cuisine: 'Домашняя',
    mealTypes: ['Завтрак'],
    dishType: 'Второе',
    categories: ['Молочные продукты'],
    allergens: ['Яйца', 'Молоко'],
    ingredientItems: [{ productId: 'egg', grams: 100 }, { productId: 'milk', grams: 30 }, { productId: 'cheese', grams: 30 }],
    steps: ['Взбей яйца с молоком.', 'Вылей смесь на разогретую сковороду.', 'Добавь сыр и готовь под крышкой до схватывания.']
  },
  5: {
    totalWeight: 350,
    portionGrams: 300,
    difficulty: 'Легко',
    cuisine: 'Русская',
    mealTypes: ['Обед'],
    dishType: 'Первое',
    categories: ['Овощи'],
    allergens: [],
    ingredientItems: [{ productId: 'potato', grams: 150 }, { productId: 'carrot', grams: 50 }],
    steps: ['Очисти и нарежь овощи.', 'Залей водой и вари до мягкости.', 'Посоли по вкусу и подавай горячим.']
  },
  6: {
    totalWeight: 220,
    portionGrams: 150,
    difficulty: 'Легко',
    cuisine: 'Домашняя',
    mealTypes: ['Перекус'],
    categories: ['Молочные продукты', 'Фрукты'],
    allergens: ['Молоко'],
    ingredientItems: [{ productId: 'cottage', grams: 150 }, { productId: 'berries', grams: 70 }],
    steps: ['Подготовь ягоды и при необходимости разморозь их.', 'Выложи творог в миску.', 'Добавь ягоды и аккуратно перемешай.']
  }
});

function copyValue(value) {
  if (Array.isArray(value)) {
    return value.map((item) => item && typeof item === 'object' ? { ...item } : item);
  }
  return value && typeof value === 'object' ? { ...value } : value;
}

export function normalizeRecipeSeed(recipe, seedDetails = {}) {
  if (!recipe || typeof recipe !== 'object' || Array.isArray(recipe)) {
    throw new TypeError('A recipe object is required.');
  }

  const normalized = { ...recipe };
  for (const [key, value] of Object.entries(recipe)) {
    if (Array.isArray(value)) normalized[key] = copyValue(value);
  }
  for (const [key, value] of Object.entries(seedDetails)) {
    if (normalized[key] === undefined) normalized[key] = copyValue(value);
  }

  normalized.ingredientItems = copyValue(Array.isArray(normalized.ingredientItems) ? normalized.ingredientItems : []);
  normalized.steps = copyValue(Array.isArray(normalized.steps) ? normalized.steps : []);
  normalized.allergens = copyValue(Array.isArray(normalized.allergens) ? normalized.allergens : []);
  if (!normalized.difficulty) normalized.difficulty = 'Легко';
  if (!normalized.cuisine) normalized.cuisine = 'Домашняя';
  if (!Number(normalized.totalWeight)) normalized.totalWeight = 300;
  if (!Number(normalized.portionGrams)) normalized.portionGrams = 200;
  return normalized;
}
