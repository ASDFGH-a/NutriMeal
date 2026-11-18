export function macrosFor(entries) {
  return entries.reduce((totals, entry) => ({
    kcal: totals.kcal + (Number(entry.kcal) || 0),
    p: totals.p + (Number(entry.p) || 0),
    f: totals.f + (Number(entry.f) || 0),
    c: totals.c + (Number(entry.c) || 0)
  }), { kcal: 0, p: 0, f: 0, c: 0 });
}

export function isCalorieOnlyEntry(entry) {
  return Boolean(entry?.calorieOnly === true || entry?.quantityMode === 'calorie-only');
}

export function isNutritionSetAverageEntry(entry) {
  return Boolean(entry?.isNutritionSetAverage === true || entry?.quantityMode === 'set-average');
}

export function isMassSystemEntry(entry) {
  return isCalorieOnlyEntry(entry) || isNutritionSetAverageEntry(entry);
}
