import { normalizeCatalogCardSettings } from '../../../domain/catalog/catalog-card-settings.js';
import { createObjectRepository } from '../storage.js';

export const CATALOG_CARD_SETTINGS_STORAGE_KEY = 'nutrition-catalog-card-settings';

export function createCatalogCardSettingsRepository(storage, options = {}) {
  const normalize = (settings) => normalizeCatalogCardSettings(settings, options);
  return createObjectRepository(storage, CATALOG_CARD_SETTINGS_STORAGE_KEY, normalize);
}
