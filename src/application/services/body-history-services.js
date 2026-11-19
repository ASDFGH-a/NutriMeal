import {
  assertArrayRepositoryPort,
  assertObjectRepositoryPort
} from '../../contracts/storage.contract.js';
import * as measurementUseCases from '../usecases/measurement/measurement-history.js';
import * as weightUseCases from '../usecases/weight/weight-history.js';

/**
 * @param {Object} repositories
 * @param {import('../../contracts/storage.contract.js').ArrayRepositoryPort} repositories.weight
 * @param {import('../../contracts/storage.contract.js').ArrayRepositoryPort} repositories.measurements
 * @param {import('../../contracts/storage.contract.js').ObjectRepositoryPort} repositories.profile
 */
export function createBodyHistoryServices({
  weightRepository,
  measurementRepository,
  profileRepository
} = {}) {
  assertArrayRepositoryPort(weightRepository);
  assertArrayRepositoryPort(measurementRepository);
  assertObjectRepositoryPort(profileRepository);
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
