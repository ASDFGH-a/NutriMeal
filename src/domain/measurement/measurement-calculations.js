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

export function symmetryDifference(left, right) {
  if (!left || !right) return null;
  return {
    cm: Math.abs(left - right),
    percent: Math.abs(left - right) / ((left + right) / 2) * 100
  };
}
