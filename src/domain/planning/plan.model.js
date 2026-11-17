export const DEFAULT_PERSONAL_WEEKLY_GOALS = Object.freeze({
  completeness: {},
  frequency: {},
  diversity: {}
});

export const DEFAULT_PLAN = Object.freeze({
  goal: 'Поддержание веса',
  targetWeight: 65,
  kcal: 2200,
  p: 110,
  f: 70,
  c: 275,
  energyAdjustment: 0,
  proteinPerKg: null,
  fatPercent: 30,
  personalWeeklyGoals: DEFAULT_PERSONAL_WEEKLY_GOALS
});

export function normalizeGoalLabel(goal) {
  if (['Набор массы', 'Набор веса'].includes(goal)) return 'Набор веса';
  if (['Снижение жировой массы', 'Сушка', 'Снижение веса'].includes(goal)) return 'Снижение веса';
  return 'Поддержание веса';
}

export function defaultGoalAdjustment(goal) {
  const label = normalizeGoalLabel(goal);
  return label === 'Снижение веса' ? -400 : label === 'Набор веса' ? 300 : 0;
}
