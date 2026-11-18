import assert from 'node:assert/strict';
import test from 'node:test';
import '../src/ui/components/catalog/catalog-cards.js';

test('recipe catalog card renders alert badges and selection controls', () => {
  const html = globalThis.NutriMealUI.renderRecipeCatalogCard({
    recipe: { id: 1, name: 'Каша', emoji: '🥣', favorite: true },
    timeBadge: '<span>15 мин.</span>',
    missingProducts: true,
    allergenMatches: ['Молоко'],
    compositionMeta: '<div>КБЖУ</div>',
    pickAction: '<button>＋</button>',
    escapeHtml: (value) => String(value)
  });
  assert.match(html, /Каша/);
  assert.match(html, /Неполный состав/);
  assert.match(html, /Есть аллерген из профиля/);
  assert.match(html, /КБЖУ/);
  assert.match(html, /data-heart="1"/);
});

test('product catalog card renders nutrition and management controls', () => {
  const html = globalThis.NutriMealUI.renderProductCatalogCard({
    product: { id: 'milk', name: 'Молоко', favorite: false },
    detail: '<div>Лактоза</div>',
    energyMeta: '<div>52 ккал</div>',
    macrosMeta: '<div>БЖУ</div>',
    manageActions: '<div>Изменить и удалить</div>',
    escapeHtml: (value) => String(value)
  });
  assert.match(html, /Молоко/);
  assert.match(html, /52 ккал/);
  assert.match(html, /БЖУ/);
  assert.match(html, /Изменить и удалить/);
  assert.match(html, /data-product-heart="milk"/);
});

test('collection catalog card renders count and management actions', () => {
  const html = globalThis.NutriMealUI.renderCollectionCatalogCard({
    collection: { id: 'c1', name: 'Быстрые блюда' },
    itemCount: 3,
    pickMode: false,
    escapeHtml: (value) => String(value)
  });
  assert.match(html, /Быстрые блюда/);
  assert.match(html, /3 позиции/);
  assert.match(html, /Переименовать/);
  assert.match(html, /Удалить/);
});
