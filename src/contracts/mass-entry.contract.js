const SOURCES = ['calories', 'library', 'set'];
const COLLISION_MODES = ['skip', 'append', 'replace'];

/**
 * @typedef {Object} MassEntryRequest
 * @property {Array<Object>} entries
 * @property {string[]} dates
 * @property {'calories'|'library'|'set'} source
 * @property {'skip'|'append'|'replace'} [collisionMode]
 */

/**
 * @typedef {Object} MassEntryPreviewContract
 * @property {string[]} dates
 * @property {string[]} targetDates
 * @property {string[]} skippedDates
 * @property {number} daysToWrite
 * @property {number} entriesToWrite
 * @property {Object} dailyTotals
 * @property {number} totalKcal
 */

/** @param {MassEntryRequest} request */
export function assertMassEntryRequest(request) {
  if (!request || typeof request !== 'object' || Array.isArray(request)) {
    throw new TypeError('A mass-entry request is required.');
  }
  if (!Array.isArray(request.entries)) throw new TypeError('Diary entries must be an array.');
  if (!Array.isArray(request.dates)) throw new TypeError('Mass-entry dates must be an array.');
  if (!SOURCES.includes(request.source)) {
    throw new TypeError('Mass-entry source must be calories, library, or set.');
  }
  if (request.collisionMode !== undefined && !COLLISION_MODES.includes(request.collisionMode)) {
    throw new TypeError('Collision mode must be skip, append, or replace.');
  }
  return request;
}

/** @param {MassEntryPreviewContract} result */
export function assertMassEntryPreview(result) {
  if (
    !result
    || !Array.isArray(result.dates)
    || !Array.isArray(result.targetDates)
    || !Array.isArray(result.skippedDates)
    || !Number.isInteger(result.daysToWrite)
    || !Number.isInteger(result.entriesToWrite)
    || !result.dailyTotals
    || typeof result.dailyTotals !== 'object'
    || !Number.isFinite(result.totalKcal)
  ) {
    throw new TypeError('Mass-entry preview does not satisfy its output contract.');
  }
  return result;
}

/** @param {{entries: Object[], created: Object[], dates: string[], skippedDates: string[]}} result */
export function assertMassEntryResult(result) {
  if (
    !result
    || !Array.isArray(result.entries)
    || !Array.isArray(result.created)
    || !Array.isArray(result.dates)
    || !Array.isArray(result.skippedDates)
  ) {
    throw new TypeError('Mass-entry result does not satisfy its output contract.');
  }
  return result;
}
