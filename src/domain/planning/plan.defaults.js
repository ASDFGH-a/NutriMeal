export function createDefaultPlan() {
  return {
    goal: 'Поддержание веса',
    targetWeight: 65,
    kcal: 2200,
    p: 110,
    f: 70,
    c: 275,
    energyAdjustment: 0,
    proteinPerKg: null,
    fatPercent: 30,
    personalWeeklyGoals: {
      completeness: {},
      frequency: {},
      diversity: {}
    }
  };
}
