import assert from 'node:assert/strict';
import test from 'node:test';
import '../src/ui/modals/catalog-modals.js';

const escapeHtml = (value) => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

test('recipe detail modal renders nutrition modes, recipe metadata, and safe ingredient details', () => {
  const nutrition = {
    total: { kcal: 400, p: 20, f: 10, c: 50, fiber: 4, sugar: 5, sodium: 100, cholesterol: 20, potassium: 300 },
    per100: { kcal: 200, p: 10, f: 5, c: 25, fiber: 2, sugar: 2.5, sodium: 50, cholesterol: 10, potassium: 150 },
    portion: { kcal: 100, p: 5, f: 2.5, c: 12.5, fiber: 1, sugar: 1.25, sodium: 25, cholesterol: 5, potassium: 75 },
    weight: 200,
    portionGrams: 50,
    missingProducts: [{ productId: 'missing' }],
    conversionIssues: [],
    components: { total: [], per100: [], portion: [] }
  };
  const detail = globalThis.NutriMealUI.renderRecipeDetailModal({
    recipe: {
      emoji: '🍲',
      time: 20,
      difficulty: 'Легко',
      cuisine: '<домашняя>',
      tags: ['<быстро>'],
      ingredientItems: [
        { productId: 'milk', amount: 50, unit: 'мл' },
        { productId: 'missing', amount: 10, unit: 'г' }
      ],
      steps: ['<Смешать>']
    },
    nutrition,
    products: [{ id: 'milk', name: 'Молоко' }],
    allergens: ['Молоко'],
    allergyMatches: ['Молоко'],
    formatNumber: (value) => String(value),
    escapeHtml
  });

  assert.match(detail.body, /data-nutrition-mode="total"/);
  assert.match(detail.body, /data-nutrition-mode="per100"/);
  assert.match(detail.body, /data-nutrition-mode="portion"/);
  assert.match(detail.body, /Вес готового блюда<\/span><strong>200 г/);
  assert.match(detail.body, /&lt;домашняя&gt;/);
  assert.match(detail.body, /&lt;быстро&gt;/);
  assert.match(detail.body, /Молоко.*— отсутствует в каталоге/);
  assert.match(detail.body, /&lt;Смешать&gt;/);
  assert.match(detail.body, /Содержит аллергены из профиля: Молоко/);
});

test('recipe nutrition panel reflects the selected period and micronutrient values', () => {
  const panel = globalThis.NutriMealUI.renderRecipeNutritionPanel({
    nutrition: {
      total: { kcal: 400, p: 20, f: 10, c: 50, fiber: 4, sugar: 5, sodium: 100, cholesterol: 20, potassium: 300 },
      per100: { kcal: 200, p: 10, f: 5, c: 25, fiber: 2, sugar: 2.5, sodium: 50, cholesterol: 10, potassium: 150 },
      portion: { kcal: 100, p: 5, f: 2.5, c: 12.5, fiber: 1, sugar: 1.25, sodium: 25, cholesterol: 5, potassium: 75 },
      portionGrams: 50,
      components: {
        total: [{ name: 'Витамин C', amount: 12, unit: 'мг' }],
        per100: [{ name: 'Витамин C', amount: 6, unit: 'мг' }],
        portion: [{ name: 'Витамин C', amount: 3, unit: 'мг' }]
      }
    },
    mode: 'portion',
    formatNumber: (value) => String(value),
    escapeHtml
  });

  assert.match(panel, /100 ккал/);
  assert.match(panel, /Порция · 50 г/);
  assert.match(panel, /Витамин C/);
  assert.match(panel, /3 мг/);
});

test('product detail modal renders basis, density, tags, and components safely', () => {
  const detail = globalThis.NutriMealUI.renderProductDetailModal({
    product: {
      brand: 'Brand',
      basisUnit: 'мл',
      kcal: 52,
      p: 2.8,
      f: 2.5,
      c: 4.7,
      density: 1.03,
      categories: ['Молочные'],
      state: ['Жидкий'],
      allergens: ['Молоко'],
      tags: ['<частный>'],
      components: [{ name: 'Кальций', amount: 120, unit: 'мг' }]
    },
    formatNumber: (value) => String(value),
    escapeHtml
  });

  assert.match(detail.body, /ккал \/ 100 мл/);
  assert.match(detail.body, /Плотность: 1.03 г\/мл/);
  assert.match(detail.body, /Молочные/);
  assert.match(detail.body, /&lt;частный&gt;/);
  assert.match(detail.body, /Кальций/);
});

test('collection modal renders create and rename variants', () => {
  const create = globalThis.NutriMealUI.renderCollectionModal();
  assert.equal(create.title, 'Новая подборка');
  assert.match(create.body, /Название подборки/);
  assert.match(create.actions, /collection-save/);

  const rename = globalThis.NutriMealUI.renderCollectionModal({
    existing: { name: 'Завтраки' },
    escapeHtml: (value) => String(value)
  });
  assert.equal(rename.title, 'Переименовать подборку');
  assert.match(rename.body, /value="Завтраки"/);
});

test('collection source modal renders recipe and product tabs', () => {
  const modal = globalThis.NutriMealUI.renderCollectionSourceModal({
    collectionName: 'Сушка',
    escapeHtml: (value) => String(value)
  });
  assert.equal(modal.title, 'Добавить в «Сушка»');
  assert.match(modal.body, /Рецепты/);
  assert.match(modal.body, /Мои продукты/);
  assert.match(modal.actions, /collection-source-done/);
});
