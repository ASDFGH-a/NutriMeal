import { createSeedCatalog } from '../../src/domain/catalog/catalog-seed.js';
import { createCoreRepositories } from '../../src/infrastructure/persistence/create-core-repositories.js';
import { initializeCoreData } from '../../src/application/services/initialize-core-data.js';

export function createCoreRepositoriesFromStorage(storage, products = createSeedCatalog().products) {
  return createCoreRepositories(storage, products);
}

export function createCoreDataDependencies(storage) {
  const catalog = createSeedCatalog();
  const repositories = createCoreRepositoriesFromStorage(storage, catalog.products);
  return { catalog, repositories };
}

export function initializeCoreDataFromStorage(storage) {
  return initializeCoreData(createCoreDataDependencies(storage));
}
