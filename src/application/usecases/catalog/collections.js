import {
  addCollectionItems as addItems,
  createCollection as makeCollection,
  removeCollectionItem as removeItem,
  renameCollection as rename
} from '../../../domain/catalog/collection.model.js';
import {
  assertCollectionArray,
  assertCollectionDeletionResult
} from '../../../contracts/catalog.contract.js';

export function createCollection(collections, name, id = `collection-${Date.now()}`) {
  assertCollectionArray(collections);
  if (collections.some((collection) => String(collection.id) === String(id))) {
    throw new Error(`Collection id "${id}" already exists.`);
  }
  return [...collections, makeCollection(id, name)];
}

export function renameCollection(collections, id, name) {
  assertCollectionArray(collections);
  let found = false;
  const updated = collections.map((collection) => {
    if (String(collection.id) !== String(id)) return collection;
    found = true;
    return rename(collection, name);
  });
  if (!found) throw new Error(`Collection "${id}" was not found.`);
  return updated;
}

export function addItemsToCollection(collections, collectionId, references) {
  assertCollectionArray(collections);
  let found = false;
  const updated = collections.map((collection) => {
    if (String(collection.id) !== String(collectionId)) return collection;
    found = true;
    return addItems(collection, references);
  });
  if (!found) throw new Error(`Collection "${collectionId}" was not found.`);
  return updated;
}

export function removeItemFromCollection(collections, collectionId, kind, id) {
  assertCollectionArray(collections);
  let found = false;
  const updated = collections.map((collection) => {
    if (String(collection.id) !== String(collectionId)) return collection;
    found = true;
    return removeItem(collection, kind, id);
  });
  if (!found) throw new Error(`Collection "${collectionId}" was not found.`);
  return updated;
}

export function deleteCollection(collections, id) {
  assertCollectionArray(collections);
  const index = collections.findIndex((collection) => String(collection.id) === String(id));
  if (index < 0) {
    return assertCollectionDeletionResult({ collections: [...collections], removed: null, index: -1 });
  }
  return assertCollectionDeletionResult({
    collections: collections.filter((_, itemIndex) => itemIndex !== index),
    removed: collections[index],
    index
  });
}
