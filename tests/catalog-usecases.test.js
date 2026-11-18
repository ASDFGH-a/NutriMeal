import assert from 'node:assert/strict';
import test from 'node:test';
import { createSeedCatalog } from '../src/domain/catalog/catalog-seed.js';
import { deleteProduct } from '../src/application/usecases/catalog/delete-product.js';
import { saveProduct } from '../src/application/usecases/catalog/save-product.js';
import { saveRecipe } from '../src/application/usecases/catalog/save-recipe.js';

test('recipe creation calculates nutrition and inherits ingredient allergens', () => {
  const { recipes, products } = createSeedCatalog();
  const result = saveRecipe({
    recipes,
    products,
    draft: {
      name: '  Молочный перекус  ',
      time: 5,
      totalWeight: 100,
      portionGrams: 50,
      ingredientItems: [{ productId: 'milk', grams: 100 }],
      components: [],
      allergens: [],
      steps: [' Смешать ', '', 'Подать']
    }
  });

  assert.equal(result.recipe.id, 7);
  assert.equal(result.recipe.name, 'Молочный перекус');
  assert.equal(result.recipe.kcal, 52);
  assert.deepEqual(result.recipe.allergens, ['Молоко']);
  assert.deepEqual(result.recipe.steps, ['Смешать', 'Подать']);
  assert.equal(result.recipes[0], result.recipe);
  assert.equal(recipes.length, 6);
});

test('product density changes require confirmation and recalculate linked recipe macros', () => {
  const { products } = createSeedCatalog();
  const milk = products.find((product) => product.id === 'milk');
  const recipes = [{
    id: 20,
    name: 'Тестовый рецепт',
    totalWeight: 100,
    portionGrams: 100,
    ingredientItems: [{ productId: 'milk', amount: 100, unit: 'мл' }],
    kcal: 0,
    p: 0,
    f: 0,
    c: 0
  }];
  const productData = { ...milk, density: 1.03 };

  const pending = saveProduct({ products, recipes, productData, existingId: 'milk' });
  assert.equal(pending.status, 'confirmation-required');
  assert.deepEqual(pending.affectedRecipes, [{ id: 20, name: 'Тестовый рецепт' }]);
  assert.equal(milk.density, undefined);
  assert.equal(recipes[0].kcal, 0);

  const saved = saveProduct({
    products,
    recipes,
    productData,
    existingId: 'milk',
    confirmDensityChange: true
  });
  assert.equal(saved.status, 'saved');
  assert.equal(saved.product.density, 1.03);
  assert.equal(saved.recalculatedRecipeCount, 1);
  assert.ok(saved.recipes[0].kcal > 53);
  assert.equal(recipes[0].kcal, 0);
});

test('product deletion preserves dependent recipe references and snapshots product metadata', () => {
  const { products } = createSeedCatalog();
  const recipe = {
    id: 1,
    ingredientItems: [{ productId: 'milk', grams: 250 }]
  };
  const result = deleteProduct({ products, recipes: [recipe], productId: 'milk' });

  assert.equal(result.products.some((product) => product.id === 'milk'), false);
  assert.equal(result.recipes.length, 1);
  assert.deepEqual(result.recipes[0].ingredientItems[0], {
    productId: 'milk',
    grams: 250,
    productName: 'Молоко 2,5%',
    productAllergens: ['Молоко']
  });
  assert.equal(recipe.ingredientItems[0].productName, undefined);
  assert.equal(result.removed.id, 'milk');
});

test('recipe save rejects missing catalog ingredients and unit conversion without density', () => {
  const { products } = createSeedCatalog();

  assert.throws(() => saveRecipe({
    recipes: [],
    products,
    draft: {
      name: 'Без продукта',
      totalWeight: 100,
      portionGrams: 100,
      ingredientItems: [{ productId: 'missing', amount: 10 }]
    }
  }), /catalog product/);

  assert.throws(() => saveRecipe({
    recipes: [],
    products,
    draft: {
      name: 'Без плотности',
      totalWeight: 100,
      portionGrams: 100,
      ingredientItems: [{ productId: 'milk', amount: 10, unit: 'мл' }]
    }
  }), /needs density/);
});
