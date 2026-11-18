import { dateKey, isValidDateKey, todayLocalDate } from '../shared/date-utils.js';

function sortWeightHistory(records) {
  return records.slice().sort((left, right) => right.date.localeCompare(left.date));
}

export function createWeightRecord({ weight, date, today = dateKey(todayLocalDate()) }) {
  if (!isValidDateKey(date)) throw new TypeError('A valid weight date is required.');
  if (!isValidDateKey(today)) throw new TypeError('A valid current date is required.');
  if (date > today) throw new RangeError('Weight date cannot be in the future.');
  const value = Number(weight);
  if (!Number.isFinite(value) || value <= 0 || value > 500) {
    throw new RangeError('Weight must be greater than 0 and no more than 500 kg.');
  }
  return { date, weight: value };
}

export function normalizeWeightHistory(records) {
  if (!Array.isArray(records)) throw new TypeError('Weight history must be an array.');
  return sortWeightHistory(records
    .filter((record) => (
      record
      && isValidDateKey(record.date)
      && Number.isFinite(Number(record.weight))
      && Number(record.weight) > 0
    ))
    .map((record) => ({ date: record.date, weight: Number(record.weight) })));
}

export function upsertWeightHistory(records, record) {
  const history = normalizeWeightHistory(records);
  const index = history.findIndex((item) => item.date === record.date);
  if (index >= 0) history[index] = record;
  else history.push(record);
  return sortWeightHistory(history);
}

export function replaceWeightHistoryRecord(records, previousDate, record) {
  const history = normalizeWeightHistory(records);
  const index = history.findIndex((item) => item.date === previousDate);
  if (index < 0) throw new Error(`Weight record "${previousDate}" was not found.`);
  if (history.some((item, itemIndex) => itemIndex !== index && item.date === record.date)) {
    throw new Error(`A weight record already exists for "${record.date}".`);
  }
  history[index] = record;
  return sortWeightHistory(history);
}

export function removeWeightHistoryRecord(records, date) {
  const history = normalizeWeightHistory(records);
  const index = history.findIndex((record) => record.date === date);
  if (index < 0 || history.length <= 1) {
    return { history, removed: null, index: index < 0 ? -1 : index };
  }
  const [removed] = history.splice(index, 1);
  return { history: sortWeightHistory(history), removed, index };
}

export function restoreWeightHistoryRecord(records, record) {
  const history = normalizeWeightHistory(records);
  if (history.some((item) => item.date === record.date)) return history;
  return sortWeightHistory([...history, record]);
}
