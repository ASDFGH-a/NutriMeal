import { createFoodDiaryEntry } from '../../../domain/diary/diary-entry.js';
import {
  assertDiaryMutationRequest,
  assertDiaryMutationResult
} from '../../../contracts/diary.contract.js';

export function addFoodEntry({
  repository,
  entries,
  id = Date.now() + Math.floor(Math.random() * 10000),
  ...input
}) {
  return addFoodEntries({
    repository,
    entries,
    items: [{ id, ...input }]
  });
}

export function addFoodEntries({ repository, entries, items, today }) {
  assertDiaryMutationRequest({ repository, entries });
  if (!Array.isArray(items)) throw new TypeError('Food diary items must be an array.');

  const ids = new Set(entries.map((entry) => String(entry.id)));
  const addedEntries = items.map(({ id = Date.now() + Math.floor(Math.random() * 10000), today: itemToday, ...input }) => {
    const entry = createFoodDiaryEntry({ id, ...input, today: itemToday ?? today });
    const key = String(entry.id);
    if (ids.has(key)) throw new Error(`Diary entry id "${entry.id}" already exists.`);
    ids.add(key);
    return entry;
  });
  if (addedEntries.length === 0) {
    return assertDiaryMutationResult({ entries: [...entries] }).entries;
  }

  const nextEntries = [...entries, ...addedEntries];
  repository.save(nextEntries);
  return assertDiaryMutationResult({ entries: nextEntries }).entries;
}
