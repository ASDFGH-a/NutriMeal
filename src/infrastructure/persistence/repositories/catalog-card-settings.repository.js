import { readStoredValue, writeStoredValue } from '../storage.js';
import { normalizeCatalogCardSettings } from '../../../domain/catalog/catalog-card-settings.js';

export const CATALOG_CARD_SETTINGS_STORAGE_KEY = 'nutrition-catalog-card-settings';

export function createCatalogCardSettingsRepository(
  storage,
  { customRecipeCategories = [], logger = console } = {}
) {
  const defaultsForCurrentCategories = () => customRecipeCategories;

  return {
    load: () => normalizeCatalogCardSettings(
      readStoredValue(storage, CATALOG_CARD_SETTINGS_STORAGE_KEY, null, logger),
      defaultsForCurrentCategories()
    ),
    save: settings => writeStoredValue(
      storage,
      CATALOG_CARD_SETTINGS_STORAGE_KEY,
      settings,
      'Не удалось сохранить настройки отображения карточек',
      logger
    )
  };
}
