import { getRecipeCategories } from '../recipe/recipe.model.js';
import { calculateRecipeNutrition } from '../shared/nutrient-calculations.js';
import {
  normalizeRecipeFilterValue,
  recipeArray,
  uniqueProductValues
} from '../shared/filter-utils.js';

export const WEEKLY_FOOD_GROUPS = Object.freeze([
  { id: 'vegetables', label: 'Овощи', categories: ['Овощи'], reference: 'Ежедневно', min: 7, max: 7 },
  { id: 'fruit', label: 'Фрукты', categories: ['Фрукты'], reference: 'Ежедневно', min: 7, max: 7 },
  { id: 'grains', label: 'Зерновые', categories: ['Зерновые'], reference: 'Ежедневно', min: 7, max: 7 },
  {
    id: 'protein',
    label: 'Источники белка',
    categories: ['Молочные продукты', 'Бобовые', 'Рыба', 'Орехи', 'Мясо и птица', 'Яйца'],
    reference: 'Ежедневно',
    min: 7,
    max: 7
  },
  { id: 'legumes', label: 'Бобовые', categories: ['Бобовые'], reference: '2–3 раза в неделю', min: 2, max: 3 },
  { id: 'fish', label: 'Рыба', categories: ['Рыба'], reference: '1–2 раза в неделю', min: 1, max: 2 },
  { id: 'nuts', label: 'Орехи', categories: ['Орехи'], reference: 'Несколько раз в неделю', min: 2, max: null }
]);

const RECIPE_FOOD_METADATA = {
  1: { categories: ['Зерновые', 'Молочные продукты'], items: ['Овсянка', 'Молоко'] },
  2: { categories: ['Мясо и птица', 'Зерновые'], items: ['Куриная грудка', 'Гречка'] },
  3: { categories: ['Молочные продукты', 'Яйца', 'Зерновые'], items: ['Творог', 'Яйцо', 'Манка'] },
  4: { categories: ['Яйца', 'Молочные продукты'], items: ['Яйцо', 'Молоко', 'Сыр'] },
  5: { categories: ['Овощи'], items: ['Картофель', 'Морковь'] },
  6: { categories: ['Молочные продукты', 'Фрукты'], items: ['Творог', 'Ягоды'] }
};

const NUTRIENT_KEYS = ['kcal', 'p', 'f', 'c', 'fiber', 'sugar', 'sodium', 'cholesterol', 'potassium'];
const COMPONENT_TARGET_UNITS = new Map([
  ['витамин a', 'мкг RAE'],
  ['витамин c', 'мг'],
  ['витамин d', 'мкг'],
  ['витамин e', 'мг'],
  ['витамин k', 'мкг'],
  ['витамин b1 (тиамин)', 'мг'],
  ['витамин b2 (рибофлавин)', 'мг'],
  ['витамин b3 (ниацин)', 'мг NE'],
  ['витамин b5 (пантотеновая кислота)', 'мг'],
  ['биотин (b7)', 'мкг'],
  ['холин', 'мг'],
  ['витамин b6', 'мг'],
  ['фолат (b9)', 'мкг DFE'],
  ['витамин b12', 'мкг'],
  ['кальций', 'мг'],
  ['железо', 'мг'],
  ['магний', 'мг'],
  ['калий', 'мг'],
  ['цинк', 'мг'],
  ['фосфор', 'мг'],
  ['йод', 'мкг'],
  ['медь', 'мкг'],
  ['марганец', 'мг'],
  ['хром', 'мкг'],
  ['молибден', 'мкг'],
  ['фтор', 'мг'],
  ['хлорид', 'мг'],
  ['натрий', 'мг'],
  ['селен', 'мкг'],
  ['клетчатка', 'г'],
  ['омега-3 (ala)', 'г']
]);

function plannerNutrientUnitFactorToMg(unit) {
  const value = String(unit || '').trim().toLocaleLowerCase('ru-RU').replace(/\s+/g, '');
  if (value === 'г' || value === 'g') return 1000;
  if (value === 'мг' || value === 'mg') return 1;
  if (['мкг', 'µg', 'μg', 'mcg'].includes(value)) return 0.001;
  return null;
}

export function convertPlannerNutrientUnit(amount, fromUnit, toUnit) {
  const from = String(fromUnit || '').trim();
  const to = String(toUnit || '').trim();
  if (from.toLocaleLowerCase('ru-RU') === to.toLocaleLowerCase('ru-RU')) return Number(amount) || 0;
  const fromFactor = plannerNutrientUnitFactorToMg(from);
  const toFactor = plannerNutrientUnitFactorToMg(to);
  if (fromFactor === null || toFactor === null) return null;
  return (Number(amount) || 0) * fromFactor / toFactor;
}

export function getPlannerItemFoodCategories(name, product = null) {
  const categories = [...recipeArray(product?.categories)];
  const value = normalizeRecipeFilterValue(name);
  const hints = [
    [/овощ|картоф|морков|томат|помидор|огур|капуст|перец|свекл|кабач|баклаж|лук|чеснок/, 'Овощи'],
    [/ягод|фрукт|яблок|груш|апельс|мандарин|банан|киви|виноград|персик|слив|лимон|цитрус/, 'Фрукты'],
    [/овсян|греч|рис|манк|пшениц|хлеб|мук|макарон|перлов|булгур|кукуруз/, 'Зерновые'],
    [/чечев|фасол|горох|нут|боб/, 'Бобовые'],
    [/рыб|лосос|тунец|сельд|треск|форел|кревет|морепродукт/, 'Рыба'],
    [/орех|миндал|грецк|фундук|кешью|фисташ|семеч|семен/, 'Орехи'],
    [/куриц|индейк|говядин|свинин|мяс/, 'Мясо и птица'],
    [/молок|творог|сыр|йогурт|кефир|сливк/, 'Молочные продукты'],
    [/яйц/, 'Яйца']
  ];
  for (const [pattern, category] of hints) {
    if (pattern.test(value)) categories.push(category);
  }
  return uniqueProductValues(categories);
}

export function getNutritionRecipeFoodMetadata(recipe, products) {
  if (!Array.isArray(products)) throw new TypeError('Products must be an array.');
  if (!recipe || typeof recipe !== 'object') throw new TypeError('A recipe is required.');

  const seeded = RECIPE_FOOD_METADATA[recipe.id] || { categories: [], items: [] };
  const categories = [
    ...seeded.categories,
    ...recipeArray(recipe.categories),
    ...recipeArray(recipe.foodCategories)
  ];
  const items = [...seeded.items];
  const ingredientRows = recipeArray(recipe.ingredientItems);

  for (const row of ingredientRows) {
    const product = products.find((item) => String(item.id) === String(row.productId));
    if (product) {
      items.push(product.name);
      categories.push(...recipeArray(product.categories));
    } else {
      const name = row.productName || row.name;
      if (name) items.push(name);
    }
  }

  const ingredientText = Array.isArray(recipe.ingredients)
    ? recipe.ingredients.map((item) => (
      typeof item === 'string' ? item : item?.name || item?.productName || item?.title || ''
    )).filter(Boolean).join(', ')
    : String(recipe.ingredients || '');
  const normalizedIngredientText = ingredientText.toLocaleLowerCase('ru-RU');
  for (const product of products) {
    const shortName = String(product.name || '').toLocaleLowerCase('ru-RU').replace(/\s+\d.*$/, '');
    if (shortName.length > 3 && normalizedIngredientText.includes(shortName)) {
      items.push(product.name);
      categories.push(...recipeArray(product.categories));
    }
  }

  if (!items.length && ingredientText) {
    items.push(...ingredientText.split(/[,;]+/).map((value) => value.trim()).filter(Boolean));
  }
  if (!items.length && recipe.name) items.push(recipe.name);
  return {
    categories: uniqueProductValues(categories),
    items: uniqueProductValues(items)
  };
}

export function getNutritionWeekFoodStats(week, recipes, products, groups = WEEKLY_FOOD_GROUPS) {
  if (!Array.isArray(recipes) || !Array.isArray(products) || !Array.isArray(groups)) {
    throw new TypeError('Recipes, products, and food groups must be arrays.');
  }
  const stats = Object.fromEntries(groups.map((group) => [group.id, { count: 0, items: new Set() }]));
  const dishes = [...(week?.mainDishes || []), ...(week?.snacks || [])].filter((dish) => dish?.recipeId);

  for (const dish of dishes) {
    const recipe = recipes.find((item) => String(item.id) === String(dish.recipeId));
    if (!recipe) continue;

    const metadata = getNutritionRecipeFoodMetadata(recipe, products);
    const recipeCategories = uniqueProductValues([...metadata.categories, ...getRecipeCategories(recipe)]);
    const ingredientNames = uniqueProductValues([
      ...metadata.items,
      ...recipeArray(recipe.ingredientItems)
        .map((row) => products.find((product) => String(product.id) === String(row.productId))?.name
          || row.productName
          || row.name)
        .filter(Boolean)
    ]);
    const ingredientRows = ingredientNames.map((name) => {
      const product = products.find((item) => normalizeRecipeFilterValue(item.name) === normalizeRecipeFilterValue(name));
      return { name, categories: getPlannerItemFoodCategories(name, product) };
    });

    for (const group of groups) {
      const matchesRecipe = recipeCategories.some((category) => group.categories.some((expected) => (
        normalizeRecipeFilterValue(expected) === normalizeRecipeFilterValue(category)
      ))) || ingredientRows.some((item) => item.categories.some((category) => group.categories.some((expected) => (
        normalizeRecipeFilterValue(expected) === normalizeRecipeFilterValue(category)
      ))));
      if (matchesRecipe) stats[group.id].count += 1;
      for (const item of ingredientRows) {
        if (item.categories.some((category) => group.categories.some((expected) => (
          normalizeRecipeFilterValue(expected) === normalizeRecipeFilterValue(category)
        )))) {
          stats[group.id].items.add(item.name);
        }
      }
    }
  }
  return stats;
}

export function getPersonalWeeklyGoal(set, groupId, type) {
  const goals = set?.personalWeeklyGoals || {};
  const value = type === 'completeness'
    ? goals.completeness?.[groupId] ?? goals.frequency?.[groupId]
    : goals[type]?.[groupId];
  return Number(value) || null;
}

export function getNutritionSetFoodGroupCount(set, recipes, products, groups = WEEKLY_FOOD_GROUPS) {
  if (!Array.isArray(set?.weeks)) throw new TypeError('A nutrition set with weeks is required.');
  const found = new Set();
  for (const week of set.weeks) {
    const stats = getNutritionWeekFoodStats(week, recipes, products, groups);
    for (const group of groups) {
      if ((stats[group.id]?.count || 0) > 0) found.add(group.id);
    }
  }
  return found.size;
}

function aggregateComponent(componentMap, component) {
  const name = String(component.name || '').trim();
  const unit = String(component.unit || 'мг').trim();
  if (!name) return;
  const targetUnit = COMPONENT_TARGET_UNITS.get(normalizeRecipeFilterValue(name));
  const converted = targetUnit
    ? convertPlannerNutrientUnit(Number(component.amount) || 0, unit, targetUnit)
    : null;
  const aggregateUnit = converted === null ? unit : targetUnit;
  const amount = converted === null ? Number(component.amount) || 0 : converted;
  const key = `${normalizeRecipeFilterValue(name)}|${aggregateUnit.toLocaleLowerCase('ru-RU')}`;
  const current = componentMap.get(key) || { name, unit: aggregateUnit, amount: 0 };
  current.amount += amount;
  componentMap.set(key, current);
}

export function aggregateNutritionWeeks(weeks, recipes, products) {
  if (!Array.isArray(weeks) || !Array.isArray(recipes) || !Array.isArray(products)) {
    throw new TypeError('Weeks, recipes, and products must be arrays.');
  }

  const totals = Object.fromEntries(NUTRIENT_KEYS.map((key) => [key, 0]));
  const componentMap = new Map();
  const productNames = new Set();
  let recipeCount = 0;
  let unresolvedDishCount = 0;
  let missingProductCount = 0;
  let conversionIssueCount = 0;

  for (const week of weeks) {
    for (const productId of recipeArray(week?.productIds)) {
      const product = products.find((item) => String(item.id) === String(productId));
      if (product?.name) productNames.add(String(product.name).trim());
    }
    const dishes = [...(week?.mainDishes || []), ...(week?.snacks || [])].filter((dish) => dish?.recipeId);
    for (const dish of dishes) {
      recipeCount += 1;
      const recipe = recipes.find((item) => String(item.id) === String(dish.recipeId));
      if (!recipe) {
        unresolvedDishCount += 1;
        continue;
      }
      const nutrition = calculateRecipeNutrition(recipe, products);
      for (const key of NUTRIENT_KEYS) {
        const value = Number(nutrition.total?.[key]);
        if (Number.isFinite(value)) totals[key] += value;
      }
      missingProductCount += nutrition.missingProducts.length;
      conversionIssueCount += nutrition.conversionIssues.length;
      for (const row of recipeArray(recipe.ingredientItems)) {
        const product = products.find((item) => String(item.id) === String(row.productId));
        const name = product?.name || row.productName || row.name;
        if (name) productNames.add(String(name).trim());
      }
      for (const component of recipeArray(nutrition.components?.total)) {
        aggregateComponent(componentMap, component);
      }
    }
  }
  return {
    totals,
    components: [...componentMap.values()],
    productNames,
    recipeCount,
    unresolvedDishCount,
    missingProductCount,
    conversionIssueCount
  };
}

export function getNutritionAverage(aggregate, days) {
  if (!aggregate || typeof aggregate !== 'object') throw new TypeError('A nutrition aggregate is required.');
  if (!Number.isFinite(days) || days <= 0) throw new RangeError('The number of days must be greater than 0.');
  return {
    hasData: aggregate.recipeCount > 0,
    days,
    totals: Object.fromEntries(Object.entries(aggregate.totals).map(([key, value]) => [key, value / days])),
    components: recipeArray(aggregate.components).map((component) => ({
      ...component,
      amount: component.amount / days
    }))
  };
}

export function getNutritionWeekAverage(week, recipes, products) {
  return getNutritionAverage(aggregateNutritionWeeks([week], recipes, products), 7);
}

export function getNutritionSetAverage(set, recipes, products) {
  if (!Array.isArray(set?.weeks)) throw new TypeError('A nutrition set with weeks is required.');
  return getNutritionAverage(aggregateNutritionWeeks(set.weeks, recipes, products), 28);
}
