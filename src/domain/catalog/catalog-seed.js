import { normalizeProduct } from '../product/product-normalizer.js';
import { PRODUCT_SEED_METADATA } from '../product/product-seed-metadata.js';
import { normalizeRecipeSeed, RECIPE_SEED_DETAILS } from '../recipe/recipe.defaults.js';

const recipeSeed = [
  { id: 1, name: 'Овсяная каша на молоке', emoji: '🥣', time: 15, kcal: 146, p: 5.8, f: 5.1, c: 20.2, tags: ['завтрак', 'быстро'], type: 'Завтраки', ingredients: 'Овсянка, молоко', favorite: true },
  { id: 2, name: 'Курица с гречкой', emoji: '🍗', time: 35, kcal: 158, p: 15.2, f: 4.1, c: 14.7, tags: ['обед', 'много белка', 'заготовка'], type: 'Вторые блюда', ingredients: 'Курица, гречка', favorite: false },
  { id: 3, name: 'Творожная запеканка', emoji: '🍰', time: 50, kcal: 172, p: 14.5, f: 6.2, c: 13.1, tags: ['завтрак', 'десерт'], type: 'Выпечка', ingredients: 'Творог, яйцо, манка', favorite: true },
  { id: 4, name: 'Омлет с сыром', emoji: '🍳', time: 12, kcal: 186, p: 12.4, f: 14.1, c: 1.8, tags: ['завтрак', 'быстро'], type: 'Завтраки', ingredients: 'Яйца, молоко, сыр', favorite: false },
  { id: 5, name: 'Овощной суп', emoji: '🍲', time: 40, kcal: 54, p: 2.1, f: 1.5, c: 8.4, tags: ['обед', 'лёгкое'], type: 'Первые блюда', ingredients: 'Картофель, морковь, овощи', favorite: false },
  { id: 6, name: 'Творог с ягодами', emoji: '🫐', time: 5, kcal: 124, p: 16.2, f: 4.3, c: 5.4, tags: ['перекус', 'быстро', 'много белка'], type: 'Десерты', ingredients: 'Творог, ягоды', favorite: false }
];

const productSeed = [
  { id: 'oat', name: 'Овсянка', kcal: 366, p: 12.3, f: 6.1, c: 59.5, fiber: 10.6, sugar: 1, sodium: 2, cholesterol: 0, potassium: 429 },
  { id: 'milk', name: 'Молоко 2,5%', kcal: 52, p: 2.8, f: 2.5, c: 4.7, fiber: 0, sugar: 4.7, sodium: 44, cholesterol: 10, potassium: 150 },
  { id: 'chicken', name: 'Куриная грудка', kcal: 120, p: 23.6, f: 2.9, c: 0, fiber: 0, sugar: 0, sodium: 74, cholesterol: 73, potassium: 256 },
  { id: 'buckwheat', name: 'Гречка варёная', kcal: 110, p: 4.2, f: 1.1, c: 21.3, fiber: 2.7, sugar: 0.9, sodium: 4, cholesterol: 0, potassium: 88 },
  { id: 'cottage', name: 'Творог 5%', kcal: 121, p: 17, f: 5, c: 1.8, fiber: 0, sugar: 1.8, sodium: 36, cholesterol: 17, potassium: 100 },
  { id: 'egg', name: 'Яйцо', kcal: 157, p: 12.7, f: 11.5, c: 0.7, fiber: 0, sugar: 0.7, sodium: 124, cholesterol: 372, potassium: 126 },
  { id: 'rice', name: 'Рис варёный', kcal: 130, p: 2.7, f: 0.3, c: 28.2, fiber: 0.4, sugar: 0.1, sodium: 1, cholesterol: 0, potassium: 35 }
];

export function createSeedCatalog() {
  const recipes = recipeSeed.map((recipe) => (
    normalizeRecipeSeed(recipe, RECIPE_SEED_DETAILS[recipe.id])
  ));
  const products = productSeed.map((product) => (
    normalizeProduct(product, PRODUCT_SEED_METADATA[product.id])
  ));

  return { recipes, products };
}
