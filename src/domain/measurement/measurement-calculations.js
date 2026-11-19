export function measurementValue(name, values, measurements = []) {
  const source = values || Object.fromEntries(
    measurements.map((measurement) => [measurement.name, measurement.value])
  );
  const value = Number(source[name]);
  return Number.isFinite(value) && value > 0 ? value : null;
}

export function ratioPercent(numerator, denominator) {
  return numerator && denominator ? numerator / denominator * 100 : null;
}

export function measurementRatios(values, height) {
  const value = (name) => measurementValue(name, values);
  const average = (leftName, rightName) => {
    const left = value(leftName);
    const right = value(rightName);
    return left && right ? (left + right) / 2 : null;
  };
  const numericHeight = Number(height);
  const validHeight = Number.isFinite(numericHeight) && numericHeight > 0
    ? numericHeight
    : null;

  return {
    armToForearm: ratioPercent(
      average('Бицепс — левая рука', 'Бицепс — правая рука'),
      average('Предплечье — левая рука', 'Предплечье — правая рука')
    ),
    thighToCalf: ratioPercent(
      average('Бедро — левая нога', 'Бедро — правая нога'),
      average('Икра — левая нога', 'Икра — правая нога')
    ),
    shoulderToWaist: ratioPercent(value('Плечи'), value('Талия')),
    waistToHips: ratioPercent(value('Талия'), value('Бёдра')),
    waistToHeight: ratioPercent(value('Талия'), validHeight)
  };
}

export function symmetryDifference(left, right) {
  if (!left || !right) return null;
  return {
    cm: Math.abs(left - right),
    percent: Math.abs(left - right) / ((left + right) / 2) * 100
  };
}
