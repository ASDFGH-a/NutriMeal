/**
 * @typedef {Object} KeyValueStoragePort
 * @property {(key: string) => string | null} getItem
 * @property {(key: string, value: string) => void} setItem
 */

/**
 * @typedef {Object} ArrayRepositoryPort
 * @property {() => unknown[]} load
 * @property {(records: unknown[]) => void} save
 */

/** @param {KeyValueStoragePort} storage */
export function assertKeyValueStoragePort(storage) {
  if (!storage || typeof storage.getItem !== 'function' || typeof storage.setItem !== 'function') {
    throw new TypeError('Storage must provide getItem and setItem methods.');
  }
}

/** @param {ArrayRepositoryPort} repository */
export function assertArrayRepositoryPort(repository) {
  if (!repository || typeof repository.load !== 'function' || typeof repository.save !== 'function') {
    throw new TypeError('An array repository must provide load and save methods.');
  }
}

/**
 * @typedef {Object} ObjectRepositoryPort
 * @property {() => Object} load
 * @property {(record: Object) => void} save
 */

/** @param {ObjectRepositoryPort} repository */
export function assertObjectRepositoryPort(repository) {
  if (!repository || typeof repository.load !== 'function' || typeof repository.save !== 'function') {
    throw new TypeError('An object repository must provide load and save methods.');
  }
}
