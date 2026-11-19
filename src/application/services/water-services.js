import { assertArrayRepositoryPort } from '../../contracts/storage.contract.js';
import { addWaterEntry } from '../usecases/water/add-water-entry.js';
import { removeWaterEntry, restoreWaterEntry } from '../usecases/water/remove-water-entry.js';

/** @param {import('../../contracts/storage.contract.js').ArrayRepositoryPort} repository */
export function createWaterServices(repository) {
  assertArrayRepositoryPort(repository);
  const withRepository = (command) => ({ ...command, repository });

  return {
    addEntry: (command) => addWaterEntry(withRepository(command)),
    removeEntry: (command) => removeWaterEntry(withRepository(command)),
    restoreEntry: (command) => restoreWaterEntry(withRepository(command))
  };
}
