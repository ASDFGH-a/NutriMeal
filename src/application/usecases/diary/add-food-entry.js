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
  assertDiaryMutationRequest({ repository, entries });

  const entry = createFoodDiaryEntry({ id, ...input });
  if (entries.some((existing) => existing.id === entry.id)) {
    throw new Error(`Diary entry id "${entry.id}" already exists.`);
  }

  const nextEntries = [...entries, entry];
  repository.save(nextEntries);
  return assertDiaryMutationResult({ entries: nextEntries }).entries;
}
