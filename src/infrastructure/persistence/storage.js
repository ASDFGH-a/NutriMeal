import {
  assertArrayRepositoryPort,
  assertKeyValueStoragePort,
  assertObjectRepositoryPort
} from '../../contracts/storage.contract.js';

export function createArrayRepository(storage, key) {
  assertKeyValueStoragePort(storage);
  if (typeof key !== 'string' || key.length === 0) {
    throw new TypeError('A non-empty storage key is required.');
  }

  const repository = {
    load() {
      const serialized = storage.getItem(key);
      if (serialized === null) return [];

      const value = JSON.parse(serialized);
      return Array.isArray(value) ? value : [];
    },
    save(records) {
      if (!Array.isArray(records)) {
        throw new TypeError(`Data for "${key}" must be an array.`);
      }

      storage.setItem(key, JSON.stringify(records));
    }
  };
  assertArrayRepositoryPort(repository);
  return repository;
}

export function createObjectRepository(storage, key, normalize) {
  assertKeyValueStoragePort(storage);
  if (typeof key !== 'string' || key.length === 0) {
    throw new TypeError('A non-empty storage key is required.');
  }
  if (typeof normalize !== 'function') {
    throw new TypeError('An object normalizer is required.');
  }

  const repository = {
    load() {
      const serialized = storage.getItem(key);
      if (serialized === null) return normalize({});

      const value = JSON.parse(serialized);
      if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw new TypeError(`Data for "${key}" must be an object.`);
      }
      return normalize(value);
    },
    save(record) {
      if (!record || typeof record !== 'object' || Array.isArray(record)) {
        throw new TypeError(`Data for "${key}" must be an object.`);
      }

      storage.setItem(key, JSON.stringify(normalize(record)));
    }
  };
  assertObjectRepositoryPort(repository);
  return repository;
}
