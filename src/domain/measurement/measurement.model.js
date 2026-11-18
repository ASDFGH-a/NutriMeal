import { dateKey, isValidDateKey, todayLocalDate } from '../shared/date-utils.js';

export const MEASUREMENT_DEFINITIONS = Object.freeze([
  { name: 'Плечи', group: 'Верхняя часть тела' },
  { name: 'Грудь', group: 'Верхняя часть тела' },
  { name: 'Талия', group: 'Талия и таз' },
  { name: 'Живот', group: 'Талия и таз' },
  { name: 'Бёдра', group: 'Талия и таз' },
  { name: 'Бицепс — левая рука', group: 'Руки' },
  { name: 'Бицепс — правая рука', group: 'Руки' },
  { name: 'Предплечье — левая рука', group: 'Руки' },
  { name: 'Предплечье — правая рука', group: 'Руки' },
  { name: 'Бедро — левая нога', group: 'Ноги' },
  { name: 'Бедро — правая нога', group: 'Ноги' },
  { name: 'Икра — левая нога', group: 'Ноги' },
  { name: 'Икра — правая нога', group: 'Ноги' }
]);

export function getLatestMeasurementRecord(records) {
  if (!Array.isArray(records)) throw new TypeError('Measurement history must be an array.');
  return records
    .filter((record) => (
      record
      && isValidDateKey(record.date)
      && record.values
      && typeof record.values === 'object'
      && !Array.isArray(record.values)
    ))
    .slice()
    .sort((left, right) => right.date.localeCompare(left.date))[0] || null;
}

export function getCurrentMeasurementValues(records) {
  const latest = getLatestMeasurementRecord(records);
  return MEASUREMENT_DEFINITIONS.map((measurement) => ({
    ...measurement,
    value: latest?.values?.[measurement.name] ?? null
  }));
}

export function getMeasurementProfileHeight(records) {
  const latest = getLatestMeasurementRecord(records);
  const height = Number(latest?.values?.height);
  return Number.isFinite(height) && height >= 80 && height <= 250 ? height : null;
}

export function createMeasurementSnapshot({ date, values, today = dateKey(todayLocalDate()) }) {
  if (!isValidDateKey(date)) throw new TypeError('A valid measurement date is required.');
  if (!isValidDateKey(today)) throw new TypeError('A valid current date is required.');
  if (date > today) throw new RangeError('Measurement date cannot be in the future.');
  if (!values || typeof values !== 'object' || Array.isArray(values)) {
    throw new TypeError('Measurement values are required.');
  }
  const height = Number(values.height);
  if (!Number.isFinite(height) || height < 80 || height > 250) {
    throw new RangeError('Height must be between 80 and 250 cm.');
  }
  for (const [name, value] of Object.entries(values)) {
    if (name === 'height' || value === null) continue;
    const number = Number(value);
    if (!Number.isFinite(number) || number <= 0 || number > 300) {
      throw new RangeError(`Measurement "${name}" must be between 0 and 300 cm.`);
    }
  }
  return { date, values: { ...values, height } };
}

function sortMeasurementHistory(records) {
  return records.slice().sort((left, right) => right.date.localeCompare(left.date));
}

export function upsertMeasurementHistory(records, snapshot) {
  if (!Array.isArray(records)) throw new TypeError('Measurement history must be an array.');
  const history = records.map((record) => ({
    ...record,
    values: record.values && typeof record.values === 'object' && !Array.isArray(record.values)
      ? { ...record.values }
      : record.values
  }));
  const index = history.findIndex((record) => record.date === snapshot.date);
  if (index >= 0) history[index] = snapshot;
  else history.push(snapshot);
  return sortMeasurementHistory(history);
}

export function removeMeasurementHistoryRecord(records, date) {
  if (!Array.isArray(records)) throw new TypeError('Measurement history must be an array.');
  const history = records.slice();
  const index = history.findIndex((record) => record.date === date);
  if (index < 0) return { history, removed: null, index: -1 };
  const [removed] = history.splice(index, 1);
  return { history: sortMeasurementHistory(history), removed, index };
}

export function restoreMeasurementHistoryRecord(records, snapshot) {
  if (!Array.isArray(records)) throw new TypeError('Measurement history must be an array.');
  if (records.some((record) => record.date === snapshot.date)) return sortMeasurementHistory(records);
  return sortMeasurementHistory([...records, snapshot]);
}
