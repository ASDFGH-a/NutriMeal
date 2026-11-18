import assert from 'node:assert/strict';
import test from 'node:test';
import { createCatalogServices } from '../src/application/services/catalog-services.js';
import { createSeedCatalog } from '../src/domain/catalog/catalog-seed.js';

test('catalog service routes recipe and product edits through catalog use cases', () => {
  const services = createCatalogServices();
  const { products, recipes } = createSeedCatalog();
  const milk = products.find((product) => product.id === 'milk');

  const recipeResult = services.saveRecipe({
    recipes,
    products,
    draft: {
      name: 'Тестовый перекус',
      totalWeight: 100,
      portionGrams: 50,
      ingredientItems: [{ productId: 'milk', amount: 100, unit: 'г' }],
      components: [],
      steps: []
    }
  });
  assert.equal(recipeResult.recipe.name, 'Тестовый перекус');
  assert.equal(recipes.length, 6);

  const productResult = services.saveProduct({
    products,
    recipes,
    productData: { ...milk, name: 'Молоко обновлённое' },
    existingId: milk.id
  });
  assert.equal(productResult.status, 'saved');
  assert.equal(productResult.product.name, 'Молоко обновлённое');
  assert.equal(products.find((product) => product.id === 'milk').name, milk.name);
});

test('catalog service supports reversible product and collection deletion and favorites', () => {
  const services = createCatalogServices();
  const { products, recipes } = createSeedCatalog();
  const milkIndex = products.findIndex((product) => product.id === 'milk');
  const deletion = services.deleteProduct({ products, recipes, productId: 'milk' });
  const restoredProduct = services.restoreProduct({
    products: deletion.products,
    recipes: deletion.recipes,
    product: deletion.removed,
    index: deletion.index
  });
  assert.equal(restoredProduct.products[milkIndex].id, 'milk');
  assert.throws(() => services.restoreProduct({
    products: restoredProduct.products,
    recipes: restoredProduct.recipes,
    product: deletion.removed,
    index: deletion.index
  }), /already exists/);

  let collections = services.createCollection([], 'Завтраки', 'c1');
  collections = services.addItemsToCollection(collections, 'c1', [
    { kind: 'recipe', id: 1 },
    { kind: 'product', id: 'milk' }
  ]);
  collections = services.removeItemFromCollection(collections, 'c1', 'recipe', '1');
  collections = services.renameCollection(collections, 'c1', 'Утро');
  const deletedCollection = services.deleteCollection(collections, 'c1');
  collections = services.restoreCollection(
    deletedCollection.collections,
    deletedCollection.removed,
    deletedCollection.index
  );
  assert.deepEqual(collections[0], {
    id: 'c1',
    name: 'Утро',
    items: [{ kind: 'product', id: 'milk' }]
  });
  assert.throws(() => services.restoreCollection(collections, deletedCollection.removed, 0), /already exists/);

  const toggled = services.toggleFavorite(products[0]);
  assert.equal(toggled.favorite, !products[0].favorite);
  assert.equal(products[0].favorite, false);
});
