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
