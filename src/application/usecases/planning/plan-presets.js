import { createPlanPresetSnapshot, normalizePlanData } from '../../../domain/planning/plan.model.js';
import {
  assertPlanPresetArray,
  assertPlanPresetMutationResult
} from '../../../contracts/planning.contract.js';

function normalizePresetName(name) {
  const normalized = String(name ?? '').trim();
  if (!normalized) throw new TypeError('Plan preset name is required.');
  if (normalized.length > 48) throw new RangeError('Plan preset name cannot exceed 48 characters.');
  return normalized;
}

export function savePlanPreset({
  presets,
  name,
  plan,
  id = `preset-${Date.now()}`,
  updatedAt = new Date().toISOString()
}) {
  assertPlanPresetArray(presets);
  if (id === undefined || id === null || id === '') throw new TypeError('Plan preset id is required.');

  const normalizedName = normalizePresetName(name);
  const existingIndex = presets.findIndex((preset) => (
    String(preset.name).toLocaleLowerCase('ru-RU') === normalizedName.toLocaleLowerCase('ru-RU')
  ));
  const existing = existingIndex >= 0 ? presets[existingIndex] : null;
  const preset = {
    id: existing ? existing.id : id,
    name: normalizedName,
    plan: createPlanPresetSnapshot(normalizePlanData(plan)),
    updatedAt
  };

  const nextPresets = [...presets];
  if (existing) nextPresets[existingIndex] = preset;
  else nextPresets.push(preset);
  return assertPlanPresetMutationResult({ presets: nextPresets, preset });
}

export function renamePlanPreset(presets, id, name, updatedAt = new Date().toISOString()) {
  assertPlanPresetArray(presets);
  const normalizedName = normalizePresetName(name);
  const index = presets.findIndex((preset) => String(preset.id) === String(id));
  if (index < 0) throw new Error(`Plan preset "${id}" was not found.`);
  const duplicate = presets.find((preset, presetIndex) => (
    presetIndex !== index
    && String(preset.name).toLocaleLowerCase('ru-RU') === normalizedName.toLocaleLowerCase('ru-RU')
  ));
  if (duplicate) throw new Error(`Plan preset name "${normalizedName}" already exists.`);

  const preset = { ...presets[index], name: normalizedName, updatedAt };
  const nextPresets = [...presets];
  nextPresets[index] = preset;
  return assertPlanPresetMutationResult({ presets: nextPresets, preset });
}

export function deletePlanPreset(presets, id) {
  assertPlanPresetArray(presets);
  const index = presets.findIndex((preset) => String(preset.id) === String(id));
  if (index < 0) {
    return assertPlanPresetMutationResult({ presets: [...presets], removed: null, index: -1 });
  }
  return assertPlanPresetMutationResult({
    presets: presets.filter((_, presetIndex) => presetIndex !== index),
    removed: presets[index],
    index
  });
}
