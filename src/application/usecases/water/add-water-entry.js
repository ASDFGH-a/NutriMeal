import { createWaterEntry } from '../../../domain/water/water-entry.js';
import {
  assertWaterMutationRequest,
  assertWaterMutationResult
} from '../../../contracts/water.contract.js';

export function addWaterEntry({
  repository,
  entries,
  id = Date.now() + Math.floor(Math.random() * 10000),
  ...input
}) {
  assertWaterMutationRequest({ repository, entries });

  const entry = createWaterEntry({ id, ...input });
  if (entries.some((existing) => existing.id === entry.id)) {
    throw new Error(`Water entry id "${entry.id}" already exists.`);
  }

  const nextEntries = [...entries, entry];
  repository.save(nextEntries);
  return assertWaterMutationResult(nextEntries);
}
