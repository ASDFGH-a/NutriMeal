import { createFoodDiaryEntry } from '../../../domain/diary/diary-entry.js';
import {
  aggregateNutritionWeeks,
  getNutritionAverage,
  getNutritionRecipeFoodMetadata
} from '../../../domain/nutrition-set/nutrition-set.calculations.js';
import { calculateRecipeNutrition } from '../../../domain/shared/nutrient-calculations.js';
import { assertDiaryMutationRequest } from '../../../contracts/diary.contract.js';
import {
  assertMassEntryPreview,
  assertMassEntryRequest,
  assertMassEntryResult
} from '../../../contracts/mass-entry.contract.js';
import {
  createCalorieOnlyDiaryEntry,
  createNutritionSetAverageDiaryEntry,
  planMassEntryDates
} from '../../../domain/mass-entry/mass-entry.model.js';

function prepareMassEntrySource({
  source,
  dates,
  calorieMode = 'daily',
  calories,
  items,
  set,
  setId,
  sets = [],
  recipes = [],
  products = []
}) {
  if (source === 'calories') {
    if (!['daily', 'period'].includes(calorieMode)) {
      throw new TypeError('Calorie mode must be daily or period.');
    }
    const enteredCalories = Number(calories);
    if (!Number.isFinite(enteredCalories) || enteredCalories <= 0 || enteredCalories > 1000000) {
      throw new RangeError('Calories must be greater than 0 and no more than 1000000.');
    }
    return {
      source,
      dailyTotals: {
        kcal: calorieMode === 'period' ? enteredCalories / dates.length : enteredCalories,
        p: null,
        f: null,
        c: null
      },
      createForDate: (nextId, date, today) => createCalorieOnlyDiaryEntry({
        id: nextId(),
        date,
        kcal: calorieMode === 'period' ? enteredCalories / dates.length : enteredCalories,
        today
      })
    };
  }

  if (source === 'library') {
    if (!Array.isArray(items) || items.length === 0) {
      throw new TypeError('At least one library food item is required.');
    }
    if (!Array.isArray(recipes) || !Array.isArray(products)) {
      throw new TypeError('Recipes and products must be arrays.');
    }
    const preparedItems = items.map((draft) => {
      if (!draft || typeof draft !== 'object' || Array.isArray(draft)) {
        throw new TypeError('Each library food item must be an object.');
      }
      const kind = draft.kind;
      if (!['recipe', 'product'].includes(kind)) {
        throw new TypeError('Library food kind must be recipe or product.');
      }
      const draftItem = draft.item && typeof draft.item === 'object' ? draft.item : draft;
      const catalog = kind === 'recipe' ? recipes : products;
      const item = catalog.find((candidate) => String(candidate.id) === String(draftItem.id)) || draftItem;
      const grams = Number(draft.grams);
      if (!Number.isFinite(grams) || grams <= 0 || grams > 30000) {
        throw new RangeError('Food quantity must be greater than 0 and no more than 30000 g.');
      }
      const quantityMode = draft.quantityMode || 'grams';
      if (!['grams', 'portions'].includes(quantityMode)) {
        throw new TypeError('Quantity mode must be grams or portions.');
      }
      const portionGrams = Number(draft.portionGrams ?? item.portionGrams);
      if (quantityMode === 'portions' && (
        kind !== 'recipe'
        || !Number.isFinite(portionGrams)
        || portionGrams <= 0
      )) {
        throw new TypeError('Portion quantity requires a recipe with a valid portion size.');
      }
      const quantityValue = draft.quantityValue === undefined
        ? quantityMode === 'portions' ? grams / portionGrams : grams
        : Number(draft.quantityValue);
      if (!Number.isFinite(quantityValue) || quantityValue <= 0) {
        throw new RangeError('Food quantity must be greater than 0.');
      }
      const representedGrams = quantityMode === 'portions'
        ? quantityValue * portionGrams
        : quantityValue;
      if (!Number.isFinite(representedGrams) || Math.abs(representedGrams - grams) > 0.000001) {
        throw new RangeError('Food quantity does not match its saved quantity mode.');
      }

      let nutritionSnapshot = draft.nutritionSnapshot;
      if (!nutritionSnapshot && kind === 'recipe' && item.ingredientItems?.length) {
        const nutrition = calculateRecipeNutrition(item, products);
        nutritionSnapshot = {
          ...nutrition.per100,
          components: nutrition.components.per100
        };
      }
      let foodMetadataSnapshot = draft.foodMetadataSnapshot;
      if (!foodMetadataSnapshot && kind === 'recipe') {
        foodMetadataSnapshot = getNutritionRecipeFoodMetadata(item, products);
      } else if (!foodMetadataSnapshot) {
        foodMetadataSnapshot = {
          categories: Array.isArray(item.categories) ? item.categories : [],
          items: [item.name]
        };
      }
      const per100 = nutritionSnapshot || item;
      const nutrients = {};
      for (const key of ['kcal', 'p', 'f', 'c']) {
        nutrients[key] = Number(per100[key]);
        if (!Number.isFinite(nutrients[key]) || nutrients[key] < 0) {
          throw new RangeError(`Library food item "${item.name}" has an invalid ${key} value.`);
        }
      }
      return {
        draft,
        item,
        kind,
        grams,
        quantityMode,
        quantityValue,
        nutritionSnapshot,
        foodMetadataSnapshot,
        nutrients
      };
    });
    const dailyTotals = preparedItems.reduce((totals, prepared) => {
      for (const key of ['kcal', 'p', 'f', 'c']) {
        totals[key] += prepared.nutrients[key] * prepared.grams / 100;
      }
      return totals;
    }, { kcal: 0, p: 0, f: 0, c: 0 });

    return {
      source,
      dailyTotals,
      createForDate: (nextId, date, today) => preparedItems.map((prepared) => {
        const { draft, item, kind } = prepared;
        const entry = createFoodDiaryEntry({
          id: nextId(),
          date,
          today,
          meal: draft.meal || 'Завтрак',
          item,
          kind,
          grams: prepared.grams,
          quantityMode: prepared.quantityMode,
          quantityValue: prepared.quantityValue,
          quantityUnit: draft.quantityUnit || 'г',
          portionGrams: draft.portionGrams,
          foodMetadataSnapshot: prepared.foodMetadataSnapshot,
          nutritionSnapshot: prepared.nutritionSnapshot
        });
        return entry;
      })
    };
  }

  if (source === 'set') {
    if (!Array.isArray(sets) || !Array.isArray(recipes) || !Array.isArray(products)) {
      throw new TypeError('Nutrition sets, recipes, and products must be arrays.');
    }
    const selectedSet = set || sets.find((candidate) => String(candidate.id) === String(setId));
    if (!selectedSet) throw new Error(`Nutrition set "${setId}" was not found.`);
    const aggregate = aggregateNutritionWeeks(selectedSet.weeks || [], recipes, products);
    if (!aggregate.recipeCount) throw new RangeError('Nutrition set has no recipes to calculate.');
    const average = getNutritionAverage(aggregate, 28);
    return {
      source,
      dailyTotals: average.totals,
      createForDate: (nextId, date, today) => createNutritionSetAverageDiaryEntry({
        id: nextId(),
        date,
        setId: selectedSet.id,
        setName: selectedSet.name,
        totals: average.totals,
        components: average.components,
        today
      })
    };
  }

  throw new TypeError('Mass-entry source must be calories, library, or set.');
}

function prepareOperation({
  entries,
  dates,
  collisionMode = 'skip',
  today,
  ...sourceOptions
}) {
  const datePlan = planMassEntryDates({ dates, existingEntries: entries, collisionMode, today });
  if (!datePlan.dates.length) throw new RangeError('At least one mass-entry date is required.');
  const preparedSource = prepareMassEntrySource({ ...sourceOptions, dates: datePlan.dates });
  const entriesPerDay = sourceOptions.source === 'library' ? sourceOptions.items?.length || 0 : 1;
  return {
    ...datePlan,
    ...preparedSource,
    today,
    daysToWrite: datePlan.targetDates.length,
    entriesToWrite: datePlan.targetDates.length * entriesPerDay,
    totalKcal: preparedSource.dailyTotals.kcal * datePlan.dates.length
  };
}

export function previewMassEntry(options) {
  assertMassEntryRequest(options);
  const prepared = prepareOperation(options);
  return assertMassEntryPreview({
    source: prepared.source,
    dates: prepared.dates,
    filledDates: prepared.filledDates,
    targetDates: prepared.targetDates,
    skippedDates: prepared.skippedDates,
    daysToWrite: prepared.daysToWrite,
    entriesToWrite: prepared.entriesToWrite,
    dailyTotals: prepared.dailyTotals,
    totalKcal: prepared.totalKcal
  });
}

export function applyMassEntry({
  repository,
  entries,
  idFactory = () => Date.now() + Math.floor(Math.random() * 100000),
  ...options
}) {
  assertMassEntryRequest({ entries, ...options });
  assertDiaryMutationRequest({ repository, entries });
  if (typeof idFactory !== 'function') throw new TypeError('An id factory must be a function.');
  const prepared = prepareOperation({ entries, ...options });
  if (!prepared.daysToWrite) {
    return assertMassEntryResult({
      entries: [...entries],
      created: [],
      dates: prepared.targetDates,
      skippedDates: prepared.skippedDates
    });
  }

  const usedIds = new Set(entries.map((entry) => String(entry.id)));
  const nextId = () => {
    const id = idFactory();
    if (id === undefined || id === null || id === '' || usedIds.has(String(id))) {
      throw new Error(`Mass-entry id "${id}" is invalid or already exists.`);
    }
    usedIds.add(String(id));
    return id;
  };
  const created = [];
  for (const date of prepared.targetDates) {
    const dateEntries = prepared.createForDate(nextId, date, prepared.today);
    created.push(...(Array.isArray(dateEntries) ? dateEntries : [dateEntries]));
  }
  const replacedDates = options.collisionMode === 'replace' ? new Set(prepared.targetDates) : null;
  const retained = replacedDates
    ? entries.filter((entry) => !replacedDates.has(entry.date))
    : [...entries];
  const nextEntries = [...retained, ...created];
  repository.save(nextEntries);
  return assertMassEntryResult({
    entries: nextEntries,
    created,
    dates: prepared.targetDates,
    skippedDates: prepared.skippedDates
  });
}
