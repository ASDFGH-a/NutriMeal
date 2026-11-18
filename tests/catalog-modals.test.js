import assert from 'node:assert/strict';
import test from 'node:test';
import '../src/ui/modals/catalog-modals.js';

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
