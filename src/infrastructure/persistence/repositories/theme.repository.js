import { assertKeyValueStoragePort } from '../../../contracts/storage.contract.js';

export const THEME_STORAGE_KEY = 'nutrition-theme';

export function createThemeRepository(storage) {
  assertKeyValueStoragePort(storage);

  return {
    load() {
      return storage.getItem(THEME_STORAGE_KEY) === 'dark' ? 'dark' : 'light';
    },
    save(theme) {
      if (theme !== 'light' && theme !== 'dark') {
        throw new TypeError('Theme must be "light" or "dark".');
      }
      storage.setItem(THEME_STORAGE_KEY, theme);
    }
  };
}
