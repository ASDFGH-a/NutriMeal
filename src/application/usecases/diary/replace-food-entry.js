import { isMassSystemEntry } from '../../../domain/diary/diary-calculations.js';
import { createFoodDiaryEntry } from '../../../domain/diary/diary-entry.js';
import {
  assertDiaryMutationRequest,
  assertDiaryMutationResult
} from '../../../contracts/diary.contract.js';

export function replaceFoodEntry({
  repository,
  entries,
  id,
  item,
  kind,
  grams,
  today,
  date,
  meal,
  quantityMode = 'grams',
  quantityValue,
  quantityUnit,
  portionGrams,
  foodMetadataSnapshot,
  nutritionSnapshot
}) {
  assertDiaryMutationRequest({ repository, entries });
  const index = entries.findIndex((entry) => String(entry.id) === String(id));
  if (index < 0) throw new Error(`Diary entry "${id}" was not found.`);
  if (isMassSystemEntry(entries[index])) {
    throw new TypeError('System diary entries cannot be replaced as food entries.');
  }

  const entry = createFoodDiaryEntry({
    id: entries[index].id,
    date: date ?? entries[index].date,
    meal: meal ?? entries[index].meal,
    item,
    kind,
    grams,
    today,
    quantityMode,
    quantityValue,
    quantityUnit,
    portionGrams,
    foodMetadataSnapshot,
    nutritionSnapshot
  });
  const nextEntries = [...entries];
  nextEntries[index] = entry;
  repository.save(nextEntries);
  return assertDiaryMutationResult({ entry, entries: nextEntries });
}
