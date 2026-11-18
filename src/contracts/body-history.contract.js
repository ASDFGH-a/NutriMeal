function assertRepository(repository, message) {
  if (!repository || typeof repository.save !== 'function') throw new TypeError(message);
}

function assertProfile(profile) {
  if (!profile || typeof profile !== 'object' || Array.isArray(profile)) {
    throw new TypeError('Profile data is required for body-history updates.');
  }
}

/**
 * @typedef {Object} BodyHistoryCommand
 * @property {Array<Object>} history
 * @property {{save: (records: Array<Object>) => void}} historyRepository
 * @property {Object} profile
 * @property {{save: (record: Object) => void}} profileRepository
 */

/** @param {BodyHistoryCommand} request */
export function assertWeightHistoryRequest(request) {
  if (!request || typeof request !== 'object' || Array.isArray(request)) {
    throw new TypeError('A weight-history request is required.');
  }
  if (!Array.isArray(request.history)) throw new TypeError('Weight history must be an array.');
  assertRepository(request.historyRepository, 'A weight-history repository is required.');
  assertProfile(request.profile);
  assertRepository(request.profileRepository, 'A profile repository is required.');
  return request;
}

export function assertWeightHistoryResult(result) {
  if (!result || typeof result !== 'object' || Array.isArray(result)
    || !Array.isArray(result.history)
    || !result.profile || typeof result.profile !== 'object' || Array.isArray(result.profile)) {
    throw new TypeError('Weight-history result is incomplete.');
  }
  if (result.removed !== undefined && result.removed !== null
    && (!Number.isInteger(result.index) || result.index < 0)) {
    throw new TypeError('Weight-history removal result must include its index.');
  }
  return result;
}

/** @param {BodyHistoryCommand} request */
export function assertMeasurementHistoryRequest(request) {
  if (!request || typeof request !== 'object' || Array.isArray(request)) {
    throw new TypeError('A measurement-history request is required.');
  }
  if (!Array.isArray(request.history)) throw new TypeError('Measurement history must be an array.');
  assertRepository(request.historyRepository, 'A measurement-history repository is required.');
  assertProfile(request.profile);
  assertRepository(request.profileRepository, 'A profile repository is required.');
  return request;
}

export function assertMeasurementHistoryResult(result) {
  if (!result || typeof result !== 'object' || Array.isArray(result)
    || !Array.isArray(result.history)
    || !Array.isArray(result.measurements)
    || !result.profile || typeof result.profile !== 'object' || Array.isArray(result.profile)) {
    throw new TypeError('Measurement-history result is incomplete.');
  }
  if (result.removed !== undefined && result.removed !== null
    && (!Number.isInteger(result.index) || result.index < 0)) {
    throw new TypeError('Measurement-history removal result must include its index.');
  }
  return result;
}
