import {
  assertDiaryMutationRequest,
  assertDiaryMutationResult
} from '../../../contracts/diary.contract.js';

export function removeFoodEntry({ repository, entries, id }) {
  assertDiaryMutationRequest({ repository, entries });
  const index = entries.findIndex((entry) => String(entry.id) === String(id));
  if (index < 0) return assertDiaryMutationResult({ entries: [...entries], removed: null, index: -1 });
  const removed = entries[index];
  const nextEntries = entries.filter((_, entryIndex) => entryIndex !== index);
  repository.save(nextEntries);
  return assertDiaryMutationResult({ entries: nextEntries, removed, index });
}

export function restoreFoodEntry({ repository, entries, entry, index }) {
  assertDiaryMutationRequest({ repository, entries });
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
    throw new TypeError('A food diary entry is required.');
  }
  if (entries.some((existing) => String(existing.id) === String(entry.id))) {
    throw new Error(`Diary entry id "${entry.id}" already exists.`);
  }
  if (!Number.isInteger(index) || index < 0 || index > entries.length) {
    throw new RangeError('Diary entry restore index is invalid.');
  }
  const nextEntries = [...entries];
  nextEntries.splice(index, 0, entry);
  repository.save(nextEntries);
  return assertDiaryMutationResult({ entries: nextEntries }).entries;
}
