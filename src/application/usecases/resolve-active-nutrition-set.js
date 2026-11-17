export function resolveActiveNutritionSetId(sets, storedId = '', saveActiveId = () => {}) {
  if (!Array.isArray(sets) || sets.length === 0) return '';
  const resolved = sets.some(item => String(item.id) === String(storedId))
    ? String(storedId)
    : String(sets[0].id);
  if (resolved !== String(storedId || '')) saveActiveId(resolved);
  return resolved;
}
