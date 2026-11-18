import { toggleFavorite as toggleCatalogFavorite } from '../../domain/catalog/collection.model.js';
import {
  addItemsToCollection,
  createCollection,
  deleteCollection,
  removeItemFromCollection,
  restoreCollection,
  renameCollection
} from '../usecases/catalog/collections.js';
import { deleteProduct, restoreProduct } from '../usecases/catalog/delete-product.js';
import { saveProduct } from '../usecases/catalog/save-product.js';
import { saveRecipe } from '../usecases/catalog/save-recipe.js';

export function createCatalogServices() {
  return {
    saveRecipe,
    saveProduct,
    deleteProduct,
    restoreProduct,
    createCollection,
    renameCollection,
    addItemsToCollection,
    removeItemFromCollection,
    deleteCollection,
    restoreCollection,
    toggleFavorite: toggleCatalogFavorite
  };
}
