/**
 * @typedef {Object} WaterMutationRequest
 * @property {Array<Object>} entries
 * @property {{save: (records: Array<Object>) => void}} repository
 */

/** @param {WaterMutationRequest} request */
export function assertWaterMutationRequest(request) {
  if (!request || typeof request !== 'object' || Array.isArray(request)) {
    throw new TypeError('A water mutation request is required.');
  }
  if (!Array.isArray(request.entries)) throw new TypeError('Water entries must be an array.');
  if (!request.repository || typeof request.repository.save !== 'function') {
    throw new TypeError('A water repository with a save method is required.');
  }
  return request;
}

export function assertWaterMutationResult(entries) {
  if (!Array.isArray(entries)) throw new TypeError('Water mutation result must be an entries array.');
  return entries;
}

/**
 * @param {{entries: Array<Object>, removed: Object|null, index: number}} result
 */
export function assertWaterRemovalResult(result) {
  if (!result || typeof result !== 'object' || !Array.isArray(result.entries)) {
    throw new TypeError('A water removal result must contain an entries array.');
  }
  if (result.removed !== null && (!result.removed || typeof result.removed !== 'object' || Array.isArray(result.removed))) {
    throw new TypeError('A removed water entry must be an object or null.');
  }
  if (!Number.isInteger(result.index) || result.index < -1) {
    throw new TypeError('A water removal result must contain a valid index.');
  }
  if ((result.removed === null) !== (result.index === -1)) {
    throw new TypeError('A missing water entry must use index -1, and a removed entry must use a valid index.');
  }
  if (result.removed !== null && result.index > result.entries.length) {
    throw new TypeError('A water removal index cannot exceed the remaining entries length.');
  }
  return result;
}
