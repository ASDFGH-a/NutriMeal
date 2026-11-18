import { assertKeyValueStoragePort } from '../../contracts/storage.contract.js';
import { createWaterRepository } from '../../infrastructure/persistence/repositories/water.repository.js';
import { addWaterEntry } from '../usecases/water/add-water-entry.js';
import { removeWaterEntry, restoreWaterEntry } from '../usecases/water/remove-water-entry.js';

/** @param {import('../../contracts/storage.contract.js').KeyValueStoragePort} storage */
export function createWaterServices(storage) {
  assertKeyValueStoragePort(storage);
  const repository = createWaterRepository(storage);
  const withRepository = (command) => ({ ...command, repository });

  return {
    addEntry: (command) => addWaterEntry(withRepository(command)),
    removeEntry: (command) => removeWaterEntry(withRepository(command)),
    restoreEntry: (command) => restoreWaterEntry(withRepository(command))
  };
}
