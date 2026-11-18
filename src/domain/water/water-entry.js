import { dateKey, isValidDateKey, todayLocalDate } from '../shared/date-utils.js';

export function createWaterEntry({ id, date, ml, today = dateKey(todayLocalDate()) }) {
  if (!isValidDateKey(date)) throw new TypeError('A valid water-entry date is required.');
  if (!isValidDateKey(today)) throw new TypeError('A valid current date is required.');
  if (date > today) throw new RangeError('Water cannot be added for a future date.');

  const amount = Number(ml);
  if (!Number.isInteger(amount) || amount < 1 || amount > 5000) {
    throw new RangeError('Water amount must be a whole number between 1 and 5000 ml.');
  }

  return { id, date, ml: amount };
}
