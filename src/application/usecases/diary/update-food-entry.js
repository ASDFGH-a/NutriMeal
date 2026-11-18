import { isMassSystemEntry } from '../../../domain/diary/diary-calculations.js';
import { isValidDateKey, dateKey, todayLocalDate } from '../../../domain/shared/date-utils.js';
import {
  assertDiaryMutationRequest,
  assertDiaryMutationResult
} from '../../../contracts/diary.contract.js';

function finiteNutrient(entry, key) {
  const value = Number(entry[key]);
  if (!Number.isFinite(value)) throw new TypeError(`Diary entry has an invalid ${key} value.`);
  return value;
}

export function updateFoodEntry({
  repository,
  entries,
  id,
  changes,
  today = dateKey(todayLocalDate())
}) {
  assertDiaryMutationRequest({ repository, entries });
  if (!changes || typeof changes !== 'object' || Array.isArray(changes)) {
    throw new TypeError('Food entry changes are required.');
  }
  const index = entries.findIndex((entry) => String(entry.id) === String(id));
  if (index < 0) throw new Error(`Diary entry "${id}" was not found.`);
  const existing = entries[index];
  if (isMassSystemEntry(existing)) throw new TypeError('System diary entries cannot be edited as food entries.');

  const date = changes.date ?? existing.date;
  if (!isValidDateKey(date) || !isValidDateKey(today)) throw new TypeError('A valid diary date is required.');
  if (date > today) throw new RangeError('Diary entries cannot be moved to a future date.');
  const meal = String(changes.meal ?? existing.meal ?? '').trim();
  if (!meal) throw new TypeError('A meal is required.');

  const quantityMode = changes.quantityMode ?? existing.quantityMode ?? 'grams';
  if (!['grams', 'portions'].includes(quantityMode)) throw new TypeError('Quantity mode must be grams or portions.');
  const portionGrams = Number(changes.portionGrams ?? existing.portionGrams);
  let grams;
  if (changes.grams !== undefined) {
    grams = Number(changes.grams);
  } else if (changes.quantityValue !== undefined) {
    const quantity = Number(changes.quantityValue);
    grams = quantityMode === 'portions' ? quantity * portionGrams : quantity;
  } else {
    grams = Number(existing.grams);
  }
  if (!Number.isFinite(grams) || grams <= 0 || grams > 30000) {
    throw new RangeError('Food quantity must be greater than 0 and no more than 30000 g.');
  }
  const previousGrams = Number(existing.grams);
  if (!Number.isFinite(previousGrams) || previousGrams <= 0) {
    throw new RangeError('The existing food entry has no valid quantity.');
  }
  if (quantityMode === 'portions' && (
    existing.recipeId === undefined
    || existing.recipeId === null
    || !Number.isFinite(portionGrams)
    || portionGrams <= 0
  )) {
    throw new TypeError('Portion quantity requires a valid portion size.');
  }

  const quantityValue = changes.quantityValue === undefined
    ? quantityMode === 'portions' ? grams / portionGrams : grams
    : Number(changes.quantityValue);
  if (!Number.isFinite(quantityValue) || quantityValue <= 0) {
    throw new RangeError('Food quantity must be greater than 0.');
  }
  const ratio = grams / previousGrams;
  const per100 = {
    kcal: finiteNutrient(existing, 'kcal') / previousGrams * 100,
    p: finiteNutrient(existing, 'p') / previousGrams * 100,
    f: finiteNutrient(existing, 'f') / previousGrams * 100,
    c: finiteNutrient(existing, 'c') / previousGrams * 100
  };
  const components = Array.isArray(existing.components) ? existing.components : [];
  const scaledComponents = components.map((component) => {
    const amount = Number(component.amount);
    if (!Number.isFinite(amount)) throw new TypeError('Diary entry has an invalid component amount.');
    return { ...component, amount: amount * ratio };
  });
  const updated = {
    ...existing,
    date,
    meal,
    recipeId: changes.recipeId ?? existing.recipeId ?? null,
    grams,
    kcal: per100.kcal * grams / 100,
    p: per100.p * grams / 100,
    f: per100.f * grams / 100,
    c: per100.c * grams / 100,
    components: scaledComponents,
    quantityMode,
    quantityValue,
    portionGrams: Number.isFinite(portionGrams) && portionGrams > 0 ? portionGrams : null
  };
  const nextEntries = [...entries];
  nextEntries[index] = updated;
  repository.save(nextEntries);
  return assertDiaryMutationResult({ entry: updated, entries: nextEntries });
}
