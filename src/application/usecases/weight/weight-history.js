import {
  assertWeightHistoryRequest,
  assertWeightHistoryResult
} from '../../../contracts/body-history.contract.js';
import {
  createWeightRecord,
  normalizeWeightHistory,
  removeWeightHistoryRecord,
  replaceWeightHistoryRecord,
  restoreWeightHistoryRecord,
  upsertWeightHistory
} from '../../../domain/weight/weight-history.js';
import { dateKey, todayLocalDate } from '../../../domain/shared/date-utils.js';

function saveWeightState(history, profile, historyRepository, profileRepository) {
  const nextProfile = history.length
    ? { ...profile, currentWeight: history[0].weight }
    : { ...profile };
  historyRepository.save(history);
  profileRepository.save(nextProfile);
  return { history, profile: nextProfile };
}

function prepareRequest(input) {
  assertWeightHistoryRequest(input);
  return {
    ...input,
    history: normalizeWeightHistory(input.history),
    today: input.today || dateKey(todayLocalDate())
  };
}

export function saveWeightRecord(input) {
  const request = prepareRequest(input);
  const record = createWeightRecord({
    weight: request.weight,
    date: request.date,
    today: request.today
  });
  const history = request.previousDate
    ? replaceWeightHistoryRecord(request.history, request.previousDate, record)
    : upsertWeightHistory(request.history, record);
  return assertWeightHistoryResult(saveWeightState(
    history,
    request.profile,
    request.historyRepository,
    request.profileRepository
  ));
}

export function deleteWeightRecord(input) {
  const request = prepareRequest(input);
  const result = removeWeightHistoryRecord(request.history, request.date);
  if (!result.removed) {
    return assertWeightHistoryResult({
      history: result.history,
      profile: { ...request.profile },
      removed: null,
      index: result.index
    });
  }
  const state = saveWeightState(
    result.history,
    request.profile,
    request.historyRepository,
    request.profileRepository
  );
  return assertWeightHistoryResult({ ...state, removed: result.removed, index: result.index });
}

export function restoreWeightRecord(input) {
  const request = prepareRequest(input);
  const record = createWeightRecord({
    weight: request.record?.weight,
    date: request.record?.date,
    today: request.today
  });
  const history = restoreWeightHistoryRecord(request.history, record);
  if (history.length === request.history.length
    && history.every((item, index) => item.date === request.history[index].date
      && item.weight === request.history[index].weight)) {
    return assertWeightHistoryResult({ history, profile: { ...request.profile } });
  }
  return assertWeightHistoryResult(saveWeightState(
    history,
    request.profile,
    request.historyRepository,
    request.profileRepository
  ));
}
