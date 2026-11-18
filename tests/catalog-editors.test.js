import assert from 'node:assert/strict';
import test from 'node:test';
import '../src/ui/modals/catalog-editors.js';

const ui = globalThis.NutriMealUI;
const escapeHtml = (value) => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

test('recipe editor modal keeps all editor sections and safely renders editable text', () => {
  const modal = ui.renderRecipeEditorModal({
    existing: null,
    draft: {
      name: '<Завтрак>',
      emoji: '🥣',
      time: 0,
      difficulty: 'Средне',
      totalWeight: 300,
      portionGrams: 200,
      imageData: '',
      steps: ['Смешать <ингредиенты>']
    },
    ingredientMarkup: '<div data-editor-ingredient-row></div>',
    componentMarkup: '',
    metadataMarkup: '<div data-recipe-metadata></div>',
    nutritionPreview: '<div data-nutrition-preview></div>',
    escapeHtml
  });

  assert.equal(modal.title, 'Новый рецепт');
  assert.match(modal.body, /&lt;Завтрак&gt;/);
  assert.match(modal.body, /data-editor-ingredient-row/);
  assert.match(modal.body, /data-recipe-metadata/);
  assert.match(modal.body, /data-nutrition-preview/);
  assert.match(modal.body, /recipe-edit-image-file/);
  assert.match(modal.body, /recipe-edit-steps/);
  assert.match(modal.body, /&lt;ингредиенты&gt;/);
  assert.match(modal.actions, /recipe-editor-save/);
});

test('recipe editor escapes image sources and fallback icons', () => {
  const modal = ui.renderRecipeEditorModal({
    existing: null,
    draft: {
      name: 'Рецепт',
      emoji: '<img src=x>',
      time: 0,
      difficulty: 'Легко',
      totalWeight: 300,
      portionGrams: 200,
      imageData: '" onerror="alert(1)',
      steps: []
    },
    ingredientMarkup: '',
    componentMarkup: '',
    metadataMarkup: '',
    nutritionPreview: '',
    escapeHtml
  });

  assert.match(modal.body, /&quot; onerror=&quot;alert\(1\)/);
  assert.match(modal.body, /&lt;img src=x&gt;/);
  assert.doesNotMatch(modal.body, /src=" onerror="alert\(1\)/);
});

test('product editor modal preserves nutrition, density, custom fields, and component controls', () => {
  const modal = ui.renderProductEditorModal({
    existing: { id: 'p1' },
    draft: {
      name: 'Молоко',
      brand: '',
      basisUnit: 'мл',
      density: 1.03,
      kcal: 52,
      p: 3,
      f: 2,
      c: 5,
      components: []
    },
    brandField: '<div data-brand></div>',
    categoriesField: '<div data-categories></div>',
    allergensField: '<div data-allergens></div>',
    stateField: '<div data-state></div>',
    tagsField: '<div data-tags></div>',
    customFieldsMarkup: '<div data-custom-fields></div>',
    componentRows: '<div data-product-nutrient-row></div>',
    escapeHtml
  });

  assert.equal(modal.title, 'Редактирование продукта');
  assert.match(modal.body, /value="Молоко"/);
  assert.match(modal.body, /value="мл"/);
  assert.match(modal.body, /value="1.03"/);
  assert.match(modal.body, /data-brand/);
  assert.match(modal.body, /data-custom-fields/);
  assert.match(modal.body, /data-product-nutrient-row/);
  assert.match(modal.body, /product-add-nutrient/);
  assert.match(modal.actions, /my-product-save/);
});
