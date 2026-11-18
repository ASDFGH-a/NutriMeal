/**
 * @typedef {Object} PlanCalculationRequest
 * @property {Object} profile
 * @property {Object} plan
 */

export function assertPlanCalculationRequest(request) {
  if (!request || typeof request !== 'object' || Array.isArray(request)) {
    throw new TypeError('A plan calculation request is required.');
  }
  if (!request.profile || typeof request.profile !== 'object' || Array.isArray(request.profile)) {
    throw new TypeError('Profile data is required for plan calculation.');
  }
  if (!request.plan || typeof request.plan !== 'object' || Array.isArray(request.plan)) {
    throw new TypeError('Plan data is required for plan calculation.');
  }
  return request;
}

export function assertPlanPresetArray(presets) {
  if (!Array.isArray(presets)) throw new TypeError('Plan presets must be an array.');
  return presets;
}

export function assertPlanCalculationResult(result) {
  if (!result || typeof result !== 'object' || Array.isArray(result)
    || !result.plan || typeof result.plan !== 'object'
    || !(result.targets === null || (result.targets && typeof result.targets === 'object'))) {
    throw new TypeError('Plan calculation result is incomplete.');
  }
  return result;
}

export function assertPlanPresetMutationResult(result) {
  if (!result || typeof result !== 'object' || Array.isArray(result)
    || !Array.isArray(result.presets)) {
    throw new TypeError('Plan preset mutation result must include a presets array.');
  }
  if (result.preset !== undefined && (!result.preset || typeof result.preset !== 'object')) {
    throw new TypeError('Plan preset result must be an object.');
  }
  if (result.removed !== undefined && !Number.isInteger(result.index)) {
    throw new TypeError('Plan preset deletion result must include its index.');
  }
  return result;
}

export function assertPlanPresetApplicationResult(result) {
  if (!result || typeof result !== 'object' || Array.isArray(result)
    || !result.preset || typeof result.preset !== 'object') {
    throw new TypeError('Plan preset application result must include a preset.');
  }
  assertPlanCalculationResult(result);
  return result;
}
