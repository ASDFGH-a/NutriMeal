/**
 * @typedef {Object} DiaryStatisticsRequest
 * @property {Array<Object>} diaryEntries
 * @property {Array<Object>} waterEntries
 * @property {Array<Object>} weightHistory
 * @property {Array<Object>} measurementHistory
 * @property {Array<Object>} recipes
 * @property {Array<Object>} products
 * @property {Object} profile
 * @property {string} [period]
 * @property {string} [periodEnd]
 * @property {string} [customStart]
 * @property {string} [customEnd]
 * @property {Date} [today]
 * @property {Array<Object>} [nutritionSets]
 * @property {Object} [activeNutritionSet]
 */

/**
 * @typedef {Object} DiaryStatisticsResult
 * @property {number} days
 * @property {string} startKey
 * @property {string} endKey
 * @property {Array<Object>} dailyRows
 * @property {Object} averages
 * @property {Object} body
 */

const REQUIRED_ARRAYS = [
  'diaryEntries',
  'waterEntries',
  'weightHistory',
  'measurementHistory',
  'recipes',
  'products'
];

/** @param {DiaryStatisticsRequest} request */
export function assertDiaryStatisticsRequest(request) {
  if (!request || typeof request !== 'object' || Array.isArray(request)) {
    throw new TypeError('A diary statistics request is required.');
  }
  for (const key of REQUIRED_ARRAYS) {
    if (!Array.isArray(request[key])) throw new TypeError(`Statistics request ${key} must be an array.`);
  }
  if (!request.profile || typeof request.profile !== 'object' || Array.isArray(request.profile)) {
    throw new TypeError('Statistics request profile must be an object.');
  }
  if (request.nutritionSets !== undefined && !Array.isArray(request.nutritionSets)) {
    throw new TypeError('Statistics request nutritionSets must be an array.');
  }
  if (request.period !== undefined && typeof request.period !== 'string') {
    throw new TypeError('Statistics request period must be a string.');
  }
  return request;
}

/** @param {DiaryStatisticsResult} result */
export function assertDiaryStatisticsResult(result) {
  if (
    !result
    || !Number.isInteger(result.days)
    || result.days <= 0
    || typeof result.startKey !== 'string'
    || typeof result.endKey !== 'string'
    || !Array.isArray(result.dailyRows)
    || !result.averages
    || typeof result.averages !== 'object'
    || !result.body
    || typeof result.body !== 'object'
  ) {
    throw new TypeError('Diary statistics result does not satisfy its output contract.');
  }
  return result;
}
