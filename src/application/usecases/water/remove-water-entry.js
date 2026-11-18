import {
  assertWaterMutationRequest,
  assertWaterRemovalResult,
  assertWaterMutationResult
} from '../../../contracts/water.contract.js';

export function removeWaterEntry({ repository, entries, id }) {
  assertWaterMutationRequest({ repository, entries });
  const index = entries.findIndex((entry) => String(entry.id) === String(id));
  if (index < 0) {
    return assertWaterRemovalResult({ entries: [...entries], removed: null, index: -1 });
  }

  const removed = entries[index];
  const nextEntries = entries.filter((_, entryIndex) => entryIndex !== index);
  repository.save(nextEntries);
  return assertWaterRemovalResult({ entries: nextEntries, removed, index });
}

export function restoreWaterEntry({ repository, entries, entry, index }) {
  assertWaterMutationRequest({ repository, entries });
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
    throw new TypeError('A water entry is required.');
  }
  if (entries.some((existing) => String(existing.id) === String(entry.id))) {
    throw new Error(`Water entry id "${entry.id}" already exists.`);
  }
  if (!Number.isInteger(index) || index < 0 || index > entries.length) {
    throw new RangeError('Water entry restore index is invalid.');
  }

  const nextEntries = [...entries];
  nextEntries.splice(index, 0, entry);
  repository.save(nextEntries);
  assertWaterMutationResult(nextEntries);
  return nextEntries;
}
