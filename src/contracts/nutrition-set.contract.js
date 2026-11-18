export function assertNutritionSetArray(sets) {
  if (!Array.isArray(sets)) throw new TypeError('Nutrition sets must be an array.');
  return sets;
}

export function assertNutritionSetWriteRepository(repository) {
  if (!repository || typeof repository.save !== 'function') {
    throw new TypeError('A nutrition sets repository is required.');
  }
  return repository;
}

export function assertActiveNutritionSetWriteRepository(repository) {
  if (!repository || typeof repository.save !== 'function') {
    throw new TypeError('An active nutrition set repository is required.');
  }
  return repository;
}

export function assertNutritionSetMutationResult(result) {
  if (!result || typeof result !== 'object' || Array.isArray(result)
    || !result.set || typeof result.set !== 'object' || !Array.isArray(result.sets)) {
    throw new TypeError('Nutrition set mutation result must include a set and sets array.');
  }
  return result;
}

export function assertNutritionSetDeletionResult(result) {
  if (!result || typeof result !== 'object' || Array.isArray(result)
    || !Array.isArray(result.sets) || !Number.isInteger(result.index)
    || typeof result.activeId !== 'string') {
    throw new TypeError('Nutrition set deletion result is incomplete.');
  }
  return result;
}

export function assertActiveNutritionSetResult(id) {
  if (typeof id !== 'string' || id.length === 0) {
    throw new TypeError('Active nutrition set result must be a non-empty id.');
  }
  return id;
}
