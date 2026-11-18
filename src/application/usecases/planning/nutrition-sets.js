import {
  emptyNutritionWeek,
  getActiveNutritionSet,
  normalizeNutritionSet,
  normalizeNutritionWeek,
  resolveActiveNutritionSetId,
  withNutritionSetWeeklyGoals
} from '../../../domain/nutrition-set/nutrition-set.model.js';
import {
  assertActiveNutritionSetResult,
  assertActiveNutritionSetWriteRepository,
  assertNutritionSetDeletionResult,
  assertNutritionSetArray,
  assertNutritionSetMutationResult,
  assertNutritionSetWriteRepository
} from '../../../contracts/nutrition-set.contract.js';

function normalizeSetName(name) {
  const normalized = String(name ?? '').trim();
  if (!normalized) throw new TypeError('Nutrition set name is required.');
  if (normalized.length > 48) throw new RangeError('Nutrition set name cannot exceed 48 characters.');
  return normalized;
}

function normalizeSetComment(comment) {
  const normalized = String(comment ?? '').trim();
  if (normalized.length > 300) throw new RangeError('Nutrition set comment cannot exceed 300 characters.');
  return normalized;
}

function assertUniqueName(sets, name, exceptId = null) {
  const normalized = name.toLocaleLowerCase('ru-RU');
  if (sets.some((set) => (
    String(set.id) !== String(exceptId)
    && String(set.name).toLocaleLowerCase('ru-RU') === normalized
  ))) {
    throw new Error(`Nutrition set name "${name}" already exists.`);
  }
}

function persist(repository, sets) {
  assertNutritionSetArray(sets);
  assertNutritionSetWriteRepository(repository);
  repository.save(sets);
}

function updateSetWeek({ sets, repository, setId, weekIndex, products = [], update }) {
  assertNutritionSetArray(sets);
  if (!Number.isInteger(weekIndex) || weekIndex < 0 || weekIndex > 3) {
    throw new RangeError('Nutrition week index must be between 0 and 3.');
  }
  const index = sets.findIndex((set) => String(set.id) === String(setId));
  if (index < 0) throw new Error(`Nutrition set "${setId}" was not found.`);

  const current = sets[index];
  const weeks = [...current.weeks];
  weeks[weekIndex] = normalizeNutritionWeek(update(weeks[weekIndex]), weekIndex, products);
  const set = normalizeNutritionSet({ ...current, weeks }, index, products);
  const nextSets = [...sets];
  nextSets[index] = set;
  persist(repository, nextSets);
  return assertNutritionSetMutationResult({ set, sets: nextSets });
}

function assertDishGroup(group) {
  if (!['mainDishes', 'snacks'].includes(group)) {
    throw new TypeError('Nutrition dish group must be mainDishes or snacks.');
  }
}

export function createNutritionSet({
  sets,
  repository,
  name,
  comment = '',
  id = `nutrition-set-${Date.now()}`,
  products = [],
  weeks,
  personalWeeklyGoals
}) {
  assertNutritionSetArray(sets);
  if (id === undefined || id === null || id === '') throw new TypeError('Nutrition set id is required.');
  if (weeks !== undefined && !Array.isArray(weeks)) {
    throw new TypeError('Nutrition set weeks must be an array.');
  }
  if (personalWeeklyGoals !== undefined
    && (!personalWeeklyGoals || typeof personalWeeklyGoals !== 'object' || Array.isArray(personalWeeklyGoals))) {
    throw new TypeError('Nutrition set weekly goals must be an object.');
  }
  const normalizedName = normalizeSetName(name);
  assertUniqueName(sets, normalizedName);
  if (sets.some((set) => String(set.id) === String(id))) {
    throw new Error(`Nutrition set id "${id}" already exists.`);
  }

  const set = normalizeNutritionSet({
    id,
    name: normalizedName,
    comment: normalizeSetComment(comment),
    weeks: weeks ?? [emptyNutritionWeek(), emptyNutritionWeek(), emptyNutritionWeek(), emptyNutritionWeek()],
    personalWeeklyGoals
  }, sets.length, products);
  const nextSets = [...sets, set];
  persist(repository, nextSets);
  return assertNutritionSetMutationResult({ set, sets: nextSets });
}

export function updateNutritionSet({ sets, repository, id, changes, products = [] }) {
  assertNutritionSetArray(sets);
  if (!changes || typeof changes !== 'object' || Array.isArray(changes)) {
    throw new TypeError('Nutrition set changes are required.');
  }

  const index = sets.findIndex((set) => String(set.id) === String(id));
  if (index < 0) throw new Error(`Nutrition set "${id}" was not found.`);
  const current = sets[index];
  const name = normalizeSetName(changes.name ?? current.name);
  assertUniqueName(sets, name, current.id);
  const set = normalizeNutritionSet({
    ...current,
    ...changes,
    id: current.id,
    name,
    comment: normalizeSetComment(changes.comment ?? current.comment)
  }, index, products);
  const nextSets = [...sets];
  nextSets[index] = set;
  persist(repository, nextSets);
  return assertNutritionSetMutationResult({ set, sets: nextSets });
}

export function updateNutritionSetWeek({ sets, repository, setId, weekIndex, week, products = [] }) {
  return updateSetWeek({
    sets,
    repository,
    setId,
    weekIndex,
    products,
    update: () => week
  });
}

export function addNutritionDishSlot({
  sets,
  repository,
  setId,
  weekIndex,
  group,
  id = `planner-${group}-${Date.now()}`,
  products = []
}) {
  assertDishGroup(group);
  if (id === undefined || id === null || id === '') throw new TypeError('Nutrition dish slot id is required.');
  return updateSetWeek({
    sets,
    repository,
    setId,
    weekIndex,
    products,
    update: (week) => {
      if ([...week.mainDishes, ...week.snacks].some((dish) => String(dish.id) === String(id))) {
        throw new Error(`Nutrition dish slot id "${id}" already exists.`);
      }
      return {
        ...week,
        [group]: [...week[group], { id: String(id), recipeId: '' }]
      };
    }
  });
}

export function removeNutritionDishSlot({
  sets,
  repository,
  setId,
  weekIndex,
  group,
  dishId,
  products = []
}) {
  assertDishGroup(group);
  return updateSetWeek({
    sets,
    repository,
    setId,
    weekIndex,
    products,
    update: (week) => {
      if (!week[group].some((dish) => String(dish.id) === String(dishId))) {
        throw new Error(`Nutrition dish slot "${dishId}" was not found.`);
      }
      return {
        ...week,
        [group]: week[group].filter((dish) => String(dish.id) !== String(dishId))
      };
    }
  });
}

export function assignNutritionDishRecipe({
  sets,
  repository,
  setId,
  weekIndex,
  group,
  dishId,
  recipeId,
  recipes,
  products = []
}) {
  assertDishGroup(group);
  assertNutritionSetArray(sets);
  if (!Array.isArray(recipes)) throw new TypeError('Recipes must be an array.');
  const normalizedRecipeId = recipeId === null || recipeId === undefined || recipeId === ''
    ? ''
    : String(recipeId);
  if (normalizedRecipeId && !recipes.some((recipe) => String(recipe.id) === normalizedRecipeId)) {
    throw new Error(`Recipe "${recipeId}" was not found.`);
  }
  return updateSetWeek({
    sets,
    repository,
    setId,
    weekIndex,
    products,
    update: (week) => {
      if (!week[group].some((dish) => String(dish.id) === String(dishId))) {
        throw new Error(`Nutrition dish slot "${dishId}" was not found.`);
      }
      return {
        ...week,
        [group]: week[group].map((dish) => (
          String(dish.id) === String(dishId)
            ? { ...dish, recipeId: normalizedRecipeId }
            : dish
        ))
      };
    }
  });
}

function normalizeGoalValues(values) {
  if (!values || typeof values !== 'object' || Array.isArray(values)) return {};
  return Object.fromEntries(Object.entries(values)
    .map(([group, value]) => [group, Number(value)])
    .filter(([, value]) => Number.isFinite(value) && value > 0)
    .map(([group, value]) => [group, Math.round(value)]));
}

export function updateNutritionSetWeeklyGoals({
  sets,
  repository,
  setId,
  completeness,
  diversity,
  products = []
}) {
  assertNutritionSetArray(sets);
  const index = sets.findIndex((set) => String(set.id) === String(setId));
  if (index < 0) throw new Error(`Nutrition set "${setId}" was not found.`);

  const current = sets[index];
  const set = withNutritionSetWeeklyGoals(current, {
    completeness: normalizeGoalValues(completeness),
    diversity: normalizeGoalValues(diversity)
  }, products);
  const nextSets = [...sets];
  nextSets[index] = set;
  persist(repository, nextSets);
  return assertNutritionSetMutationResult({ set, sets: nextSets });
}

export function selectActiveNutritionSet({ sets, id, activeRepository }) {
  assertNutritionSetArray(sets);
  if (!sets.some((set) => String(set.id) === String(id))) {
    throw new Error(`Nutrition set "${id}" was not found.`);
  }
  assertActiveNutritionSetWriteRepository(activeRepository);
  const activeId = String(id);
  activeRepository.save(activeId);
  return assertActiveNutritionSetResult(activeId);
}

export function deleteNutritionSet({
  sets,
  id,
  repository,
  activeId,
  activeRepository
}) {
  assertNutritionSetArray(sets);
  const index = sets.findIndex((set) => String(set.id) === String(id));
  if (index < 0) {
    return assertNutritionSetDeletionResult({
      sets: [...sets],
      removed: null,
      index: -1,
      activeId: resolveActiveNutritionSetId(sets, activeId)
    });
  }

  const removed = sets[index];
  const nextSets = sets.filter((_, itemIndex) => itemIndex !== index);
  let nextActiveId = resolveActiveNutritionSetId(nextSets, activeId);
  if (String(activeId) === String(removed.id)) {
    nextActiveId = getActiveNutritionSet(nextSets, nextSets[0]?.id)?.id || '';
  }
  assertActiveNutritionSetWriteRepository(activeRepository);
  persist(repository, nextSets);
  activeRepository.save(String(nextActiveId));
  return assertNutritionSetDeletionResult({ sets: nextSets, removed, index, activeId: nextActiveId });
}

