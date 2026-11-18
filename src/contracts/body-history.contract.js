function assertRepository(repository, message) {
  if (!repository || typeof repository.save !== 'function') throw new TypeError(message);
}

function assertProfile(profile) {
  if (!profile || typeof profile !== 'object' || Array.isArray(profile)) {
    throw new TypeError('Profile data is required for body-history updates.');
  }
}

function assertBodyHistoryRequest(request, type, label) {
  if (!request || typeof request !== 'object' || Array.isArray(request)) {
    throw new TypeError(`A ${type}-history request is required.`);
  }
  if (!Array.isArray(request.history)) throw new TypeError(`${label} history must be an array.`);
  assertRepository(request.historyRepository, `A ${type}-history repository is required.`);
  assertProfile(request.profile);
  assertRepository(request.profileRepository, 'A profile repository is required.');
  return request;
}

function assertRemovalIndex(result, message) {
  if (result.removed === undefined) {
    if (result.index !== undefined) throw new TypeError(message);
    return;
  }
  if (result.removed === null) {
    if (result.index !== undefined
      && (!Number.isInteger(result.index) || result.index < -1)) throw new TypeError(message);
    return;
  }
  if (!Number.isInteger(result.index) || result.index < 0) throw new TypeError(message);
}

/**
 * @typedef {Object} WeightHistoryRecord
 * @property {string} date
 * @property {number} weight
 */

/**
 * @typedef {Object} MeasurementHistoryRecord
 * @property {string} date
 * @property {Object<string, (number|string|null)>} values
 */

/**
 * @typedef {Object} WeightHistoryCommand
 * @property {Array<WeightHistoryRecord>} history
 * @property {{save: (records: Array<WeightHistoryRecord>) => void}} historyRepository
 * @property {Object} profile
 * @property {{save: (record: Object) => void}} profileRepository
 * @property {(number|string)} [weight] Weight to save.
 * @property {string} [date] Date to save, delete, or restore.
 * @property {string} [today] Current date used for validation.
 * @property {string} [previousDate] Existing date when replacing a record.
 * @property {WeightHistoryRecord} [record] Record to restore.
 */

/**
 * @typedef {Object} WeightHistoryResult
 * @property {Array<WeightHistoryRecord>} history
 * @property {Object} profile
 * @property {WeightHistoryRecord|null} [removed]
 * @property {number} [index]
 */

/** @param {WeightHistoryCommand} request */
export function assertWeightHistoryRequest(request) {
  return assertBodyHistoryRequest(request, 'weight', 'Weight');
}

/** @param {WeightHistoryResult} result @returns {WeightHistoryResult} */
export function assertWeightHistoryResult(result) {
  if (!result || typeof result !== 'object' || Array.isArray(result)
    || !Array.isArray(result.history)
    || !result.profile || typeof result.profile !== 'object' || Array.isArray(result.profile)) {
    throw new TypeError('Weight-history result is incomplete.');
  }
  if (result.removed !== undefined && result.removed !== null
    && (!result.removed || typeof result.removed !== 'object' || Array.isArray(result.removed)
      || typeof result.removed.date !== 'string' || !Number.isFinite(result.removed.weight))) {
    throw new TypeError('Weight-history removed record is invalid.');
  }
  assertRemovalIndex(result, 'Weight-history removal result must include a valid index.');
  return result;
}

/**
 * @typedef {Object} MeasurementHistoryCommand
 * @property {Array<MeasurementHistoryRecord>} history
 * @property {{save: (records: Array<MeasurementHistoryRecord>) => void}} historyRepository
 * @property {Object} profile
 * @property {{save: (record: Object) => void}} profileRepository
 * @property {string} [date] Date to save, delete, or restore.
 * @property {string} [today] Current date used for validation.
 * @property {Object<string, (number|string|null)>} [values] Measurement values to save.
 * @property {MeasurementHistoryRecord} [snapshot] Snapshot to restore.
 */

/**
 * @typedef {Object} MeasurementHistoryResult
 * @property {Array<MeasurementHistoryRecord>} history
 * @property {Array<Object>} measurements
 * @property {Object} profile
 * @property {MeasurementHistoryRecord|null} [removed]
 * @property {number} [index]
 */

/** @param {MeasurementHistoryCommand} request */
export function assertMeasurementHistoryRequest(request) {
  return assertBodyHistoryRequest(request, 'measurement', 'Measurement');
}

/** @param {MeasurementHistoryResult} result @returns {MeasurementHistoryResult} */
export function assertMeasurementHistoryResult(result) {
  if (!result || typeof result !== 'object' || Array.isArray(result)
    || !Array.isArray(result.history)
    || !Array.isArray(result.measurements)
    || !result.profile || typeof result.profile !== 'object' || Array.isArray(result.profile)) {
    throw new TypeError('Measurement-history result is incomplete.');
  }
  if (result.removed !== undefined && result.removed !== null
    && (!result.removed || typeof result.removed !== 'object' || Array.isArray(result.removed)
      || typeof result.removed.date !== 'string'
      || !result.removed.values || typeof result.removed.values !== 'object'
      || Array.isArray(result.removed.values))) {
    throw new TypeError('Measurement-history removed record is invalid.');
  }
  assertRemovalIndex(result, 'Measurement-history removal result must include a valid index.');
  return result;
}
