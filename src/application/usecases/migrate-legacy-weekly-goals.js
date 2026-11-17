function hasGoals(groups = {}) {
  return Object.values(groups).some(group => group && typeof group === 'object' && Object.keys(group).length > 0);
}

export function migrateLegacyWeeklyGoals(plan, activeSet, saveNutritionSets = () => {}) {
  const legacy = plan?.personalWeeklyGoals;
  if (!activeSet || !hasGoals(legacy) || hasGoals(activeSet.personalWeeklyGoals)) return false;

  activeSet.personalWeeklyGoals = {
    completeness: { ...(legacy.completeness || {}) },
    frequency: { ...(legacy.frequency || {}) },
    diversity: { ...(legacy.diversity || {}) }
  };
  saveNutritionSets();
  return true;
}
