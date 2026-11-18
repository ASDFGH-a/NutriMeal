import { assertKeyValueStoragePort } from '../../contracts/storage.contract.js';
import { createMeasurementHistoryRepository } from '../../infrastructure/persistence/repositories/measurement.repository.js';
import { createProfileRepository } from '../../infrastructure/persistence/repositories/profile.repository.js';
import { createWeightHistoryRepository } from '../../infrastructure/persistence/repositories/weight.repository.js';
import * as measurementUseCases from '../usecases/measurement/measurement-history.js';
import * as weightUseCases from '../usecases/weight/weight-history.js';

/** @param {import('../../contracts/storage.contract.js').KeyValueStoragePort} storage */
export function createBodyHistoryServices(storage) {
  assertKeyValueStoragePort(storage);
  const weightRepository = createWeightHistoryRepository(storage);
  const measurementRepository = createMeasurementHistoryRepository(storage);
  const profileRepository = createProfileRepository(storage);
  const withRepositories = (command, historyRepository) => ({
    ...command,
    historyRepository,
    profileRepository
  });
  return {
    weight: {
      saveRecord: (command) => weightUseCases.saveWeightRecord(
        withRepositories(command, weightRepository)
      ),
      deleteRecord: (command) => weightUseCases.deleteWeightRecord(
        withRepositories(command, weightRepository)
      ),
      restoreRecord: (command) => weightUseCases.restoreWeightRecord(
        withRepositories(command, weightRepository)
      )
    },
    measurements: {
      saveSnapshot: (command) => measurementUseCases.saveMeasurementSnapshot(
        withRepositories(command, measurementRepository)
      ),
      deleteSnapshot: (command) => measurementUseCases.deleteMeasurementSnapshot(
        withRepositories(command, measurementRepository)
      ),
      restoreSnapshot: (command) => measurementUseCases.restoreMeasurementSnapshot(
        withRepositories(command, measurementRepository)
      )
    }
  };
}
