import { dateKey, isValidDateKey, todayLocalDate } from '../shared/date-utils.js';

const FOOD_COMPONENTS = [
  ['fiber', 'Клетчатка', 'г'],
  ['sugar', 'Сахар', 'г'],
  ['sodium', 'Натрий', 'мг'],
  ['cholesterol', 'Холестерин', 'мг'],
  ['potassium', 'Калий', 'мг']
];

function finiteNutrient(item, key) {
  const value = Number(item[key]);
  if (!Number.isFinite(value)) {
    throw new TypeError(`Food item "${item.name}" has an invalid ${key} value.`);
  }
  return value;
}

export function createFoodDiaryEntry({
  id,
  date,
  meal,
  item,
  kind,
  grams,
  quantityMode = 'grams',
  quantityValue,
  quantityUnit,
  portionGrams = null,
  foodMetadataSnapshot = null,
  nutritionSnapshot = null,
  today = dateKey(todayLocalDate())
}) {
  if (!isValidDateKey(date)) throw new TypeError('A valid diary date is required.');
  if (!isValidDateKey(today)) throw new TypeError('A valid current date is required.');
  if (date > today) throw new RangeError('Diary entries cannot be added for a future date.');
  if (!meal) throw new TypeError('A meal is required.');
  if (!item || item.id === undefined || !item.name) throw new TypeError('A catalog item is required.');
  if (!['recipe', 'product'].includes(kind)) throw new TypeError('Food kind must be recipe or product.');

  if (!['grams', 'portions'].includes(quantityMode)) throw new TypeError('Quantity mode must be grams or portions.');
  const portionSize = Number(portionGrams);
  if (quantityMode === 'portions' && (kind !== 'recipe' || !Number.isFinite(portionSize) || portionSize <= 0)) {
    throw new TypeError('Portion quantity requires a recipe with a valid portion size.');
  }
  const quantity = quantityValue === undefined
    ? quantityMode === 'portions' ? Number(grams) / portionSize : Number(grams)
    : Number(quantityValue);
  const amount = quantityMode === 'portions' ? quantity * portionSize : Number(grams ?? quantity);
  if (!Number.isFinite(amount) || amount <= 0 || amount > 30000) {
    throw new RangeError('Food quantity must be greater than 0 and no more than 30000 g.');
  }
  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new RangeError('Food quantity must be greater than 0.');
  }

  const snapshot = nutritionSnapshot && typeof nutritionSnapshot === 'object'
    ? nutritionSnapshot
    : item;
  const kcal = finiteNutrient(snapshot, 'kcal');
  const protein = finiteNutrient(snapshot, 'p');
  const fat = finiteNutrient(snapshot, 'f');
  const carbohydrates = finiteNutrient(snapshot, 'c');
  const ingredients = Array.isArray(item.ingredients)
    ? item.ingredients.map((ingredient) => typeof ingredient === 'string' ? ingredient : ingredient?.name).filter(Boolean)
    : String(item.ingredients || item.name).split(/[,;]+/).map((value) => value.trim()).filter(Boolean);
  const metadata = foodMetadataSnapshot && typeof foodMetadataSnapshot === 'object'
    ? foodMetadataSnapshot
    : {
      categories: Array.isArray(item.categories) ? item.categories : [],
      items: [...new Set(ingredients)]
    };
  const components = Array.isArray(snapshot.components) ? snapshot.components.map((component) => ({ ...component })) : [];
  const knownComponents = new Set(components.map((component) => String(component.name || '').trim().toLocaleLowerCase('ru-RU')));
  for (const [key, name, unit] of FOOD_COMPONENTS) {
    const value = Number(snapshot[key] ?? item[key]);
    if (Number.isFinite(value) && value > 0 && !knownComponents.has(name.toLocaleLowerCase('ru-RU'))) {
      components.push({ name, amount: value, unit });
      knownComponents.add(name.toLocaleLowerCase('ru-RU'));
    }
  }
  const storedSnapshot = {
    kcal,
    p: protein,
    f: fat,
    c: carbohydrates,
    components
  };

  return {
    id,
    date,
    meal,
    name: item.name,
    grams: amount,
    quantityMode,
    quantityValue: quantity,
    quantityUnit: quantityUnit || (kind === 'product' && item.basisUnit === 'мл' ? 'мл' : 'г'),
    portionGrams: quantityMode === 'portions' ? portionSize : (Number(portionGrams) || null),
    kcal: kcal * amount / 100,
    p: protein * amount / 100,
    f: fat * amount / 100,
    c: carbohydrates * amount / 100,
    components: storedSnapshot.components.map((component) => ({
      ...component,
      amount: Number(component.amount) * amount / 100
    })),
    recipeId: kind === 'recipe' ? item.id : null,
    productId: kind === 'product' ? item.id : null,
    foodMetadataSnapshot: {
      categories: Array.isArray(metadata.categories) ? [...metadata.categories] : [],
      items: Array.isArray(metadata.items) ? [...new Set(metadata.items)] : [...new Set(ingredients)]
    },
    nutritionSnapshot: storedSnapshot
  };
}
