/**
 * Small persistence adapter. The storage implementation is injected so domain
 * and application modules do not depend on the browser's global localStorage.
 */
export function readStoredArray(storage, key) {
  try {
    const value = JSON.parse(storage.getItem(key) || 'null');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

export function writeStoredArray(storage, key, value, warningMessage, logger = console) {
  try {
    storage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    logger?.warn?.(warningMessage, error);
    return false;
  }
}

export function readStoredValue(storage, key, fallback = null, logger = console) {
  try {
    const raw = storage.getItem(key);
    return raw == null || raw === '' ? fallback : JSON.parse(raw);
  } catch (error) {
    logger?.warn?.(`Не удалось прочитать данные: ${key}`, error);
    return fallback;
  }
}

export function writeStoredValue(storage, key, value, warningMessage, logger = console) {
  try {
    storage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    logger?.warn?.(warningMessage, error);
    return false;
  }
}
