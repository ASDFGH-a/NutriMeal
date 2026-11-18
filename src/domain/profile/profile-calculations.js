function formatWeight(value) {
  return value.toFixed(1).replace('.', ',');
}

export function weightGoalStatus(profile, plan) {
  const current = Number(profile.currentWeight) || 0;
  const target = Number(plan.targetWeight) || 0;
  const difference = Math.abs(target - current);
  const amount = formatWeight(difference);

  if (plan.goal === 'Поддержание веса') {
    const delta = current - target;
    return {
      label: 'Поддержание веса',
      note: difference < 0.05
        ? 'Целевой вес соблюдается'
        : `Отклонение от цели: ${delta > 0 ? '+' : ''}${formatWeight(delta)} кг`
    };
  }

  if (difference < 0.05) return { label: 'Целевой вес достигнут', note: '' };
  if (plan.goal === 'Набор веса' || plan.goal === 'Набор массы') {
    return target > current
      ? { label: `Осталось набрать ${amount} кг`, note: '' }
      : { label: 'Проверь целевой вес', note: 'Для набора целевой вес должен быть выше текущего' };
  }
  if (plan.goal === 'Снижение веса' || plan.goal === 'Снижение жировой массы' || plan.goal === 'Сушка') {
    return target < current
      ? { label: `Осталось снизить ${amount} кг`, note: '' }
      : { label: 'Проверь целевой вес', note: 'Для снижения целевой вес должен быть ниже текущего' };
  }
  return target > current
    ? { label: `Осталось набрать ${amount} кг`, note: '' }
    : { label: `Осталось снизить ${amount} кг`, note: '' };
}

export function bmiSummary(profile) {
  const height = Number(profile.height) / 100;
  const weight = Number(profile.currentWeight);
  if (!height || !weight) return { value: '—', label: 'Укажи рост и вес' };

  const bmi = weight / (height * height);
  let label;
  if (bmi < 18.5) label = 'Ниже нормы';
  else if (bmi < 25) label = 'Нормальный диапазон';
  else if (bmi < 30) label = 'Выше нормы';
  else if (bmi < 35) label = 'Ожирение I степени';
  else if (bmi < 40) label = 'Ожирение II степени';
  else label = 'Ожирение III степени';

  return { value: bmi.toFixed(1).replace('.', ','), label };
}
