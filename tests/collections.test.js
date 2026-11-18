import assert from 'node:assert/strict';
import test from 'node:test';
import {
  addItemsToCollection,
  createCollection,
  deleteCollection,
  removeItemFromCollection,
  renameCollection
} from '../src/application/usecases/catalog/collections.js';
import {
  resolveCollectionItem,
  toggleFavorite
} from '../src/domain/catalog/collection.model.js';

test('collections validate names and keep item references unique by type and id', () => {
  let collections = createCollection([], '  Завтраки  ', 'c1');
  collections = addItemsToCollection(collections, 'c1', [
    { kind: 'recipe', id: '1' },
    { kind: 'recipe', id: 1 },
    { kind: 'product', id: 1 }
  ]);

  assert.deepEqual(collections[0], {
    id: 'c1',
    name: 'Завтраки',
    items: [{ kind: 'recipe', id: 1 }, { kind: 'product', id: '1' }]
  });
  assert.throws(() => createCollection([], '  ', 'c2'), /name is required/);
  assert.throws(() => createCollection([], 'x'.repeat(61), 'c2'), /60 characters/);
});

test('collection operations preserve referenced catalog items and return deletion data', () => {
  let collections = createCollection([], 'Рецепты', 'c1');
  collections = addItemsToCollection(collections, 'c1', [
    { kind: 'recipe', id: 1 },
    { kind: 'product', id: 'oat' }
  ]);
  const recipes = [{ id: 1, name: 'Каша' }];
  const products = [{ id: 'oat', name: 'Овсянка' }];

  assert.equal(resolveCollectionItem(collections[0].items[0], recipes, products), recipes[0]);
  assert.equal(resolveCollectionItem(collections[0].items[1], recipes, products), products[0]);

  collections = removeItemFromCollection(collections, 'c1', 'recipe', '1');
  assert.deepEqual(collections[0].items, [{ kind: 'product', id: 'oat' }]);
  assert.equal(recipes.length, 1);
  assert.equal(products.length, 1);

  collections = renameCollection(collections, 'c1', 'Избранное');
  const deleted = deleteCollection(collections, 'c1');
  assert.equal(deleted.removed.name, 'Избранное');
  assert.equal(deleted.index, 0);
  assert.deepEqual(deleted.collections, []);
});

test('favorite toggle returns a changed copy and leaves the source item untouched', () => {
  const item = { id: 1, favorite: false };
  const toggled = toggleFavorite(item);

  assert.equal(toggled.favorite, true);
  assert.equal(item.favorite, false);
  assert.equal(toggleFavorite(toggled).favorite, false);
});
