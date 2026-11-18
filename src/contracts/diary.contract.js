/**
 * @typedef {Object} DiaryMutationRequest
 * @property {Array<Object>} entries
 * @property {{save: (records: Array<Object>) => void}} repository
 */

/**
 * @typedef {Object} DiaryMutationResult
 * @property {Array<Object>} entries
 */

/**
 * @param {DiaryMutationRequest} request
 * @returns {DiaryMutationRequest}
 */
export function assertDiaryMutationRequest(request) {
  if (!request || typeof request !== 'object' || Array.isArray(request)) {
    throw new TypeError('A diary mutation request is required.');
  }
  if (!Array.isArray(request.entries)) throw new TypeError('Diary entries must be an array.');
  if (!request.repository || typeof request.repository.save !== 'function') {
    throw new TypeError('A diary repository with a save method is required.');
  }
  return request;
}

/**
 * @param {DiaryMutationResult} result
 * @returns {DiaryMutationResult}
 */
export function assertDiaryMutationResult(result) {
  if (!result || typeof result !== 'object' || !Array.isArray(result.entries)) {
    throw new TypeError('A diary mutation result must contain an entries array.');
  }
  return result;
}
