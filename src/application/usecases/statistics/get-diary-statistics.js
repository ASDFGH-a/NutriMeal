import { getActiveNutritionSet } from '../../../domain/nutrition-set/nutrition-set.model.js';
import {
  assertDiaryStatisticsRequest,
  assertDiaryStatisticsResult
} from '../../../contracts/statistics.contract.js';
import {
  calculateBodyStatistics,
  calculateDiaryStatistics,
  getDiaryStatisticsRange
} from '../../../domain/statistics/diary-statistics.js';
import { todayLocalDate } from '../../../domain/shared/date-utils.js';

/** @param {import('../../../contracts/statistics.contract.js').DiaryStatisticsRequest & {activeNutritionSetId?: string}} input */
export function getDiaryStatistics({
  diaryEntries,
  waterEntries,
  weightHistory,
  measurementHistory,
  recipes,
  products,
  profile,
  nutritionSets = [],
  activeNutritionSetId = '',
  activeNutritionSet,
  period = 'Неделя',
  periodEnd,
  customStart,
  customEnd,
  today = todayLocalDate()
}) {
  assertDiaryStatisticsRequest({
    diaryEntries,
    waterEntries,
    weightHistory,
    measurementHistory,
    recipes,
    products,
    profile,
    nutritionSets,
    activeNutritionSetId,
    activeNutritionSet,
    period,
    periodEnd,
    customStart,
    customEnd,
    today
  });
  const range = getDiaryStatisticsRange({
    period,
    periodEnd,
    customStart,
    customEnd,
    today
  });
  const selectedSet = activeNutritionSet || getActiveNutritionSet(nutritionSets, activeNutritionSetId);
  const nutrition = calculateDiaryStatistics({
    diaryEntries,
    waterEntries,
    products,
    recipes,
    profile,
    activeNutritionSet: selectedSet,
    startKey: range.startKey,
    endKey: range.endKey,
    referenceDate: today
  });
  const body = calculateBodyStatistics({
    weightHistory,
    measurementHistory,
    startKey: range.startKey,
    endKey: range.endKey
  });
  return assertDiaryStatisticsResult({ ...nutrition, body });
}
