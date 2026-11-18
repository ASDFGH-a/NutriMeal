import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertDiaryMutationRequest,
  assertDiaryMutationResult
} from '../src/contracts/diary.contract.js';
import {
  assertMassEntryPreview,
  assertMassEntryRequest,
  assertMassEntryResult
} from '../src/contracts/mass-entry.contract.js';
import {
  assertDiaryStatisticsRequest,
  assertDiaryStatisticsResult
} from '../src/contracts/statistics.contract.js';
import {
  assertArrayRepositoryPort,
  assertKeyValueStoragePort,
  assertObjectRepositoryPort
} from '../src/contracts/storage.contract.js';
import {
  assertMeasurementHistoryRequest,
  assertMeasurementHistoryResult,
  assertWeightHistoryRequest,
  assertWeightHistoryResult
} from '../src/contracts/body-history.contract.js';
import {
  assertCollectionDeletionResult,
  assertCatalogCollections,
  assertCollectionArray,
  assertProductDeletionResult,
  assertProductSaveResult,
  assertRecipeSaveResult
} from '../src/contracts/catalog.contract.js';
import {
  assertPlanCalculationResult,
  assertPlanCalculationRequest,
  assertPlanPresetApplicationResult,
  assertPlanPresetArray,
  assertPlanPresetMutationResult
} from '../src/contracts/planning.contract.js';
import {
  assertActiveNutritionSetResult,
  assertActiveNutritionSetWriteRepository,
  assertNutritionSetDeletionResult,
  assertNutritionSetArray,
  assertNutritionSetMutationResult,
  assertNutritionSetWriteRepository
} from '../src/contracts/nutrition-set.contract.js';
import {
  assertWaterMutationRequest,
  assertWaterMutationResult,
  assertWaterRemovalResult
} from '../src/contracts/water.contract.js';

test('storage contracts define the required adapter and repository ports', () => {
  const storage = { getItem() {}, setItem() {} };
  const repository = { load() { return []; }, save() {} };
  assert.doesNotThrow(() => assertKeyValueStoragePort(storage));
  assert.doesNotThrow(() => assertArrayRepositoryPort(repository));
  assert.doesNotThrow(() => assertObjectRepositoryPort(repository));
  assert.throws(() => assertKeyValueStoragePort({ getItem() {} }), /getItem and setItem/);
  assert.throws(() => assertArrayRepositoryPort({ save() {} }), /load and save/);
});

test('diary contracts require a write port and an entries result', () => {
  assert.doesNotThrow(() => assertDiaryMutationRequest({
    entries: [],
    repository: { save() {} }
  }));
  assert.doesNotThrow(() => assertDiaryMutationResult({ entries: [] }));
  assert.throws(() => assertDiaryMutationRequest({
    entries: [],
    repository: {}
  }), /save method/);
  assert.throws(() => assertDiaryMutationResult({}), /entries array/);
});

test('mass-entry contracts constrain commands and preview/result shapes', () => {
  const request = { entries: [], dates: [], source: 'calories' };
  assert.equal(assertMassEntryRequest(request), request);
  assert.doesNotThrow(() => assertMassEntryPreview({
    dates: [],
    targetDates: [],
    skippedDates: [],
    daysToWrite: 0,
    entriesToWrite: 0,
    dailyTotals: { kcal: 0 },
    totalKcal: 0
  }));
  assert.doesNotThrow(() => assertMassEntryResult({
    entries: [],
    created: [],
    dates: [],
    skippedDates: []
  }));
  assert.throws(() => assertMassEntryRequest({ ...request, source: 'unknown' }), /source must be/);
  assert.throws(() => assertMassEntryPreview({}), /output contract/);
});

test('statistics contracts define the query and composed result boundary', () => {
  const request = {
    diaryEntries: [],
    waterEntries: [],
    weightHistory: [],
    measurementHistory: [],
    recipes: [],
    products: [],
    profile: {}
  };
  assert.equal(assertDiaryStatisticsRequest(request), request);
  assert.doesNotThrow(() => assertDiaryStatisticsResult({
    days: 1,
    startKey: '2026-11-17',
    endKey: '2026-11-17',
    dailyRows: [],
    averages: {},
    body: {}
  }));
  assert.throws(() => assertDiaryStatisticsRequest({ ...request, products: null }), /products must be an array/);
  assert.throws(() => assertDiaryStatisticsResult({}), /output contract/);
});

test('catalog, planning, nutrition-set, and water contracts validate their public inputs', () => {
  assert.doesNotThrow(() => assertCatalogCollections({ products: [], recipes: [] }));
  assert.doesNotThrow(() => assertCollectionArray([]));
  assert.doesNotThrow(() => assertPlanCalculationRequest({ profile: {}, plan: {} }));
  assert.doesNotThrow(() => assertPlanPresetArray([]));
  assert.doesNotThrow(() => assertNutritionSetArray([]));
  assert.doesNotThrow(() => assertNutritionSetWriteRepository({ save() {} }));
  assert.doesNotThrow(() => assertActiveNutritionSetWriteRepository({ save() {} }));
  assert.doesNotThrow(() => assertWaterMutationRequest({ entries: [], repository: { save() {} } }));
  assert.doesNotThrow(() => assertWaterMutationResult([]));

  assert.throws(() => assertCatalogCollections({ products: [], recipes: null }), /must be arrays/);
  assert.throws(() => assertCollectionArray(null), /Collections must be an array/);
  assert.throws(() => assertPlanCalculationRequest({ profile: null, plan: {} }), /Profile data is required/);
  assert.throws(() => assertPlanPresetArray(null), /Plan presets must be an array/);
  assert.throws(() => assertNutritionSetArray(null), /Nutrition sets must be an array/);
  assert.throws(() => assertNutritionSetWriteRepository({}), /nutrition sets repository/);
  assert.throws(() => assertActiveNutritionSetWriteRepository({}), /active nutrition set repository/);
  assert.throws(() => assertWaterMutationRequest({ entries: [], repository: {} }), /save method/);
});

test('catalog, planning, nutrition-set, and water contracts validate their outputs', () => {
  assert.doesNotThrow(() => assertProductSaveResult({
    status: 'confirmation-required',
    products: [],
    recipes: [],
    affectedRecipes: []
  }));
  assert.doesNotThrow(() => assertProductSaveResult({
    status: 'saved',
    product: {},
    products: [],
    recipes: [],
    recalculatedRecipeCount: 0
  }));
  assert.doesNotThrow(() => assertRecipeSaveResult({ recipe: {}, recipes: [] }));
  assert.doesNotThrow(() => assertProductDeletionResult({
    products: [],
    recipes: [],
    removed: {},
    index: 0
  }));
  assert.doesNotThrow(() => assertCollectionDeletionResult({
    collections: [],
    removed: null,
    index: -1
  }));
  assert.doesNotThrow(() => assertPlanCalculationResult({ plan: {}, targets: null }));
  assert.doesNotThrow(() => assertPlanPresetApplicationResult({
    preset: {},
    plan: {},
    targets: null
  }));
  assert.doesNotThrow(() => assertPlanPresetMutationResult({ presets: [], preset: {} }));
  assert.doesNotThrow(() => assertNutritionSetMutationResult({ set: {}, sets: [] }));
  assert.doesNotThrow(() => assertNutritionSetDeletionResult({
    sets: [],
    removed: null,
    index: -1,
    activeId: ''
  }));
  assert.equal(assertActiveNutritionSetResult('set-1'), 'set-1');

  assert.doesNotThrow(() => assertWaterRemovalResult({
    entries: [],
    removed: { id: 1 },
    index: 0
  }));
  assert.doesNotThrow(() => assertWaterRemovalResult({
    entries: [],
    removed: null,
    index: -1
  }));
  assert.throws(() => assertProductSaveResult({ status: 'unknown', products: [], recipes: [] }), /invalid status/);
  assert.throws(() => assertRecipeSaveResult({ recipes: [] }), /recipe and recipes array/);
  assert.throws(() => assertPlanCalculationResult({ plan: {} }), /incomplete/);
  assert.throws(() => assertNutritionSetMutationResult({ sets: [] }), /set and sets array/);
  assert.throws(() => assertWaterMutationResult(null), /entries array/);
  assert.throws(() => assertWaterRemovalResult({ entries: [], removed: null, index: 0 }), /index -1/);
  assert.throws(() => assertWaterRemovalResult({ entries: [], removed: { id: 1 }, index: 1 }), /remaining entries length/);
});

test('body-history contracts define persisted mutation requests and results', () => {
  const request = {
    history: [],
    historyRepository: { save() {} },
    profile: {},
    profileRepository: { save() {} }
  };
  assert.equal(assertWeightHistoryRequest(request), request);
  assert.equal(assertMeasurementHistoryRequest(request), request);
  assert.doesNotThrow(() => assertWeightHistoryResult({ history: [], profile: {} }));
  assert.doesNotThrow(() => assertMeasurementHistoryResult({
    history: [],
    measurements: [],
    profile: {}
  }));
  assert.throws(() => assertWeightHistoryRequest({ ...request, historyRepository: {} }), /weight-history repository/);
  assert.throws(() => assertMeasurementHistoryResult({ history: [], profile: {} }), /incomplete/);
  assert.throws(() => assertWeightHistoryResult({
    history: [],
    profile: {},
    removed: { date: '2026-11-17', weight: 64 }
  }), /valid index/);
  assert.throws(() => assertWeightHistoryResult({
    history: [],
    profile: {},
    removed: 'invalid',
    index: 0
  }), /removed record is invalid/);
  assert.throws(() => assertMeasurementHistoryResult({
    history: [],
    measurements: [],
    profile: {},
    removed: { date: '2026-11-17', values: [] },
    index: 0
  }), /removed record is invalid/);
  assert.throws(() => assertMeasurementHistoryResult({
    history: [],
    measurements: [],
    profile: {},
    removed: null,
    index: -2
  }), /valid index/);
  assert.doesNotThrow(() => assertWeightHistoryResult({
    history: [],
    profile: {},
    removed: null,
    index: 0
  }));
  assert.throws(() => assertWeightHistoryResult({
    history: [],
    profile: {},
    index: 0
  }), /valid index/);
});
