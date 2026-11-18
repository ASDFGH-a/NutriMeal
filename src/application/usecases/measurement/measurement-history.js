import {
  assertMeasurementHistoryRequest,
  assertMeasurementHistoryResult
} from '../../../contracts/body-history.contract.js';
import {
  createMeasurementSnapshot,
  getCurrentMeasurementValues,
  getMeasurementProfileHeight,
  removeMeasurementHistoryRecord,
  restoreMeasurementHistoryRecord,
  upsertMeasurementHistory
} from '../../../domain/measurement/measurement.model.js';
import { dateKey, todayLocalDate } from '../../../domain/shared/date-utils.js';

function prepareRequest(input) {
  assertMeasurementHistoryRequest(input);
  return { ...input, today: input.today || dateKey(todayLocalDate()) };
}

function saveMeasurementState(history, profile, historyRepository, profileRepository) {
  const height = getMeasurementProfileHeight(history);
  const nextProfile = height === null ? { ...profile } : { ...profile, height };
  historyRepository.save(history);
  profileRepository.save(nextProfile);
  return {
    history,
    measurements: getCurrentMeasurementValues(history),
    profile: nextProfile
  };
}

export function saveMeasurementSnapshot(input) {
  const request = prepareRequest(input);
  const snapshot = createMeasurementSnapshot({
    date: request.date,
    values: request.values,
    today: request.today
  });
  const history = upsertMeasurementHistory(request.history, snapshot);
  return assertMeasurementHistoryResult(saveMeasurementState(
    history,
    request.profile,
    request.historyRepository,
    request.profileRepository
  ));
}

export function deleteMeasurementSnapshot(input) {
  const request = prepareRequest(input);
  const result = removeMeasurementHistoryRecord(request.history, request.date);
  if (!result.removed) {
    return assertMeasurementHistoryResult({
      history: result.history,
      measurements: getCurrentMeasurementValues(result.history),
      profile: { ...request.profile },
      removed: null,
      index: result.index
    });
  }
  const state = saveMeasurementState(
    result.history,
    request.profile,
    request.historyRepository,
    request.profileRepository
  );
  return assertMeasurementHistoryResult({ ...state, removed: result.removed, index: result.index });
}

export function restoreMeasurementSnapshot(input) {
  const request = prepareRequest(input);
  const snapshot = createMeasurementSnapshot({
    date: request.snapshot?.date,
    values: request.snapshot?.values,
    today: request.today
  });
  const history = restoreMeasurementHistoryRecord(request.history, snapshot);
  if (history.length === request.history.length
    && history.every((item, index) => item.date === request.history[index].date)) {
    return assertMeasurementHistoryResult({
      history,
      measurements: getCurrentMeasurementValues(history),
      profile: { ...request.profile }
    });
  }
  return assertMeasurementHistoryResult(saveMeasurementState(
    history,
    request.profile,
    request.historyRepository,
    request.profileRepository
  ));
}
