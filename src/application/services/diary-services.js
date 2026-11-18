import { assertKeyValueStoragePort } from '../../contracts/storage.contract.js';
import { createDiaryRepository } from '../../infrastructure/persistence/repositories/diary.repository.js';
import { addFoodEntries, addFoodEntry } from '../usecases/diary/add-food-entry.js';
import { removeFoodEntry, restoreFoodEntry } from '../usecases/diary/remove-food-entry.js';
import { replaceFoodEntry } from '../usecases/diary/replace-food-entry.js';
import { updateFoodEntry } from '../usecases/diary/update-food-entry.js';
import { applyMassEntry, previewMassEntry } from '../usecases/mass-entry/mass-entry.js';

/** @param {import('../../contracts/storage.contract.js').KeyValueStoragePort} storage */
export function createDiaryServices(storage) {
  assertKeyValueStoragePort(storage);
  const repository = createDiaryRepository(storage);
  const withRepository = (command) => ({ ...command, repository });

  return {
    addEntry: (command) => addFoodEntry(withRepository(command)),
    addEntries: (command) => addFoodEntries(withRepository(command)),
    updateEntry: (command) => updateFoodEntry(withRepository(command)),
    replaceEntry: (command) => replaceFoodEntry(withRepository(command)),
    removeEntry: (command) => removeFoodEntry(withRepository(command)),
    restoreEntry: (command) => restoreFoodEntry(withRepository(command)),
    massEntry: {
      preview: (command) => previewMassEntry(command),
      apply: (command) => applyMassEntry(withRepository(command))
    }
  };
}
