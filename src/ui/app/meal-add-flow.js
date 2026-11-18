import { getDiaryMealOptions, getStandardMeals } from '../../domain/diary/meal-config.js';
import {
  productFilterCount,
  productFilterDefaults,
  productMatchesFilters,
  recipeFilterCount,
  recipeFilterDefaults,
  recipeMatchesFilters,
  createProductStandardFilterCategories,
  createRecipeStandardFilterCategories
} from '../../domain/catalog/catalog-filters.js';
import { normalizeCatalogCardSettings } from '../../domain/catalog/catalog-card-settings.js';
import { normalizeRecipeFilterValue, recipeArray, uniqueRecipeValues } from '../../domain/shared/filter-utils.js';
import { calculateRecipeNutrition } from '../../domain/shared/nutrient-calculations.js';
import { getNutritionRecipeFoodMetadata } from '../../domain/nutrition-set/nutrition-set.calculations.js';
import {
  getEffectiveRecipeAllergens,
  getRecipeAllergyMatches,
  getRecipeCategories,
  getRecipeMissingProducts
} from '../../domain/recipe/recipe.model.js';

function readableDate(key) {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString('ru-RU', { maximumFractionDigits: 1 });
}

function recipeComponents(nutrition) {
  const components = [...nutrition.components.per100];
  const known = new Set(components.map((item) => String(item.name || '').trim().toLocaleLowerCase('ru-RU')));
  const standard = [
    ['fiber', 'Клетчатка', 'г'],
    ['sugar', 'Сахар', 'г'],
    ['sodium', 'Натрий', 'мг'],
    ['cholesterol', 'Холестерин', 'мг'],
    ['potassium', 'Калий', 'мг']
  ];
  for (const [key, name, unit] of standard) {
    if (!known.has(name.toLocaleLowerCase('ru-RU')) && Number(nutrition.per100[key]) > 0) {
      components.push({ name, amount: nutrition.per100[key], unit });
    }
  }
  return components;
}

export function createMealAddFlow({
  document,
  ui,
  data,
  diaryServices,
  catalogServices,
  today,
  getSelectedDate,
  openModal,
  closeModal,
  navigatePage,
  renderDiary,
  showToast,
  escapeHtml,
  saveCatalogCardSettings,
  openMassEntry
}) {
  let context = null;
  let draft = [];
  let recipeIngredientPickContext = null;
  let recipeIngredientPickDraft = [];
  let collectionAddContext = null;
  let collectionAddDraft = [];
  let productSearch = '';
  let catalogView = 'recipes';
  let recipeSearch = '';
  let productCatalogSearch = '';
  let collectionSearch = '';
  let openedCollectionId = null;
  const recipeStandardFilters = createRecipeStandardFilterCategories();
  const productStandardFilters = createProductStandardFilterCategories();
  let recipeCustomFilterCategories = [];
  let productCustomFilterCategories = [];
  let customRecipeFilterTags = [];
  let customProductFilterTags = [];
  let customRecipeFilterTitle = 'Пользовательские теги';
  let customProductFilterTitle = 'Пользовательские теги';
  let recipeFilters = recipeFilterDefaults();
  let productFilters = productFilterDefaults();
  let recipeFiltersOpen = false;
  let productFiltersOpen = false;
  let recipeFilterMode = 'standard';
  let productFilterMode = 'standard';
  let catalogCardSettings = normalizeCatalogCardSettings(data.catalogCardSettings || {});

  function chosenKeys() {
    const items = collectionAddContext ? collectionAddDraft : draft;
    return items.map((item) => `${item.kind === 'recipe' ? 'r' : 'p'}-${item.id}`);
  }

  function getRecipeFilterCategory(categoryId) {
    if (categoryId === 'customTags') {
      return {
        id: 'customTags',
        label: customRecipeFilterTitle,
        kind: 'tags',
        recipeField: 'tags',
        values: customRecipeFilterTags
      };
    }
    return [...recipeStandardFilters, ...recipeCustomFilterCategories]
      .find((category) => category.id === categoryId) || null;
  }

  function getProductFilterCategory(categoryId) {
    if (categoryId === 'customTags') {
      return {
        id: 'customTags',
        label: customProductFilterTitle,
        kind: 'tags',
        productField: 'tags',
        values: customProductFilterTags
      };
    }
    return [...productStandardFilters, ...productCustomFilterCategories]
      .find((category) => category.id === categoryId) || null;
  }

  function getRecipeFilterCategoryValues(category) {
    if (!category) return [];
    let observed = [];
    if (category.id === 'customTags') observed = data.recipes.flatMap((recipe) => recipeArray(recipe.tags));
    else if (category.id === 'mealTypes') observed = data.recipes.flatMap((recipe) => recipeArray(recipe.mealTypes || recipe.mealType));
    else if (category.id === 'cuisines') observed = data.recipes.flatMap((recipe) => recipeArray(recipe.cuisine));
    else if (category.id === 'dishTypes') observed = data.recipes.flatMap((recipe) => recipeArray(recipe.dishTypes || recipe.dishType));
    else if (category.id === 'categories') observed = data.recipes.flatMap((recipe) => getRecipeCategories(recipe));
    else if (category.id === 'allergens') observed = data.recipes.flatMap((recipe) => getEffectiveRecipeAllergens(recipe, data.products));
    else if (category.recipeField === 'customAttributes') {
      observed = data.recipes.flatMap((recipe) => recipeArray(recipe.customAttributes?.[category.id]));
    } else if (category.recipeField) {
      observed = data.recipes.flatMap((recipe) => recipeArray(recipe[category.recipeField]));
    }
    return uniqueRecipeValues([...(category.values || []), ...observed]);
  }

  function getProductFilterCategoryValues(category) {
    if (!category) return [];
    let observed = [];
    if (category.id === 'customTags') observed = data.products.flatMap((product) => recipeArray(product.tags));
    else if (category.productField === 'brand') observed = data.products.map((product) => product.brand || '');
    else if (['categories', 'allergens', 'state'].includes(category.productField)) {
      observed = data.products.flatMap((product) => recipeArray(product[category.productField]));
    } else if (category.productField === 'components') {
      observed = data.products.flatMap((product) => recipeArray(product.components)
        .map((item) => typeof item === 'string' ? item : item?.name));
    } else if (category.productField === 'customAttributes') {
      observed = data.products.flatMap((product) => recipeArray(product.customAttributes?.[category.id]));
    }
    return uniqueRecipeValues([...(category.values || []), ...observed]);
  }

  function addFilterValue(isProducts, categoryId, value) {
    const clean = String(value ?? '').trim();
    const category = isProducts ? getProductFilterCategory(categoryId) : getRecipeFilterCategory(categoryId);
    if (!clean || !category) return false;
    const values = isProducts ? getProductFilterCategoryValues(category) : getRecipeFilterCategoryValues(category);
    if (values.some((item) => normalizeRecipeFilterValue(item) === normalizeRecipeFilterValue(clean))) return false;
    if (categoryId === 'customTags') {
      if (isProducts) customProductFilterTags.push(clean);
      else customRecipeFilterTags.push(clean);
    } else {
      category.values = uniqueRecipeValues([...(category.values || []), clean]);
    }
    return true;
  }

  function setRecipeFilterValue(recipe, category, oldValue, newValue, remove = false) {
    const replacement = (value) => (
      normalizeRecipeFilterValue(value) === normalizeRecipeFilterValue(oldValue)
        ? (remove ? '' : newValue)
        : value
    );
    if (category.recipeField === 'cuisine') {
      if (normalizeRecipeFilterValue(recipe.cuisine) === normalizeRecipeFilterValue(oldValue)) {
        recipe.cuisine = remove ? '' : newValue;
      }
    } else if (category.recipeField === 'customAttributes') {
      recipe.customAttributes = recipe.customAttributes || {};
      recipe.customAttributes[category.id] = uniqueRecipeValues(
        recipeArray(recipe.customAttributes[category.id]).map(replacement).filter(Boolean)
      );
    } else if (category.recipeField) {
      recipe[category.recipeField] = uniqueRecipeValues(
        recipeArray(recipe[category.recipeField]).map(replacement).filter(Boolean)
      );
    }
  }

  function setProductFilterValue(product, category, oldValue, newValue, remove = false) {
    const replacement = (value) => (
      normalizeRecipeFilterValue(value) === normalizeRecipeFilterValue(oldValue)
        ? (remove ? '' : newValue)
        : value
    );
    if (category.productField === 'brand') {
      if (normalizeRecipeFilterValue(product.brand) === normalizeRecipeFilterValue(oldValue)) {
        product.brand = remove ? '' : newValue;
      }
    } else if (category.productField === 'components') {
      product.components = recipeArray(product.components).map((item) => {
        if (typeof item === 'string') return replacement(item);
        return normalizeRecipeFilterValue(item?.name) === normalizeRecipeFilterValue(oldValue)
          ? { ...item, name: remove ? '' : newValue }
          : item;
      }).filter((item) => typeof item === 'string' ? Boolean(item) : Boolean(item?.name));
    } else if (category.productField === 'customAttributes') {
      product.customAttributes = product.customAttributes || {};
      product.customAttributes[category.id] = uniqueRecipeValues(
        recipeArray(product.customAttributes[category.id]).map(replacement).filter(Boolean)
      );
    } else if (category.productField) {
      product[category.productField] = uniqueRecipeValues(
        recipeArray(product[category.productField]).map(replacement).filter(Boolean)
      );
    }
  }

  function updateFilterSelections(filters, category, oldValue, newValue, remove, isProducts) {
    const replacement = (value) => (
      normalizeRecipeFilterValue(value) === normalizeRecipeFilterValue(oldValue)
        ? (remove ? '' : newValue)
        : value
    );
    if (category.filterKey && Array.isArray(filters[category.filterKey])) {
      filters[category.filterKey] = uniqueRecipeValues(filters[category.filterKey].map(replacement).filter(Boolean));
    }
    if (category.id === 'allergens') {
      for (const key of ['allergenInclude', 'allergenExclude']) {
        filters[key] = uniqueRecipeValues(filters[key].map(replacement).filter(Boolean));
      }
    }
    if (category.id === 'customTags') {
      filters.customTags = uniqueRecipeValues(filters.customTags.map(replacement).filter(Boolean));
    }
    if (category.kind === 'customMulti' && Array.isArray(filters.customAttributes?.[category.id])) {
      filters.customAttributes[category.id] = uniqueRecipeValues(
        filters.customAttributes[category.id].map(replacement).filter(Boolean)
      );
    }
    if (isProducts && category.id === 'brand') {
      filters.brand = uniqueRecipeValues(filters.brand.map(replacement).filter(Boolean));
    }
  }

  function renameFilterValue(isProducts, category, oldValue, newValue) {
    const clean = String(newValue ?? '').trim();
    const getValues = isProducts ? getProductFilterCategoryValues : getRecipeFilterCategoryValues;
    if (!clean || getValues(category).some((value) => (
      normalizeRecipeFilterValue(value) === normalizeRecipeFilterValue(clean)
      && normalizeRecipeFilterValue(value) !== normalizeRecipeFilterValue(oldValue)
    ))) return false;
    category.values = uniqueRecipeValues((category.values || []).map((value) => (
      normalizeRecipeFilterValue(value) === normalizeRecipeFilterValue(oldValue) ? clean : value
    )));
    if (category.id === 'customTags') {
      if (isProducts) {
        customProductFilterTags = uniqueRecipeValues(customProductFilterTags.map((value) => (
          normalizeRecipeFilterValue(value) === normalizeRecipeFilterValue(oldValue) ? clean : value
        )));
      } else {
        customRecipeFilterTags = uniqueRecipeValues(customRecipeFilterTags.map((value) => (
          normalizeRecipeFilterValue(value) === normalizeRecipeFilterValue(oldValue) ? clean : value
        )));
      }
    }
    const items = isProducts ? data.products : data.recipes;
    items.forEach((item) => (
      isProducts
        ? setProductFilterValue(item, category, oldValue, clean)
        : setRecipeFilterValue(item, category, oldValue, clean)
    ));
    updateFilterSelections(isProducts ? productFilters : recipeFilters, category, oldValue, clean, false, isProducts);
    return true;
  }

  function deleteFilterValue(isProducts, category, value) {
    category.values = (category.values || []).filter((item) => (
      normalizeRecipeFilterValue(item) !== normalizeRecipeFilterValue(value)
    ));
    if (category.id === 'customTags') {
      if (isProducts) {
        customProductFilterTags = customProductFilterTags.filter((item) => (
          normalizeRecipeFilterValue(item) !== normalizeRecipeFilterValue(value)
        ));
      } else {
        customRecipeFilterTags = customRecipeFilterTags.filter((item) => (
          normalizeRecipeFilterValue(item) !== normalizeRecipeFilterValue(value)
        ));
      }
    }
    (isProducts ? data.products : data.recipes).forEach((item) => (
      isProducts
        ? setProductFilterValue(item, category, value, '', true)
        : setRecipeFilterValue(item, category, value, '', true)
    ));
    updateFilterSelections(isProducts ? productFilters : recipeFilters, category, value, '', true, isProducts);
  }

  function createFilterCategory(isProducts, label) {
    const name = String(label ?? '').trim();
    if (!name) return null;
    const categories = isProducts ? productCustomFilterCategories : recipeCustomFilterCategories;
    const allCategories = isProducts ? getProductFilterCategory : getRecipeFilterCategory;
    const base = `custom-${name.toLocaleLowerCase('ru-RU').replace(/[^a-zа-яё0-9]+/gi, '-').replace(/^-|-$/g, '').slice(0, 28)}`;
    let id = base === 'custom-' ? 'custom-filter' : base;
    let suffix = 2;
    while (allCategories(id)) id = `${base === 'custom-' ? 'custom-filter' : base}-${suffix++}`;
    const category = {
      id,
      label: name,
      kind: 'customMulti',
      ...(isProducts ? { productField: 'customAttributes' } : { recipeField: 'customAttributes' }),
      values: []
    };
    categories.push(category);
    catalogCardSettings = normalizeCatalogCardSettings(catalogCardSettings, {
      recipeCustomCategories: recipeCustomFilterCategories,
      productCustomCategories: productCustomFilterCategories
    });
    return category;
  }

  function deleteFilterCategory(isProducts, category) {
    const categories = isProducts ? productCustomFilterCategories : recipeCustomFilterCategories;
    if (!categories.some((item) => item.id === category.id)) return false;
    if (isProducts) productCustomFilterCategories = categories.filter((item) => item.id !== category.id);
    else recipeCustomFilterCategories = categories.filter((item) => item.id !== category.id);
    const filters = isProducts ? productFilters : recipeFilters;
    delete filters.customAttributes[category.id];
    (isProducts ? data.products : data.recipes).forEach((item) => {
      if (item.customAttributes) delete item.customAttributes[category.id];
    });
    delete catalogCardSettings[isProducts ? 'products' : 'recipes'][category.id];
    catalogCardSettings = normalizeCatalogCardSettings(catalogCardSettings, {
      recipeCustomCategories: recipeCustomFilterCategories,
      productCustomCategories: productCustomFilterCategories
    });
    return true;
  }

  function filterChips(key, options, selected = [], customCategoryId = '', isProducts = false) {
    const attributePrefix = isProducts ? 'data-product-filter' : 'data-filter';
    const values = options.map((option) => {
      const value = typeof option === 'string' ? option : option.id;
      const label = typeof option === 'string' ? option : option.name;
      const active = selected.includes(value);
      return `<button type="button" class="filter-chip ${active ? 'selected' : ''}" ${attributePrefix}-key="${escapeHtml(key)}" ${customCategoryId ? `${attributePrefix}-custom-category="${escapeHtml(customCategoryId)}"` : ''} ${attributePrefix}-value="${escapeHtml(value)}" aria-pressed="${active}">${escapeHtml(label)}</button>`;
    }).join('');
    return `<div class="filter-chip-list">${values || '<span class="filter-empty-note">Нет доступных значений</span>'}</div>`;
  }

  function filterRange(label, minimumKey, maximumKey, values, isProducts = false) {
    const prefix = isProducts ? 'data-product-filter-range' : 'data-filter-range';
    return `<div class="filter-range-row"><label>${label ? `${escapeHtml(label)} ` : ''}от<input type="number" min="0" ${prefix}="${minimumKey}" value="${escapeHtml(values[minimumKey])}" placeholder="—"></label><span class="filter-range-dash">—</span><label>до<input type="number" min="0" ${prefix}="${maximumKey}" value="${escapeHtml(values[maximumKey])}" placeholder="—"></label></div>`;
  }

  function renderRecipeFilterCategories() {
    const productOptions = data.products.map((product) => ({ id: String(product.id), name: product.name }));
    return [...recipeStandardFilters, ...recipeCustomFilterCategories].map((category) => {
      const heading = `<div class="filter-section-head"><div class="filter-section-title">${escapeHtml(category.label)}</div><button type="button" class="filter-manage-btn" data-edit-filter-category="${escapeHtml(category.id)}" aria-label="Настроить ${escapeHtml(category.label)}">Настроить</button></div>`;
      let content = '';
      if (category.kind === 'timeRange') {
        content = filterRange('Минуты', 'timeMin', 'timeMax', recipeFilters, false)
          + '<div class="filter-empty-note">Время в минутах.</div>';
      } else if (category.kind === 'composition') {
        content = `<div class="filter-composition-grid"><div class="filter-composition-item"><strong>Калории, ккал</strong>${filterRange('', 'kcalMin', 'kcalMax', recipeFilters)}</div><div class="filter-composition-item"><strong>Белки, г</strong>${filterRange('', 'pMin', 'pMax', recipeFilters)}</div><div class="filter-composition-item"><strong>Углеводы, г</strong>${filterRange('', 'cMin', 'cMax', recipeFilters)}</div></div>`;
      } else if (category.kind === 'products') {
        content = `<div class="filter-product-columns"><div class="filter-product-box"><div class="filter-section-subtitle">Обязательные продукты</div>${filterChips('productsInclude', productOptions, recipeFilters.productsInclude)}</div><div class="filter-product-box"><div class="filter-section-subtitle">Исключаемые продукты</div>${filterChips('productsExclude', productOptions, recipeFilters.productsExclude)}</div></div><div class="filter-empty-note">Список продуктов берётся из каталога «Мои продукты».</div>`;
      } else if (category.kind === 'includeExclude') {
        const values = getRecipeFilterCategoryValues(category);
        content = `<div class="filter-section-subtitle">Содержит выбранные</div>${filterChips('allergenInclude', values, recipeFilters.allergenInclude)}<div class="filter-section-subtitle">Исключить содержащие выбранные</div>${filterChips('allergenExclude', values, recipeFilters.allergenExclude)}`;
      } else if (category.kind === 'customMulti') {
        content = filterChips('customAttributes', getRecipeFilterCategoryValues(category), recipeFilters.customAttributes[category.id] || [], category.id);
      } else {
        const key = category.filterKey;
        content = filterChips(key, getRecipeFilterCategoryValues(category), recipeFilters[key] || []);
      }
      return `<section class="filter-section ${category.kind === 'composition' || category.kind === 'products' ? 'full' : ''}">${heading}${content}</section>`;
    }).join('');
  }

  function renderProductFilterCategories() {
    return [...productStandardFilters, ...productCustomFilterCategories].map((category) => {
      const heading = `<div class="filter-section-head"><div class="filter-section-title">${escapeHtml(category.label)}</div><button type="button" class="filter-manage-btn" data-edit-product-filter-category="${escapeHtml(category.id)}">Настроить</button></div>`;
      let content = '';
      if (category.kind === 'composition') {
        content = `<div class="field full"><label for="product-filter-basis">Основа расчёта</label><select id="product-filter-basis" data-product-filter-basis><option value="" ${productFilters.basisUnit === '' ? 'selected' : ''}>Любая</option><option value="г" ${productFilters.basisUnit === 'г' ? 'selected' : ''}>На 100 г</option><option value="мл" ${productFilters.basisUnit === 'мл' ? 'selected' : ''}>На 100 мл</option></select></div><div class="filter-composition-grid"><div class="filter-composition-item"><strong>Калории, ккал</strong>${filterRange('', 'kcalMin', 'kcalMax', productFilters, true)}</div><div class="filter-composition-item"><strong>Белки, г</strong>${filterRange('', 'pMin', 'pMax', productFilters, true)}</div><div class="filter-composition-item"><strong>Жиры, г</strong>${filterRange('', 'fMin', 'fMax', productFilters, true)}</div><div class="filter-composition-item"><strong>Углеводы, г</strong>${filterRange('', 'cMin', 'cMax', productFilters, true)}</div></div><div class="filter-empty-note">Значения на 100 г / 100 мл.</div>`;
      } else if (category.kind === 'includeExclude') {
        const values = getProductFilterCategoryValues(category);
        content = `<div class="filter-section-subtitle">Содержит выбранные</div>${filterChips('allergenInclude', values, productFilters.allergenInclude, '', true)}<div class="filter-section-subtitle">Исключить содержащие выбранные</div>${filterChips('allergenExclude', values, productFilters.allergenExclude, '', true)}`;
      } else if (category.kind === 'customMulti') {
        content = filterChips('customAttributes', getProductFilterCategoryValues(category), productFilters.customAttributes[category.id] || [], category.id, true);
      } else {
        const key = category.productField === 'brand' ? 'brand' : category.id;
        content = filterChips(key, getProductFilterCategoryValues(category), productFilters[key] || [], '', true);
      }
      return `<section class="filter-section ${category.kind === 'composition' ? 'full' : ''}">${heading}${content}</section>`;
    }).join('');
  }

  function renderCustomTagFilters(isProducts) {
    const title = isProducts ? customProductFilterTitle : customRecipeFilterTitle;
    const values = isProducts
      ? getProductFilterCategoryValues(getProductFilterCategory('customTags'))
      : getRecipeFilterCategoryValues(getRecipeFilterCategory('customTags'));
    const filters = isProducts ? productFilters : recipeFilters;
    const manageId = isProducts ? 'manage-product-tags' : 'manage-recipe-tags';
    const inputId = isProducts ? 'new-product-filter-tag' : 'new-recipe-filter-tag';
    const addId = isProducts ? 'add-product-filter-tag' : 'add-recipe-filter-tag';
    return `<div class="filter-user-toolbar"><div><div class="filter-user-title">${escapeHtml(title)}</div><div class="filter-panel-note">Теги, добавленные в карточках ${isProducts ? 'продуктов' : 'рецептов'}, автоматически появляются здесь.</div></div><div class="filter-user-actions"><button type="button" class="btn-quiet" id="${manageId}">Управлять тегами</button></div></div><div class="filter-tag-create"><input type="text" id="${inputId}" maxlength="48" placeholder="Название нового тега"><button type="button" class="btn" id="${addId}">＋ Создать тег</button></div>${filterChips('customTags', values, filters.customTags, '', isProducts)}`;
  }

  function draftItem(kind, item) {
    const nutrition = kind === 'recipe'
      ? calculateRecipeNutrition(item, data.products)
      : { per100: item, components: { per100: Array.isArray(item.components) ? item.components : [] } };
    const amount = kind === 'recipe' ? nutrition.per100 : item;
    const portionGrams = kind === 'recipe' ? Math.max(1, Number(item.portionGrams) || 100) : null;
    return {
      id: item.id,
      kind,
      item,
      name: item.name,
      kcal: Number(amount.kcal) || 0,
      p: Number(amount.p) || 0,
      f: Number(amount.f) || 0,
      c: Number(amount.c) || 0,
      grams: 100,
      quantityMode: 'grams',
      quantityValue: 100,
      quantityUnit: kind === 'product' && item.basisUnit === 'мл' ? 'мл' : 'г',
      portionGrams,
      nutritionSnapshot: {
        kcal: Number(amount.kcal) || 0,
        p: Number(amount.p) || 0,
        f: Number(amount.f) || 0,
        c: Number(amount.c) || 0,
        components: kind === 'recipe' ? recipeComponents(nutrition) : [...nutrition.components.per100]
      },
      foodMetadataSnapshot: kind === 'recipe'
        ? getNutritionRecipeFoodMetadata(item, data.products)
        : {
          categories: Array.isArray(item.categories) ? [...item.categories] : [],
          items: [item.name]
        },
      meal: context?.massEntry
        ? (Array.isArray(item.mealTypes)
          ? item.mealTypes.find((meal) => getStandardMeals(data.profile).includes(meal))
          : null) || getStandardMeals(data.profile)[0] || 'Завтрак'
        : undefined
    };
  }

  function showProductResults() {
    const query = productSearch.trim().toLocaleLowerCase('ru-RU');
    const products = data.products.filter((item) => (
      !query
      || `${item.name || ''} ${item.brand || ''} ${(item.categories || []).join(' ')}`
        .toLocaleLowerCase('ru-RU').includes(query)
    ));
    document.getElementById('meal-food-results').innerHTML = ui.renderMealProductSearchResults({
      products,
      chosenKeys: chosenKeys(),
      fmt: formatNumber,
      escapeHtml
    });
    document.querySelectorAll('[data-add-product]').forEach((button) => {
      button.addEventListener('click', () => addItem('product', button.dataset.addProduct));
    });
  }

  function renderDraft() {
    return ui.renderMealDraftMarkup({
      draftItems: draft,
      standardMeals: getStandardMeals(data.profile),
      isLibrarySource: Boolean(context?.massEntry),
      replaceEntry: Boolean(context?.replaceEntry),
      fmt: formatNumber,
      nutritionNumber: formatNumber,
      escapeHtml
    });
  }

  function showPlate() {
    if (!context) return;
    const dateLabel = readableDate(context.date);
    const modal = ui.renderMealAddPlateModal({
      meal: context.meal,
      dateLabel,
      replaceEntry: Boolean(context.replaceEntry),
      replaceName: context.replaceEntry?.name || '',
      isLibrarySource: Boolean(context.massEntry),
      libraryDateCount: context.dates?.length || 0,
      draftMarkup: renderDraft(),
      hasDraft: draft.length > 0,
      escapeHtml
    });
    openModal(modal.title, modal.body, modal.actions, context.onDismiss || cancel);
    showProductResults();
    bindDraftActions();
    document.getElementById('meal-food-search').value = productSearch;
    document.getElementById('meal-food-search').addEventListener('input', (event) => {
      productSearch = event.currentTarget.value;
      const position = event.currentTarget.selectionStart;
      showProductResults();
      const search = document.getElementById('meal-food-search');
      search.focus();
      search.setSelectionRange(position, position);
    });
    document.getElementById('open-meal-recipe-catalog').addEventListener('click', openCatalog);
    document.getElementById('meal-picker-cancel').addEventListener('click', cancel);
    document.getElementById('meal-picker-save').addEventListener('click', save);
  }

  function bindDraftActions() {
    document.querySelectorAll('[data-draft-meal]').forEach((select) => {
      select.addEventListener('change', () => {
        const item = draft[Number(select.dataset.draftMeal)];
        if (item) item.meal = select.value;
      });
    });
    document.querySelectorAll('[data-remove-draft]').forEach((button) => {
      button.addEventListener('click', () => {
        draft.splice(Number(button.dataset.removeDraft), 1);
        showPlate();
      });
    });
    document.querySelectorAll('[data-draft-unit]').forEach((button) => {
      button.addEventListener('click', () => {
        const item = draft[Number(button.dataset.draftIndex)];
        if (!item) return;
        const mode = button.dataset.draftUnit;
        if (item.quantityMode === mode) return;
        item.quantityMode = mode;
        item.quantityValue = mode === 'portions'
          ? item.grams / item.portionGrams
          : item.grams;
        showPlate();
      });
    });
    document.querySelectorAll('[data-draft-quantity]').forEach((input) => {
      input.addEventListener('change', () => {
        const index = Number(input.dataset.draftQuantity);
        const item = draft[index];
        if (!item) return;
        const value = Number(input.value);
        const grams = item.quantityMode === 'portions' ? value * item.portionGrams : value;
        if (!Number.isFinite(value) || value <= 0 || !Number.isFinite(grams) || grams > 30000) {
          showToast('Укажи количество больше 0 и не более 30000 г');
          input.value = String(item.quantityMode === 'portions'
            ? Number(item.quantityValue.toFixed(2))
            : Number(item.grams.toFixed(2)));
          return;
        }
        item.quantityValue = value;
        item.grams = grams;
        const row = input.closest('[data-draft-row]');
        row.querySelector('.meal-draft-info small').textContent = `${formatNumber(item.kcal * grams / 100)} ккал · Б ${formatNumber(item.p * grams / 100)} · Ж ${formatNumber(item.f * grams / 100)} · У ${formatNumber(item.c * grams / 100)}`;
        const note = row.querySelector('.meal-draft-quantity-note');
        if (note) note.textContent = `1 порция = ${formatNumber(item.portionGrams)} г · всего ${formatNumber(grams)} г`;
      });
    });
  }

  function addItem(kind, id) {
    const catalog = kind === 'recipe' ? data.recipes : data.products;
    const item = catalog.find((entry) => String(entry.id) === String(id));
    if (!item) {
      showToast('Позиция не найдена в каталоге');
      return;
    }
    if (chosenKeys().includes(`${kind === 'recipe' ? 'r' : 'p'}-${item.id}`)) return;
    if (context?.replaceEntry && draft.length) {
      showToast('Для замены выбери одну позицию');
      return;
    }
    draft.push(draftItem(kind, item));
    if (document.getElementById('page').dataset.page === 'diary') {
      showPlate();
      return;
    }
    renderPicker();
  }

  function start(meal, replaceEntry = null) {
    const date = getSelectedDate();
    if (date > today) {
      showToast('Нельзя добавлять записи на будущую дату');
      return;
    }
    context = {
      meal: replaceEntry?.meal || meal,
      date: replaceEntry?.date || date,
      replaceEntry
    };
    recipeIngredientPickContext = null;
    recipeIngredientPickDraft = [];
    collectionAddContext = null;
    collectionAddDraft = [];
    draft = [];
    productSearch = '';
    showPlate();
  }

  function openQuickAdd() {
    const modal = ui.renderQuickAddMenuModal();
    openModal(modal.title, modal.body, modal.actions);
    document.getElementById('quick-add-menu-close').addEventListener('click', closeModal);
    document.getElementById('quick-add-single').addEventListener('click', chooseMeal);
    document.getElementById('quick-add-mass').addEventListener('click', openMassEntry);
  }

  function chooseMeal() {
    if (getSelectedDate() > today) {
      showToast('Нельзя добавлять записи на будущую дату');
      return;
    }
    const modal = ui.renderQuickMealChooserModal({
      dateLabel: readableDate(getSelectedDate()),
      optionsMarkup: getDiaryMealOptions(data.profile, data.diaryEntries)
        .map((meal) => `<button type="button" class="history-row" data-quick-meal="${escapeHtml(meal)}"><strong>${escapeHtml(meal)}</strong><span class="muted" aria-hidden="true">›</span></button>`)
        .join('')
    });
    openModal(modal.title, modal.body, modal.actions);
    document.querySelector('.modal').classList.add('meal-chooser-modal');
    document.getElementById('quick-meal-cancel').addEventListener('click', closeModal);
    document.querySelectorAll('[data-quick-meal]').forEach((button) => {
      button.addEventListener('click', () => start(button.dataset.quickMeal));
    });
  }

  function openCatalog() {
    if (!context) return;
    closeModal(false);
    catalogView = 'recipes';
    navigatePage('recipes');
  }

  function returnToPlate() {
    navigatePage('diary');
    showPlate();
  }

  function renderRecipeCard(recipe) {
    const nutrition = calculateRecipeNutrition(recipe, data.products);
    const display = catalogCardSettings.recipes;
    const collection = collectionAddContext
      ? data.collections.find((item) => String(item.id) === String(collectionAddContext.collectionId))
      : null;
    const alreadyInCollection = collection?.items.some((item) => (
      item.kind === 'recipe' && String(item.id) === String(recipe.id)
    ));
    const chosen = Boolean(alreadyInCollection) || chosenKeys().includes(`r-${recipe.id}`);
    const allergens = getEffectiveRecipeAllergens(recipe, data.products);
    const matches = getRecipeAllergyMatches(recipe, data.profile.allergies, data.products);
    const dishTypes = Array.isArray(recipe.dishTypes)
      ? recipe.dishTypes
      : recipe.dishType ? [recipe.dishType] : [];
    const pickAction = context || collectionAddContext
      ? `<div class="recipe-pick-action"><span>${chosen ? 'Добавлено' : ''}</span><button type="button" class="recipe-pick-plus ${chosen ? 'selected' : ''}" data-pick-recipe="${escapeHtml(recipe.id)}" ${chosen ? 'disabled' : ''} aria-label="${chosen ? 'Уже добавлено' : `Добавить ${escapeHtml(recipe.name)}`}">${chosen ? '✓' : '＋'}</button></div>`
      : '';
    const removeAction = catalogView === 'collections' && openedCollectionId && !context
      ? `<button type="button" class="collection-item-remove" data-remove-collection-kind="recipe" data-remove-collection-id="${escapeHtml(recipe.id)}">Убрать из подборки</button>`
      : '';
    const valuesFor = (...candidates) => uniqueRecipeValues(candidates.flatMap((value) => recipeArray(value)));
    const attributeRow = (label, values, extraClass = '') => values.length
      ? `<div class="recipe-card-attribute ${extraClass}"><span class="recipe-card-attribute-label">${escapeHtml(label)}</span><div class="recipe-card-meta">${values.map((value) => `<span class="tag">${escapeHtml(value)}</span>`).join('')}</div></div>`
      : '';
    const ingredientRows = recipeArray(recipe.ingredientItems);
    const ingredientNames = ingredientRows.map((row) => {
      const product = data.products.find((item) => String(item.id) === String(row.productId));
      return product?.name || row.productName || row.name || '';
    }).filter(Boolean);
    const recipeProducts = ingredientRows.length && ingredientNames.length === ingredientRows.length
      ? uniqueRecipeValues(ingredientNames)
      : typeof recipe.ingredients === 'string' && recipe.ingredients.trim()
        ? uniqueRecipeValues(recipe.ingredients.split(/[,;]+/))
        : uniqueRecipeValues(ingredientNames);
    return ui.renderRecipeCatalogCard({
      recipe,
      timeBadge: display.time && recipe.time ? `<span class="tag recipe-time">${escapeHtml(recipe.time)} мин.</span>` : '',
      missingProducts: getRecipeMissingProducts(recipe, data.products).length > 0,
      allergenMatches: matches,
      mealMeta: display.mealTypes ? attributeRow('Приём пищи', valuesFor(recipe.mealTypes || recipe.mealType)) : '',
      cuisineMeta: display.cuisines ? attributeRow('Тип кухни', valuesFor(recipe.cuisine)) : '',
      dishTypeMeta: display.dishTypes ? attributeRow('Тип блюда', valuesFor(dishTypes)) : '',
      allergenMeta: display.allergens ? attributeRow('Аллергены', valuesFor(allergens)) : '',
      categoriesMeta: display.categories ? attributeRow('Категории продуктов', valuesFor(getRecipeCategories(recipe))) : '',
      compositionMeta: display.composition
        ? `<div class="recipe-card-attribute"><span class="recipe-card-attribute-label">Состав на 100 г</span><div class="macros"><span class="macro">${formatNumber(nutrition.per100.kcal)} ккал</span><span class="macro">Б: ${formatNumber(nutrition.per100.p)} г</span><span class="macro">Ж: ${formatNumber(nutrition.per100.f)} г</span><span class="macro">У: ${formatNumber(nutrition.per100.c)} г</span></div></div>`
        : '',
      productMeta: display.products ? attributeRow('Продукты', recipeProducts) : '',
      customAttributeMeta: recipeCustomFilterCategories.map((category) => (
        display[category.id] ? attributeRow(category.label, valuesFor(recipe.customAttributes?.[category.id])) : ''
      )).join(''),
      tagsMeta: display.customTags
        ? attributeRow('Пользовательские теги', valuesFor(recipe.tags), 'recipe-card-tags')
        : '',
      pickAction,
      removeAction,
      escapeHtml
    });
  }

  function renderProductCard(product) {
    const display = catalogCardSettings.products;
    const collection = collectionAddContext
      ? data.collections.find((item) => String(item.id) === String(collectionAddContext.collectionId))
      : null;
    const alreadyInCollection = collection?.items.some((item) => (
      item.kind === 'product' && String(item.id) === String(product.id)
    ));
    const alreadyInRecipe = recipeIngredientPickContext?.draft.ingredientItems
      .some((item) => String(item.productId) === String(product.id));
    const selectedForRecipe = recipeIngredientPickDraft.some((item) => String(item.id) === String(product.id));
    const chosen = recipeIngredientPickContext
      ? Boolean(alreadyInRecipe || selectedForRecipe)
      : Boolean(alreadyInCollection) || chosenKeys().includes(`p-${product.id}`);
    const pickDisabled = recipeIngredientPickContext ? alreadyInRecipe : chosen;
    const pickAction = context || recipeIngredientPickContext || collectionAddContext
      ? `<div class="recipe-pick-action"><span>${chosen ? 'Добавлено' : ''}</span><button type="button" class="recipe-pick-plus ${chosen ? 'selected' : ''}" data-pick-product="${escapeHtml(product.id)}" ${pickDisabled ? 'disabled' : ''} aria-label="${chosen ? 'Уже добавлено' : `Добавить ${escapeHtml(product.name)}`}">${chosen ? '✓' : '＋'}</button></div>`
      : '';
    const manageActions = !context && !recipeIngredientPickContext && !collectionAddContext && catalogView === 'myProducts'
      ? `<div class="product-manage-actions"><button type="button" class="btn-quiet" data-edit-product="${escapeHtml(product.id)}">Изменить</button><button type="button" class="btn-quiet product-delete-btn" data-delete-product="${escapeHtml(product.id)}">Удалить</button></div>`
      : '';
    const removeAction = catalogView === 'collections' && openedCollectionId && !context && !collectionAddContext
      ? `<button type="button" class="collection-item-remove" data-remove-collection-kind="product" data-remove-collection-id="${escapeHtml(product.id)}">Убрать из подборки</button>`
      : '';
    const attributeRow = (label, values, extraClass = '') => values.length
      ? `<div class="recipe-card-attribute ${extraClass}"><span class="recipe-card-attribute-label">${escapeHtml(label)}</span><div class="recipe-card-meta">${values.map((value) => `<span class="tag">${escapeHtml(value)}</span>`).join('')}</div></div>`
      : '';
    const basis = product.basisUnit === 'мл' ? '100 мл' : '100 г';
    return ui.renderProductCatalogCard({
      product,
      detail: display.brand && product.brand ? `<div class="recipe-sub">${escapeHtml(product.brand)}</div>` : '',
      energyMeta: display.energy
        ? `<div class="recipe-card-attribute"><span class="recipe-card-attribute-label">Энергетическая ценность</span><div class="macros"><span class="macro">${formatNumber(product.kcal)} ккал / ${basis}</span></div></div>`
        : '',
      macrosMeta: display.macros
        ? `<div class="recipe-card-attribute"><span class="recipe-card-attribute-label">КБЖУ · ${basis}</span><div class="macros"><span class="macro">Б: ${formatNumber(product.p)} г</span><span class="macro">Ж: ${formatNumber(product.f)} г</span><span class="macro">У: ${formatNumber(product.c)} г</span></div></div>`
        : '',
      categoriesMeta: display.categories ? attributeRow('Категории', recipeArray(product.categories)) : '',
      componentsMeta: display.components
        ? attributeRow('Полезные компоненты', recipeArray(product.components).map((item) => (
          typeof item === 'string' ? item : `${item.name}: ${formatNumber(item.amount)} ${item.unit}`
        )))
        : '',
      allergensMeta: display.allergens ? attributeRow('Аллергены', recipeArray(product.allergens)) : '',
      stateMeta: display.state ? attributeRow('Состояние', recipeArray(product.state)) : '',
      tagsMeta: display.tags ? attributeRow('Пользовательские теги', recipeArray(product.tags), 'recipe-card-tags') : '',
      customMeta: productCustomFilterCategories.map((category) => (
        display[category.id]
          ? attributeRow(category.label, recipeArray(product.customAttributes?.[category.id]))
          : ''
      )).join(''),
      pickAction,
      manageActions,
      removeAction,
      escapeHtml
    });
  }

  function renderPicker() {
    const pickMode = Boolean(context || recipeIngredientPickContext || collectionAddContext);
    const query = (catalogView === 'myProducts' ? productCatalogSearch : catalogView === 'collections' ? collectionSearch : recipeSearch)
      .trim().toLocaleLowerCase('ru-RU');
    const recipeFilterOptions = {
      filters: recipeFilters,
      standardCategories: recipeStandardFilters,
      customCategories: recipeCustomFilterCategories,
      products: data.products
    };
    const productFilterOptions = {
      filters: productFilters,
      standardCategories: productStandardFilters,
      customCategories: productCustomFilterCategories
    };
    const recipes = data.recipes.filter((item) => (
      (catalogView !== 'favorite' || item.favorite)
      && (pickMode
        ? !query || `${item.name || ''} ${item.ingredients || ''} ${recipeArray(item.tags).join(' ')}`
          .toLocaleLowerCase('ru-RU').includes(query)
        : recipeMatchesFilters(item, catalogView === 'collections' ? '' : recipeSearch, recipeFilterOptions))
    ));
    const products = data.products.filter((item) => (
      (catalogView === 'myProducts' || catalogView === 'favorite')
      && (catalogView !== 'favorite' || item.favorite)
      && (catalogView === 'myProducts' && !pickMode
        ? productMatchesFilters(item, productCatalogSearch, productFilterOptions)
        : !query || `${item.name || ''} ${item.brand || ''} ${recipeArray(item.categories).join(' ')}`
          .toLocaleLowerCase('ru-RU').includes(query))
    ));
    const tabsMarkup = ui.renderCatalogTabs({
      view: catalogView,
      pickMode,
      collectionAddContext,
      recipeIngredientPickContext,
      plannerDishAddContext: null,
      plannerCategoryAddContext: null
    });
    const searchValue = catalogView === 'myProducts'
      ? productCatalogSearch
      : catalogView === 'collections' ? collectionSearch : recipeSearch;
    const searchPlaceholder = catalogView === 'myProducts'
      ? 'Поиск продуктов'
      : catalogView === 'collections' ? 'Поиск подборок' : 'Поиск рецептов';
    const selectedCollection = catalogView === 'collections'
      ? (data.collections || []).find((item) => String(item.id) === String(openedCollectionId))
      : null;
    const actionButton = !pickMode && catalogView === 'collections'
      ? `<button type="button" class="btn-primary" id="${selectedCollection ? 'collection-add-items' : 'new-collection'}">${selectedCollection ? '＋ Добавить позиции' : '＋ Новая подборка'}</button>`
      : !pickMode && catalogView === 'myProducts'
      ? '<button type="button" class="btn-primary" id="new-product">＋ Добавить продукт</button>'
      : !pickMode && catalogView === 'recipes'
        ? '<button type="button" class="btn-primary" id="new-recipe">＋ Добавить рецепт</button>'
        : '';
    const selectionBanner = recipeIngredientPickContext
      ? `<div class="recipe-pick-banner"><div class="recipe-pick-copy"><strong>Выбор продуктов для рецепта «${escapeHtml(recipeIngredientPickContext.draft.name || 'Новый рецепт')}»</strong><span><b id="recipe-pick-count">Выбрано: ${recipeIngredientPickDraft.length}</b></span></div><button type="button" class="btn-primary" id="recipe-pick-back">Добавить в рецепт${recipeIngredientPickDraft.length ? ` · ${recipeIngredientPickDraft.length}` : ''}</button></div>`
      : collectionAddContext
        ? `<div class="recipe-pick-banner"><div class="recipe-pick-copy"><strong>Добавление в подборку «${escapeHtml(collectionAddContext.name)}»</strong><span><b id="recipe-pick-count">Выбрано: ${collectionAddDraft.length}</b></span></div><button type="button" class="btn-primary" id="collection-add-back">Добавить в подборку${collectionAddDraft.length ? ` · ${collectionAddDraft.length}` : ''}</button></div>`
      : pickMode
        ? `<div class="recipe-pick-banner"><div class="recipe-pick-copy"><strong>${context.massEntry ? 'Состав дневного рациона' : context.replaceEntry ? 'Замена записи' : `Добавление в ${escapeHtml(context.meal)}`}</strong><span>${context.massEntry ? `Рацион на один день · повтор для ${context.dates.length} дат` : `${readableDate(context.date)} · `}<b id="recipe-pick-count">Выбрано: ${draft.length}</b></span></div><button type="button" class="btn-primary" id="recipe-pick-back">${context.massEntry ? 'К списку рациона' : 'К списку добавления'}${draft.length ? ` · ${draft.length}` : ''}</button></div>`
        : '';
    let content;
    if (catalogView === 'recipes') {
      content = recipes.length ? `<div class="grid grid-3">${recipes.map(renderRecipeCard).join('')}</div>` : '<div class="empty">Рецепты не найдены</div>';
    } else if (catalogView === 'myProducts') {
      content = products.length ? `<div class="grid grid-3">${products.map(renderProductCard).join('')}</div>` : '<div class="empty">Продукты не найдены</div>';
    } else if (catalogView === 'favorite') {
      const cards = [
        ...recipes.map(renderRecipeCard),
        ...products.map(renderProductCard)
      ];
      content = cards.length ? `<div class="grid grid-3">${cards.join('')}</div>` : '<div class="empty">В избранном пока нет продуктов и рецептов</div>';
    } else {
      const collections = Array.isArray(data.collections) ? data.collections : [];
      if (selectedCollection) {
        const collectionItems = selectedCollection.items
          .map((reference) => ({
            reference,
            item: (reference.kind === 'recipe' ? data.recipes : data.products)
              .find((entry) => String(entry.id) === String(reference.id))
          }))
          .filter(({ item }) => item && (!query || `${item.name || ''} ${item.brand || ''}`
            .toLocaleLowerCase('ru-RU').includes(query)));
        const cards = collectionItems.map(({ reference, item }) => (
          reference.kind === 'recipe' ? renderRecipeCard(item) : renderProductCard(item)
        ));
        content = cards.length ? `<div class="grid grid-3">${cards.join('')}</div>` : '<div class="empty">В подборке пока нет доступных продуктов и рецептов</div>';
      } else {
        const filtered = collections.filter((collection) => !query
          || collection.name.toLocaleLowerCase('ru-RU').includes(query));
        content = filtered.length
          ? `<div class="grid grid-3">${filtered.map((collection) => ui.renderCollectionCatalogCard({
            collection,
            itemCount: collection.items.length,
            pickMode,
            escapeHtml
          })).join('')}</div>`
          : '<div class="empty">Подборок пока нет</div>';
      }
    }
    const headingTitle = selectedCollection?.name
      || (catalogView === 'myProducts' ? 'Мои продукты' : catalogView === 'favorite' ? 'Избранное' : catalogView === 'collections' ? 'Подборки' : 'Рецепты');
    const collectionCount = selectedCollection
      ? selectedCollection.items.length === 1
        ? '1 позиция'
        : `${selectedCollection.items.length} ${selectedCollection.items.length >= 2 && selectedCollection.items.length <= 4 ? 'позиции' : 'позиций'}`
      : '';
    const detailActions = selectedCollection && !pickMode
      ? `<div class="collection-detail-actions"><button type="button" class="btn-quiet" id="collection-rename">Переименовать</button><button type="button" class="btn-quiet product-delete-btn" id="collection-delete">Удалить подборку</button></div>`
      : '';
    const collectionBack = selectedCollection
      ? '<button type="button" class="btn-quiet" id="collection-back">← Все подборки</button>'
      : '';
    const detailHeader = selectedCollection && !pickMode
      ? `<div class="collection-detail-head">${collectionBack}${detailActions}</div>`
      : '';
    const headingMarkup = `${detailHeader}<div class="between"><div><div class="section-title">${escapeHtml(headingTitle)}</div><div class="card-desc">${catalogView === 'recipes' ? `${recipes.length} рецептов` : catalogView === 'myProducts' ? `${products.length} продуктов` : collectionCount}</div></div>${selectedCollection && pickMode ? collectionBack : ''}</div>`;
    const showRecipeFilters = !pickMode && catalogView === 'recipes';
    const showProductFilters = !pickMode && catalogView === 'myProducts';
    const recipeCount = recipeFilterCount(recipeFilters);
    const productCount = productFilterCount(productFilters);
    const filtersPanel = showRecipeFilters
      ? ui.renderRecipeFilterPanel({
        open: recipeFiltersOpen,
        count: recipeCount,
        mode: recipeFilterMode,
        standardCategoriesMarkup: renderRecipeFilterCategories(),
        customTagsMarkup: renderCustomTagFilters(false)
      })
      : '';
    const combinedFiltersPanel = showRecipeFilters
      ? filtersPanel
      : showProductFilters
        ? ui.renderProductFilterPanel({
        open: productFiltersOpen,
        count: productCount,
        mode: productFilterMode,
        standardCategoriesMarkup: renderProductFilterCategories(),
        customTagsMarkup: renderCustomTagFilters(true)
      })
      : '';
    const filterButton = showRecipeFilters
      ? `<button type="button" class="btn" id="toggle-filters">☷ Фильтры${recipeCount ? ` · ${recipeCount}` : ''}</button>`
      : showProductFilters
        ? `<button type="button" class="btn" id="toggle-product-filters">☷ Фильтры${productCount ? ` · ${productCount}` : ''}</button>`
        : '';
    const catalogToolbar = ui.renderCatalogToolbar({
      searchPlaceholder,
      searchValue,
      filterButton,
      actionButton
    });
    document.getElementById('page').innerHTML = ui.renderCatalogScreen({
      pickMode,
      selectionBanner,
      tabsMarkup,
      toolbarMarkup: catalogToolbar,
      filtersPanel,
      combinedFiltersPanel,
      headingMarkup,
      content
    });
    bindPickerActions();
  }

  function toggleFilterSelection(isProducts, key, value, categoryId = '') {
    const filters = isProducts ? productFilters : recipeFilters;
    const selected = categoryId
      ? (filters.customAttributes[categoryId] || (filters.customAttributes[categoryId] = []))
      : filters[key];
    if (!Array.isArray(selected)) return;
    const index = selected.findIndex((item) => (
      normalizeRecipeFilterValue(item) === normalizeRecipeFilterValue(value)
    ));
    if (index >= 0) selected.splice(index, 1);
    else selected.push(value);
    renderPicker();
  }

  function addCustomFilterTag(isProducts) {
    const input = document.getElementById(isProducts ? 'new-product-filter-tag' : 'new-recipe-filter-tag');
    const value = input.value.trim();
    if (!value) {
      showToast('Укажи название тега');
      return;
    }
    if (!addFilterValue(isProducts, 'customTags', value)) {
      showToast('Такой тег уже существует');
      return;
    }
    const filters = isProducts ? productFilters : recipeFilters;
    filters.customTags = uniqueRecipeValues([...filters.customTags, value]);
    renderPicker();
    showToast('Тег создан и выбран для фильтрации');
  }

  function bindPickerActions() {
    document.querySelectorAll('[data-tab]').forEach((button) => {
      button.addEventListener('click', () => {
        catalogView = button.dataset.tab;
        openedCollectionId = null;
        collectionSearch = '';
        renderPicker();
      });
    });
    document.querySelectorAll('[data-pick-catalog]').forEach((button) => {
      button.addEventListener('click', () => {
        catalogView = button.dataset.pickCatalog;
        openedCollectionId = null;
        renderPicker();
      });
    });
    const cardSettingsButton = document.getElementById('catalog-card-settings');
    if (cardSettingsButton) {
      cardSettingsButton.addEventListener('click', () => openCatalogCardSettings(catalogView === 'myProducts'));
    }
    const toggleRecipeFilters = document.getElementById('toggle-filters');
    if (toggleRecipeFilters) {
      toggleRecipeFilters.addEventListener('click', () => {
        recipeFiltersOpen = !recipeFiltersOpen;
        renderPicker();
      });
    }
    const toggleProductFilters = document.getElementById('toggle-product-filters');
    if (toggleProductFilters) {
      toggleProductFilters.addEventListener('click', () => {
        productFiltersOpen = !productFiltersOpen;
        renderPicker();
      });
    }
    const resetRecipeFilters = document.getElementById('reset-recipe-filters');
    if (resetRecipeFilters) {
      resetRecipeFilters.addEventListener('click', () => {
        recipeFilters = recipeFilterDefaults();
        recipeFiltersOpen = true;
        renderPicker();
      });
    }
    const resetProductFilters = document.getElementById('reset-product-filters');
    if (resetProductFilters) {
      resetProductFilters.addEventListener('click', () => {
        productFilters = productFilterDefaults();
        productFiltersOpen = true;
        renderPicker();
      });
    }
    document.querySelectorAll('[data-filter-mode]').forEach((button) => {
      button.addEventListener('click', () => {
        recipeFilterMode = button.dataset.filterMode;
        renderPicker();
      });
    });
    document.querySelectorAll('[data-product-filter-mode]').forEach((button) => {
      button.addEventListener('click', () => {
        productFilterMode = button.dataset.productFilterMode;
        renderPicker();
      });
    });
    document.querySelectorAll('[data-filter-key]').forEach((button) => {
      button.addEventListener('click', () => toggleFilterSelection(
        false,
        button.dataset.filterKey,
        button.dataset.filterValue,
        button.dataset.filterCustomCategory || ''
      ));
    });
    document.querySelectorAll('[data-product-filter-key]').forEach((button) => {
      button.addEventListener('click', () => toggleFilterSelection(
        true,
        button.dataset.productFilterKey,
        button.dataset.productFilterValue,
        button.dataset.productFilterCustomCategory || ''
      ));
    });
    document.querySelectorAll('[data-filter-range]').forEach((input) => {
      input.addEventListener('change', () => {
        recipeFilters[input.dataset.filterRange] = input.value;
        renderPicker();
      });
    });
    document.querySelectorAll('[data-product-filter-range]').forEach((input) => {
      input.addEventListener('change', () => {
        productFilters[input.dataset.productFilterRange] = input.value;
        renderPicker();
      });
    });
    const productBasisFilter = document.querySelector('[data-product-filter-basis]');
    if (productBasisFilter) {
      productBasisFilter.addEventListener('change', () => {
        productFilters.basisUnit = productBasisFilter.value;
        renderPicker();
      });
    }
    const addRecipeFilterCategory = document.getElementById('add-standard-filter-category');
    if (addRecipeFilterCategory) addRecipeFilterCategory.addEventListener('click', () => openFilterCategoryCreateModal(false));
    const addProductFilterCategory = document.getElementById('add-standard-product-filter-category');
    if (addProductFilterCategory) addProductFilterCategory.addEventListener('click', () => openFilterCategoryCreateModal(true));
    document.querySelectorAll('[data-edit-filter-category]').forEach((button) => {
      button.addEventListener('click', () => openFilterCategoryEditor(false, button.dataset.editFilterCategory));
    });
    document.querySelectorAll('[data-edit-product-filter-category]').forEach((button) => {
      button.addEventListener('click', () => openFilterCategoryEditor(true, button.dataset.editProductFilterCategory));
    });
    const addRecipeFilterTag = document.getElementById('add-recipe-filter-tag');
    if (addRecipeFilterTag) addRecipeFilterTag.addEventListener('click', () => addCustomFilterTag(false));
    const addProductFilterTag = document.getElementById('add-product-filter-tag');
    if (addProductFilterTag) addProductFilterTag.addEventListener('click', () => addCustomFilterTag(true));
    const recipeFilterTagInput = document.getElementById('new-recipe-filter-tag');
    if (recipeFilterTagInput) {
      recipeFilterTagInput.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter') return;
        event.preventDefault();
        addCustomFilterTag(false);
      });
    }
    const productFilterTagInput = document.getElementById('new-product-filter-tag');
    if (productFilterTagInput) {
      productFilterTagInput.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter') return;
        event.preventDefault();
        addCustomFilterTag(true);
      });
    }
    const manageRecipeTags = document.getElementById('manage-recipe-tags');
    if (manageRecipeTags) manageRecipeTags.addEventListener('click', () => openFilterCategoryEditor(false, 'customTags'));
    const manageProductTags = document.getElementById('manage-product-tags');
    if (manageProductTags) manageProductTags.addEventListener('click', () => openFilterCategoryEditor(true, 'customTags'));
    const search = document.getElementById('recipe-search');
    if (search) {
      search.addEventListener('input', (event) => {
        const key = catalogView === 'myProducts'
          ? 'productCatalogSearch'
          : catalogView === 'collections' ? 'collectionSearch' : 'recipeSearch';
        const position = event.currentTarget.selectionStart;
        if (key === 'productCatalogSearch') productCatalogSearch = event.currentTarget.value;
        else if (key === 'collectionSearch') collectionSearch = event.currentTarget.value;
        else recipeSearch = event.currentTarget.value;
        renderPicker();
        const input = document.getElementById('recipe-search');
        input.focus();
        input.setSelectionRange(position, position);
      });
    }
    const newProductButton = document.getElementById('new-product');
    if (newProductButton) newProductButton.addEventListener('click', () => openProductEditor());
    const newRecipeButton = document.getElementById('new-recipe');
    if (newRecipeButton) newRecipeButton.addEventListener('click', () => openRecipeEditor());
    const newCollectionButton = document.getElementById('new-collection');
    if (newCollectionButton) newCollectionButton.addEventListener('click', () => openCollectionEditor());
    const addCollectionItemsButton = document.getElementById('collection-add-items');
    if (addCollectionItemsButton) addCollectionItemsButton.addEventListener('click', startCollectionAdd);
    const pickerBack = document.getElementById('recipe-pick-back');
    if (pickerBack) {
      pickerBack.addEventListener('click', () => {
        if (recipeIngredientPickContext) commitRecipeIngredientPickDraft();
        else returnToPlate();
      });
    }
    const collectionAddBack = document.getElementById('collection-add-back');
    if (collectionAddBack) collectionAddBack.addEventListener('click', commitCollectionAddDraft);
    const collectionBack = document.getElementById('collection-back');
    if (collectionBack) {
      collectionBack.addEventListener('click', () => {
        openedCollectionId = null;
        collectionSearch = '';
        renderPicker();
      });
    }
    const renameCollectionButton = document.getElementById('collection-rename');
    if (renameCollectionButton) renameCollectionButton.addEventListener('click', () => openCollectionEditor(openedCollectionId));
    const deleteCollectionButton = document.getElementById('collection-delete');
    if (deleteCollectionButton) deleteCollectionButton.addEventListener('click', () => deleteCatalogCollection(openedCollectionId));
    document.querySelectorAll('[data-pick-recipe]').forEach((button) => {
      button.addEventListener('click', () => {
        if (collectionAddContext) addCollectionDraftItem('recipe', button.dataset.pickRecipe);
        else addItem('recipe', button.dataset.pickRecipe);
      });
    });
    document.querySelectorAll('[data-pick-product]').forEach((button) => {
      button.addEventListener('click', () => {
        if (recipeIngredientPickContext) toggleRecipeIngredientPick(button.dataset.pickProduct);
        else if (collectionAddContext) addCollectionDraftItem('product', button.dataset.pickProduct);
        else addItem('product', button.dataset.pickProduct);
      });
    });
    document.querySelectorAll('[data-edit-collection]').forEach((button) => {
      button.addEventListener('click', (event) => {
        event.stopPropagation();
        openCollectionEditor(button.dataset.editCollection);
      });
    });
    document.querySelectorAll('[data-delete-collection]').forEach((button) => {
      button.addEventListener('click', (event) => {
        event.stopPropagation();
        deleteCatalogCollection(button.dataset.deleteCollection);
      });
    });
    document.querySelectorAll('[data-remove-collection-kind]').forEach((button) => {
      button.addEventListener('click', (event) => {
        event.stopPropagation();
        removeCollectionItem(button.dataset.removeCollectionKind, button.dataset.removeCollectionId);
      });
    });
    document.querySelectorAll('[data-edit-product]').forEach((button) => {
      button.addEventListener('click', (event) => {
        event.stopPropagation();
        openProductEditor(button.dataset.editProduct);
      });
    });
    document.querySelectorAll('[data-delete-product]').forEach((button) => {
      button.addEventListener('click', (event) => {
        event.stopPropagation();
        deleteCatalogProduct(button.dataset.deleteProduct);
      });
    });
    document.querySelectorAll('[data-open-collection]').forEach((card) => {
      card.addEventListener('click', () => {
        if (collectionAddContext) return;
        openedCollectionId = card.dataset.openCollection;
        collectionSearch = '';
        renderPicker();
      });
    });
    document.querySelectorAll('[data-heart]').forEach((button) => {
      button.addEventListener('click', (event) => {
        event.stopPropagation();
        toggleFavorite(data.recipes, button.dataset.heart);
      });
    });
    document.querySelectorAll('[data-product-heart]').forEach((button) => {
      button.addEventListener('click', (event) => {
        event.stopPropagation();
        toggleFavorite(data.products, button.dataset.productHeart);
      });
    });
    document.querySelectorAll('[data-recipe]').forEach((card) => {
      card.addEventListener('click', (event) => {
        if (event.target.closest('button')) return;
        openItemDetail('recipe', card.dataset.recipe);
      });
    });
    document.querySelectorAll('[data-product]').forEach((card) => {
      card.addEventListener('click', (event) => {
        if (event.target.closest('button')) return;
        openItemDetail('product', card.dataset.product);
      });
    });
  }

  function toggleFavorite(items, id) {
    const index = items.findIndex((item) => String(item.id) === String(id));
    if (index < 0) return;
    try {
      items[index] = catalogServices.toggleFavorite(items[index]);
      renderPicker();
    } catch (error) {
      console.error('Не удалось изменить избранное каталога', error);
      showToast(error instanceof Error ? error.message : 'Не удалось изменить избранное');
    }
  }

  function openCollectionEditor(collectionId = null) {
    const existing = collectionId
      ? (data.collections || []).find((item) => String(item.id) === String(collectionId))
      : null;
    if (collectionId && !existing) {
      showToast('Подборка не найдена');
      renderPicker();
      return;
    }
    const dialog = ui.renderCollectionModal({ existing, escapeHtml });
    openModal(dialog.title, dialog.body, dialog.actions);
    document.getElementById('collection-cancel').addEventListener('click', () => closeModal(false));
    document.getElementById('collection-save').addEventListener('click', () => {
      const name = document.getElementById('collection-name').value.trim();
      if (!name) {
        showToast('Укажи название подборки');
        return;
      }
      try {
        if (existing) {
          data.collections = catalogServices.renameCollection(data.collections, existing.id, name);
        } else {
          const knownIds = new Set(data.collections.map((item) => String(item.id)));
          let id = `collection-${Date.now()}`;
          while (knownIds.has(id)) id += '-1';
          data.collections = catalogServices.createCollection(data.collections, name, id);
          openedCollectionId = id;
        }
        catalogView = 'collections';
        collectionSearch = '';
        closeModal(false);
        renderPicker();
        showToast(existing ? 'Название подборки изменено' : 'Подборка создана');
      } catch (error) {
        console.error('Не удалось сохранить подборку', error);
        showToast(error instanceof Error ? error.message : 'Не удалось сохранить подборку');
      }
    });
  }

  function deleteCatalogCollection(collectionId) {
    let result;
    try {
      result = catalogServices.deleteCollection(data.collections, collectionId);
    } catch (error) {
      console.error('Не удалось удалить подборку', error);
      showToast(error instanceof Error ? error.message : 'Не удалось удалить подборку');
      return;
    }
    if (!result.removed) return;
    data.collections = result.collections;
    if (String(openedCollectionId) === String(collectionId)) openedCollectionId = null;
    renderPicker();
    showToast('Подборка удалена', 'Отменить', () => {
      try {
        data.collections = catalogServices.restoreCollection(data.collections, result.removed, result.index);
        renderPicker();
        showToast('Подборка восстановлена');
      } catch (error) {
        console.error('Не удалось восстановить подборку', error);
        showToast(error instanceof Error ? error.message : 'Не удалось восстановить подборку');
      }
    });
  }

  function startCollectionAdd() {
    const collection = (data.collections || []).find((item) => String(item.id) === String(openedCollectionId));
    if (!collection) {
      showToast('Подборка не найдена');
      renderPicker();
      return;
    }
    collectionAddContext = { collectionId: collection.id, name: collection.name };
    collectionAddDraft = [];
    catalogView = 'recipes';
    openedCollectionId = null;
    recipeSearch = '';
    productCatalogSearch = '';
    renderPicker();
  }

  function addCollectionDraftItem(kind, id) {
    const collection = (data.collections || []).find((item) => (
      String(item.id) === String(collectionAddContext?.collectionId)
    ));
    if (!collectionAddContext || !collection) {
      showToast('Подборка не найдена');
      return;
    }
    const item = (kind === 'recipe' ? data.recipes : data.products)
      .find((entry) => String(entry.id) === String(id));
    if (!item) {
      showToast('Позиция не найдена');
      return;
    }
    const alreadyAdded = collection.items.some((entry) => (
      entry.kind === kind && String(entry.id) === String(item.id)
    )) || collectionAddDraft.some((entry) => (
      entry.kind === kind && String(entry.id) === String(item.id)
    ));
    if (alreadyAdded) return;
    collectionAddDraft.push({ kind, id: item.id });
    renderPicker();
  }

  function commitCollectionAddDraft() {
    if (!collectionAddContext) return;
    const collectionId = collectionAddContext.collectionId;
    const selected = [...collectionAddDraft];
    try {
      data.collections = catalogServices.addItemsToCollection(data.collections, collectionId, selected);
    } catch (error) {
      console.error('Не удалось добавить позиции в подборку', error);
      showToast(error instanceof Error ? error.message : 'Не удалось добавить позиции');
      return;
    }
    const added = selected.length;
    collectionAddContext = null;
    collectionAddDraft = [];
    catalogView = 'collections';
    openedCollectionId = collectionId;
    collectionSearch = '';
    renderPicker();
    showToast(added ? `Добавлено позиций: ${added}` : 'Новые позиции не выбраны');
  }

  function removeCollectionItem(kind, id) {
    if (!openedCollectionId) return;
    try {
      data.collections = catalogServices.removeItemFromCollection(data.collections, openedCollectionId, kind, id);
      renderPicker();
      showToast('Позиция удалена из подборки');
    } catch (error) {
      console.error('Не удалось удалить позицию из подборки', error);
      showToast(error instanceof Error ? error.message : 'Не удалось удалить позицию');
    }
  }

  function confirmCatalogFilterChange(message) {
    const confirmChange = document.defaultView?.confirm || globalThis.confirm;
    return typeof confirmChange === 'function' && confirmChange.call(document.defaultView, message);
  }

  function openFilterCategoryEditor(isProducts, categoryId) {
    const category = isProducts ? getProductFilterCategory(categoryId) : getRecipeFilterCategory(categoryId);
    if (!category) return;
    const values = isProducts ? getProductFilterCategoryValues(category) : getRecipeFilterCategoryValues(category);
    const customCategories = isProducts ? productCustomFilterCategories : recipeCustomFilterCategories;
    const dialog = isProducts
      ? ui.renderProductFilterCategoryEditorModal({
        categoryLabel: category.label,
        isCustomTags: category.id === 'customTags',
        isRange: category.kind === 'composition',
        values,
        canDelete: customCategories.some((item) => item.id === category.id),
        escapeHtml
      })
      : ui.renderRecipeFilterCategoryEditorModal({
        categoryLabel: category.label,
        isCustomTags: category.id === 'customTags',
        isProductCategory: category.kind === 'products',
        isRangeCategory: ['timeRange', 'composition'].includes(category.kind),
        values: category.kind === 'products' ? [] : values,
        canDelete: customCategories.some((item) => item.id === category.id),
        escapeHtml
      });
    openModal(dialog.title, dialog.body, dialog.actions);
    document.querySelector('.modal').classList.add('filter-admin-modal');
    const prefix = isProducts ? 'product-filter-admin-' : 'filter-admin-';
    const cancelButton = document.getElementById(`${prefix}cancel`);
    const saveButton = document.getElementById(isProducts ? 'product-filter-admin-save' : 'filter-admin-save-category');
    cancelButton.addEventListener('click', () => {
      closeModal();
      renderPicker();
    });
    saveButton.addEventListener('click', () => {
      const name = document.getElementById(`${prefix}category-name`).value.trim();
      if (!name) {
        showToast('Укажи название категории');
        return;
      }
      category.label = name;
      if (category.id === 'customTags') {
        if (isProducts) customProductFilterTitle = name;
        else customRecipeFilterTitle = name;
      }
      closeModal();
      renderPicker();
      showToast('Название категории обновлено');
    });

    const addValueButton = document.getElementById(isProducts ? 'product-filter-admin-add-value' : 'filter-admin-add-value');
    if (addValueButton) {
      addValueButton.addEventListener('click', () => {
        const input = document.getElementById(isProducts ? 'product-filter-admin-new-value' : 'filter-admin-new-value');
        const value = input.value.trim();
        if (!value) {
          showToast('Введи значение');
          return;
        }
        if (!addFilterValue(isProducts, category.id, value)) {
          showToast('Такое значение уже существует');
          return;
        }
        openFilterCategoryEditor(isProducts, category.id);
        showToast('Значение добавлено');
      });
    }

    const saveValueSelector = isProducts ? '[data-product-save-admin-value]' : '[data-save-admin-value]';
    const valueInputAttribute = isProducts ? 'data-product-admin-value-input' : 'data-admin-value-input';
    document.querySelectorAll(saveValueSelector).forEach((button) => {
      button.addEventListener('click', () => {
        const index = Number(button.dataset[isProducts ? 'productSaveAdminValue' : 'saveAdminValue']);
        const oldValue = values[index];
        const newValue = document.querySelector(`[${valueInputAttribute}="${index}"]`)?.value.trim();
        if (!newValue) {
          showToast('Значение не может быть пустым');
          return;
        }
        if (normalizeRecipeFilterValue(oldValue) === normalizeRecipeFilterValue(newValue)) {
          showToast('Изменений нет');
          return;
        }
        if (!renameFilterValue(isProducts, category, oldValue, newValue)) {
          showToast('Такое значение уже существует');
          return;
        }
        openFilterCategoryEditor(isProducts, category.id);
        showToast(`Значение заменено во всех связанных ${isProducts ? 'продуктах' : 'рецептах'}`);
      });
    });

    const deleteValueSelector = isProducts ? '[data-product-delete-admin-value]' : '[data-delete-admin-value]';
    document.querySelectorAll(deleteValueSelector).forEach((button) => {
      button.addEventListener('click', () => {
        const index = Number(button.dataset[isProducts ? 'productDeleteAdminValue' : 'deleteAdminValue']);
        const value = values[index];
        if (!value || !confirmCatalogFilterChange(`Удалить значение «${value}»? Оно также будет убрано из связанных ${isProducts ? 'продуктов' : 'рецептов'}.`)) return;
        deleteFilterValue(isProducts, category, value);
        openFilterCategoryEditor(isProducts, category.id);
        showToast('Значение удалено');
      });
    });

    const deleteCategoryButton = document.getElementById(isProducts ? 'product-filter-admin-delete-category' : 'filter-admin-delete-category');
    if (deleteCategoryButton) {
      deleteCategoryButton.addEventListener('click', () => {
        if (!confirmCatalogFilterChange(`Удалить категорию «${category.label}» из фильтров?`)) return;
        deleteFilterCategory(isProducts, category);
        let settingsSaved = false;
        try {
          saveCatalogCardSettings(catalogCardSettings);
          data.catalogCardSettings = catalogCardSettings;
          settingsSaved = true;
        } catch (error) {
          console.error('Не удалось сохранить настройки карточек', error);
          showToast(error instanceof Error ? error.message : 'Не удалось сохранить настройки карточек');
        }
        closeModal();
        renderPicker();
        if (settingsSaved) showToast('Категория удалена из фильтров');
      });
    }
  }

  function openFilterCategoryCreateModal(isProducts) {
    const dialog = isProducts
      ? ui.renderProductFilterCategoryCreateModal()
      : ui.renderRecipeFilterCategoryCreateModal();
    openModal(dialog.title, dialog.body, dialog.actions);
    document.querySelector('.modal').classList.add('filter-admin-modal');
    const prefix = isProducts ? 'new-product-filter-category-' : 'new-filter-category-';
    document.getElementById(`${prefix}cancel`).addEventListener('click', () => {
      closeModal();
      renderPicker();
    });
    document.getElementById(`${prefix}save`).addEventListener('click', () => {
      const input = document.getElementById(`${prefix}name`);
      const category = createFilterCategory(isProducts, input.value);
      if (!category) {
        showToast('Укажи название категории');
        return;
      }
      data.catalogCardSettings = catalogCardSettings;
      closeModal();
      if (isProducts) {
        productFiltersOpen = true;
        productFilterMode = 'standard';
      } else {
        recipeFiltersOpen = true;
        recipeFilterMode = 'standard';
      }
      renderPicker();
      openFilterCategoryEditor(isProducts, category.id);
    });
  }

  function openCatalogCardSettings(isProducts) {
    const group = isProducts ? 'products' : 'recipes';
    const recipeDescriptions = {
      time: 'Время приготовления в минутах.',
      mealTypes: 'Завтрак, обед, ужин и другие приёмы пищи.',
      cuisines: 'Кухня или кулинарная традиция.',
      dishTypes: 'Тип блюда.',
      allergens: 'Аллергены, указанные для рецепта.',
      categories: 'Категории продуктов в составе рецепта.',
      composition: 'Калории, белки, жиры и углеводы на 100 г.',
      products: 'Продукты и ингредиенты рецепта.'
    };
    const productDescriptions = {
      brand: 'Название производителя или марки продукта.',
      energy: 'Калорийность на 100 г или 100 мл.',
      macros: 'Белки, жиры и углеводы на 100 г или 100 мл.',
      categories: 'Категории продукта.',
      components: 'Полезные компоненты и их количество.',
      allergens: 'Аллергены, указанные для продукта.',
      state: 'Состояние продукта: сырой, сухой, приготовленный и т. д.',
      tags: 'Пользовательские теги продукта.'
    };
    const categories = isProducts
      ? [...productStandardFilters, ...productCustomFilterCategories]
      : [...recipeStandardFilters, ...recipeCustomFilterCategories];
    const options = isProducts
      ? [
        ['brand', 'Производитель', productDescriptions.brand],
        ['energy', 'Калорийность', productDescriptions.energy],
        ['macros', 'КБЖУ', productDescriptions.macros],
        ['categories', 'Категория продукта', productDescriptions.categories],
        ['components', 'Полезные компоненты', productDescriptions.components],
        ['allergens', 'Аллергены', productDescriptions.allergens],
        ['state', 'Состояние продукта', productDescriptions.state],
        ['tags', 'Пользовательские теги', productDescriptions.tags],
        ...productCustomFilterCategories.map((category) => (
          [category.id, category.label, 'Дополнительная характеристика продукта.']
        ))
      ]
      : [
        ...categories.map((category) => (
          [category.id, category.label, recipeDescriptions[category.id] || 'Значения дополнительной категории.']
        )),
        ['customTags', customRecipeFilterTitle, 'Теги, добавленные к рецепту пользователем.']
      ];
    const dialog = ui.renderCatalogCardSettingsModal({
      isProducts,
      options,
      settings: catalogCardSettings[group],
      escapeHtml
    });
    openModal(dialog.title, dialog.body, dialog.actions);
    document.getElementById('card-display-cancel').addEventListener('click', closeModal);
    document.getElementById('card-display-save').addEventListener('click', () => {
      const next = {
        recipes: { ...catalogCardSettings.recipes },
        products: { ...catalogCardSettings.products }
      };
      document.querySelectorAll('#modal-body [data-card-display-key]').forEach((input) => {
        next[group][input.dataset.cardDisplayKey] = input.checked;
      });
      next.recipes = { ...catalogCardSettings.recipes, ...next.recipes };
      next.products = { ...catalogCardSettings.products, ...next.products };
      const normalized = normalizeCatalogCardSettings(next, {
        recipeCustomCategories: recipeCustomFilterCategories,
        productCustomCategories: productCustomFilterCategories
      });
      try {
        if (typeof saveCatalogCardSettings !== 'function') {
          throw new TypeError('Catalog card settings repository is unavailable.');
        }
        saveCatalogCardSettings(normalized);
        catalogCardSettings = normalized;
        data.catalogCardSettings = normalized;
        closeModal();
        renderPicker();
        showToast('Настройки отображения сохранены');
      } catch (error) {
        console.error('Не удалось сохранить настройки карточек', error);
        showToast(error instanceof Error ? error.message : 'Не удалось сохранить настройки карточек');
      }
    });
  }

  function openItemDetail(kind, id) {
    const items = kind === 'recipe' ? data.recipes : data.products;
    const item = items.find((entry) => String(entry.id) === String(id));
    if (!item) return;
    const isRecipe = kind === 'recipe';
    const nutrition = isRecipe
      ? calculateRecipeNutrition(item, data.products).per100
      : item;
    const ingredients = isRecipe
      ? (item.ingredientItems || []).map((row) => {
        const product = data.products.find((entry) => String(entry.id) === String(row.productId));
        return `<li>${escapeHtml(product?.name || row.productName || row.name || 'Продукт')}${row.amount ? ` — ${formatNumber(row.amount)} ${escapeHtml(row.unit || 'г')}` : ''}</li>`;
      }).join('')
      : '';
    const body = `<div class="recipe-detail-section"><p>${escapeHtml(item.description || item.brand || '')}</p><div class="macros"><span class="macro">${formatNumber(nutrition.kcal)} ккал</span><span class="macro">Б ${formatNumber(nutrition.p)}</span><span class="macro">Ж ${formatNumber(nutrition.f)}</span><span class="macro">У ${formatNumber(nutrition.c)}</span><small>на 100 г</small></div>${isRecipe ? `<h3>Состав</h3><ul>${ingredients || '<li>Состав не указан</li>'}</ul>${item.steps?.length ? `<h3>Приготовление</h3><ol>${item.steps.map((step) => `<li>${escapeHtml(typeof step === 'string' ? step : step.text || step.name || '')}</li>`).join('')}</ol>` : ''}` : ''}</div>`;
    const actions = recipeIngredientPickContext
      ? '<button type="button" class="btn" id="catalog-detail-cancel">Назад</button><button type="button" class="btn-primary" id="catalog-detail-add">Добавить в рецепт</button>'
      : collectionAddContext
      ? '<button type="button" class="btn" id="catalog-detail-cancel">Назад</button><button type="button" class="btn-primary" id="catalog-detail-add">Добавить в подборку</button>'
      : context
      ? '<button type="button" class="btn" id="catalog-detail-cancel">Назад</button><button type="button" class="btn-primary" id="catalog-detail-add">Добавить в приём</button>'
      : isRecipe
        ? '<button type="button" class="btn" id="catalog-detail-edit">Редактировать</button><button type="button" class="btn-primary" id="catalog-detail-cancel">Закрыть</button>'
        : '<button type="button" class="btn-primary" id="catalog-detail-cancel">Закрыть</button>';
    openModal(item.name, body, actions);
    document.getElementById('catalog-detail-cancel').addEventListener('click', () => {
      closeModal(false);
      renderPicker();
    });
    const editRecipe = document.getElementById('catalog-detail-edit');
    if (editRecipe) editRecipe.addEventListener('click', () => openRecipeEditor(item.id));
    const addToMeal = document.getElementById('catalog-detail-add');
    if (addToMeal) addToMeal.addEventListener('click', () => {
      closeModal(false);
      if (recipeIngredientPickContext) {
        toggleRecipeIngredientPick(item.id);
      } else if (collectionAddContext) {
        addCollectionDraftItem(kind, item.id);
      } else {
        addItem(kind, item.id);
      }
    });
  }

  function productTokenFieldMarkup(id, label, selected, mode = 'multiple') {
    const values = mode === 'single'
      ? (Array.isArray(selected) ? selected.slice(0, 1) : [String(selected || '').trim()]).filter(Boolean)
      : (Array.isArray(selected) ? selected : []);
    const chips = values.map((value) => (
      `<span class="recipe-token-chip">${escapeHtml(value)}<button type="button" data-product-token-remove="${escapeHtml(id)}" aria-label="Убрать ${escapeHtml(value)}">×</button></span>`
    )).join('');
    return `<div class="field full recipe-token-field" data-product-token-field="${escapeHtml(id)}" data-token-mode="${mode}"><label>${escapeHtml(label)}</label><div class="recipe-token-control"><div class="recipe-token-selected">${chips}</div><input type="text" data-product-token-input placeholder="Введи значение и нажми Enter…" autocomplete="off"></div></div>`;
  }

  function bindProductTokenFields() {
    document.querySelectorAll('#modal-body [data-product-token-field]').forEach((field) => {
      const input = field.querySelector('[data-product-token-input]');
      input.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ',') return;
        event.preventDefault();
        const value = input.value.trim().replace(/,$/, '');
        if (!value) return;
        const selected = field.querySelector('.recipe-token-selected');
        const existing = [...selected.querySelectorAll('.recipe-token-chip')]
          .map((chip) => chip.firstChild?.textContent?.trim().toLocaleLowerCase('ru-RU'));
        if (field.dataset.tokenMode === 'single') selected.replaceChildren();
        else if (existing.includes(value.toLocaleLowerCase('ru-RU'))) {
          input.value = '';
          return;
        }
        const chip = document.createElement('span');
        chip.className = 'recipe-token-chip';
        const text = document.createTextNode(value);
        const remove = document.createElement('button');
        remove.type = 'button';
        remove.dataset.productTokenRemove = field.dataset.productTokenField;
        remove.setAttribute('aria-label', `Убрать ${value}`);
        remove.textContent = '×';
        chip.append(text, remove);
        selected.append(chip);
        input.value = '';
      });
      field.addEventListener('click', (event) => {
        const remove = event.target.closest('[data-product-token-remove]');
        if (remove) remove.closest('.recipe-token-chip')?.remove();
      });
    });
  }

  function readProductTokenValues(fieldId, includeInput = true) {
    const field = document.querySelector(`#modal-body [data-product-token-field="${fieldId}"]`);
    if (!field) return [];
    const values = [...field.querySelectorAll('.recipe-token-chip')]
      .map((chip) => chip.firstChild?.textContent?.trim() || '')
      .filter(Boolean);
    if (includeInput) {
      const pending = field.querySelector('[data-product-token-input]')?.value.trim();
      if (pending) values.push(pending);
    }
    const unique = [...new Map(values.map((value) => [value.toLocaleLowerCase('ru-RU'), value])).values()];
    return field.dataset.tokenMode === 'single' ? unique.slice(0, 1) : unique;
  }

  function recipeIngredientRowMarkup(ingredient = {}) {
    const product = data.products.find((item) => String(item.id) === String(ingredient.productId));
    const productName = product?.name || ingredient.productName || ingredient.name || 'Продукт';
    const missingOption = ingredient.productId && !product
      ? `<option value="${escapeHtml(ingredient.productId)}" selected>${escapeHtml(productName)} — нет в каталоге</option>`
      : '';
    const options = data.products.map((item) => (
      `<option value="${escapeHtml(item.id)}" ${String(item.id) === String(ingredient.productId) ? 'selected' : ''}>${escapeHtml(item.name)}</option>`
    )).join('');
    const unit = ingredient.unit || (ingredient.grams !== undefined ? 'г' : product?.basisUnit === 'мл' ? 'мл' : 'г');
    const amount = ingredient.amount ?? ingredient.grams ?? 100;
    return `<div class="recipe-editor-ingredient" data-editor-ingredient-row><select aria-label="Продукт для ингредиента" data-ingredient-product>${missingOption}${options}</select><label class="recipe-editor-amount"><span>Количество</span><input type="number" min="0.1" step="0.1" value="${escapeHtml(amount)}" data-ingredient-amount></label><select class="recipe-editor-unit" aria-label="Единица количества" data-ingredient-unit><option value="г" ${unit === 'г' ? 'selected' : ''}>г</option><option value="мл" ${unit === 'мл' ? 'selected' : ''}>мл</option></select><button type="button" class="entry-action" data-remove-ingredient aria-label="Удалить ингредиент">×</button><small class="recipe-ingredient-unit-help" data-ingredient-help></small></div>`;
  }

  function recipeComponentRowMarkup(component = {}) {
    const units = ['мг', 'мкг', 'г', 'МЕ'];
    return `<div class="product-nutrient-row" data-recipe-component-row><input type="text" data-recipe-component-name placeholder="Например, витамин C" value="${escapeHtml(component.name || '')}"><input type="number" min="0" step="any" data-recipe-component-amount placeholder="Количество на 100 г" value="${component.amount ?? ''}"><select data-recipe-component-unit aria-label="Единица измерения">${units.map((unit) => `<option value="${unit}" ${component.unit === unit ? 'selected' : ''}>${unit}</option>`).join('')}</select><button type="button" class="entry-action" data-recipe-component-remove aria-label="Удалить нутриент">×</button></div>`;
  }

  function readRecipeIngredientRows(list, allowIncomplete = false) {
    return [...list.querySelectorAll('[data-editor-ingredient-row]')].flatMap((row) => {
      const select = row.querySelector('[data-ingredient-product]');
      const amountValue = row.querySelector('[data-ingredient-amount]').value.trim();
      const productId = select.value;
      const product = data.products.find((item) => String(item.id) === String(productId));
      const amount = Number(amountValue);
      if (!productId || !amountValue || !Number.isFinite(amount) || amount <= 0) {
        if (allowIncomplete && (!amountValue || !Number.isFinite(amount) || amount <= 0)) return [];
        throw new TypeError('Укажи продукт и количество больше 0 для каждого ингредиента.');
      }
      const unit = row.querySelector('[data-ingredient-unit]').value;
      return [{
        productId,
        amount,
        unit,
        ...(unit === 'г' ? { grams: amount } : {}),
        productName: product?.name || select.selectedOptions[0]?.textContent.replace(/\s+— нет в каталоге$/, '') || '',
        productAllergens: Array.isArray(product?.allergens) ? [...product.allergens] : []
      }];
    });
  }

  function readRecipeComponents(list, allowIncomplete = false) {
    const components = [];
    for (const row of list.querySelectorAll('[data-recipe-component-row]')) {
      const name = row.querySelector('[data-recipe-component-name]').value.trim();
      const amountValue = row.querySelector('[data-recipe-component-amount]').value.trim();
      if (!name && !amountValue) continue;
      const amount = Number(amountValue);
      if (!name || !amountValue || !Number.isFinite(amount) || amount < 0) {
        if (allowIncomplete) continue;
        throw new TypeError('Заполни название и корректное количество для каждого нутриента.');
      }
      components.push({
        name,
        amount,
        unit: row.querySelector('[data-recipe-component-unit]').value
      });
    }
    return components;
  }

  function recipeNutritionPreviewMarkup(recipe) {
    const nutrition = calculateRecipeNutrition(recipe, data.products);
    return `<div class="recipe-editor-preview"><div><span>Всего в блюде</span><b>${formatNumber(nutrition.total.kcal)} ккал</b></div><div><span>На 100 г</span><b>${formatNumber(nutrition.per100.kcal)} ккал</b></div><div><span>Порция ${formatNumber(nutrition.portionGrams)} г</span><b>${formatNumber(nutrition.portion.kcal)} ккал</b></div></div>`;
  }

  function readRecipeEditorFields(draft, rows, components) {
    const mealTypes = readProductTokenValues('recipe-meal-types');
    const dishTypes = readProductTokenValues('recipe-dish-types');
    const customAttributes = { ...(draft.customAttributes || {}) };
    recipeCustomFilterCategories.forEach((category) => {
      customAttributes[category.id] = readProductTokenValues(`recipe-custom-${category.id}`);
    });
    return {
      ...draft,
      name: document.getElementById('recipe-edit-name').value.trim(),
      emoji: document.getElementById('recipe-edit-emoji').value.trim() || '🍽️',
      time: Number(document.getElementById('recipe-edit-time').value),
      difficulty: document.getElementById('recipe-edit-difficulty').value,
      mealTypes,
      cuisine: readProductTokenValues('recipe-cuisine')[0] || '',
      dishTypes,
      dishType: dishTypes[0] || '',
      allergens: readProductTokenValues('recipe-allergens'),
      categories: readProductTokenValues('recipe-categories'),
      tags: readProductTokenValues('recipe-tags'),
      customAttributes,
      totalWeight: Number(document.getElementById('recipe-edit-yield').value),
      portionGrams: Number(document.getElementById('recipe-edit-portion').value),
      ingredientItems: rows,
      components,
      steps: document.getElementById('recipe-edit-steps').value
        .split('\n').map((step) => step.trim()).filter(Boolean)
    };
  }

  function openRecipeEditor(existingId = null, resumeDraft = null) {
    const existing = existingId === null
      ? null
      : data.recipes.find((recipe) => String(recipe.id) === String(existingId));
    if (existingId !== null && !existing) {
      showToast('Рецепт больше не найден');
      renderPicker();
      return;
    }
    const draft = resumeDraft
      ? JSON.parse(JSON.stringify(resumeDraft))
      : existing
        ? JSON.parse(JSON.stringify(existing))
        : {
          name: '',
          emoji: '🍽️',
          time: 20,
          difficulty: 'Легко',
          cuisine: 'Домашняя',
          mealTypes: [],
          dishTypes: [],
          allergens: [],
          categories: [],
          tags: [],
          totalWeight: 300,
          portionGrams: 200,
          ingredientItems: [],
          components: [],
          steps: [],
          customAttributes: {},
          favorite: false,
          mine: true
        };
    draft.ingredientItems = Array.isArray(draft.ingredientItems) ? draft.ingredientItems : [];
    draft.components = Array.isArray(draft.components) ? draft.components : [];
    draft.steps = Array.isArray(draft.steps) ? draft.steps : [];
    draft.mealTypes = Array.isArray(draft.mealTypes)
      ? draft.mealTypes
      : draft.mealType ? [draft.mealType] : [];
    draft.dishTypes = Array.isArray(draft.dishTypes)
      ? draft.dishTypes
      : draft.dishType ? [draft.dishType] : [];
    draft.allergens = Array.isArray(draft.allergens) ? draft.allergens : [];
    draft.categories = Array.isArray(draft.categories) ? draft.categories : getRecipeCategories(draft);
    draft.tags = Array.isArray(draft.tags) ? draft.tags : [];
    const rows = document.createElement('div');
    rows.innerHTML = draft.ingredientItems.map(recipeIngredientRowMarkup).join('');
    const componentList = document.createElement('div');
    componentList.innerHTML = draft.components.map(recipeComponentRowMarkup).join('');
    const metadataMarkup = [
      productTokenFieldMarkup('recipe-meal-types', 'Приёмы пищи', draft.mealTypes),
      productTokenFieldMarkup('recipe-cuisine', 'Тип кухни', draft.cuisine, 'single'),
      productTokenFieldMarkup('recipe-dish-types', 'Тип блюда', draft.dishTypes),
      productTokenFieldMarkup('recipe-allergens', 'Аллергены', draft.allergens),
      productTokenFieldMarkup('recipe-categories', 'Категории', draft.categories),
      productTokenFieldMarkup('recipe-tags', 'Теги', draft.tags),
      ...recipeCustomFilterCategories.map((category) => (
        productTokenFieldMarkup(
          `recipe-custom-${category.id}`,
          category.label,
          recipeArray(draft.customAttributes?.[category.id])
        )
      ))
    ].join('');
    const dialog = ui.renderRecipeEditorModal({
      existing,
      draft,
      ingredientMarkup: rows.innerHTML,
      componentMarkup: componentList.innerHTML,
      metadataMarkup,
      nutritionPreview: recipeNutritionPreviewMarkup(draft),
      escapeHtml
    });
    openModal(dialog.title, dialog.body, dialog.actions);
    document.querySelector('.modal').classList.add('recipe-edit-modal');
    bindProductTokenFields();
    const ingredientList = document.getElementById('recipe-editor-ingredients');
    const nutrientList = document.getElementById('recipe-component-list');
    const nutritionPreview = document.getElementById('recipe-editor-nutrition-preview');

    const readRows = () => readRecipeIngredientRows(ingredientList);
    const readComponents = () => readRecipeComponents(nutrientList);
    const updatePreview = () => {
      const recipe = {
        ...draft,
        ingredientItems: readRecipeIngredientRows(ingredientList, true),
        components: readRecipeComponents(nutrientList, true),
        totalWeight: Number(document.getElementById('recipe-edit-yield').value) || 300,
        portionGrams: Number(document.getElementById('recipe-edit-portion').value) || 200
      };
      nutritionPreview.innerHTML = recipeNutritionPreviewMarkup(recipe);
    };
    const updateIngredientHints = () => {
      ingredientList.querySelectorAll('[data-editor-ingredient-row]').forEach((row) => {
        const product = data.products.find((item) => (
          String(item.id) === String(row.querySelector('[data-ingredient-product]').value)
        ));
        const unit = row.querySelector('[data-ingredient-unit]').value;
        const help = row.querySelector('[data-ingredient-help]');
        if (!product || !help) return;
        const basisUnit = product.basisUnit === 'мл' ? 'мл' : 'г';
        help.textContent = unit === basisUnit
          ? `Основа продукта: на 100 ${basisUnit}.`
          : Number(product.density) > 0
            ? `Пересчёт по плотности ${formatNumber(product.density)} г/мл.`
            : 'Для пересчёта г ↔ мл укажи плотность продукта в его редакторе.';
      });
    };
    const captureDraft = () => {
      const rowsSnapshot = readRows();
      const componentsSnapshot = readComponents();
      return readRecipeEditorFields(draft, rowsSnapshot, componentsSnapshot);
    };

    document.getElementById('recipe-edit-image-file').addEventListener('change', (event) => {
      const file = event.currentTarget.files?.[0];
      if (!file) return;
      if (!file.type.startsWith('image/')) {
        showToast('Выбери файл изображения');
        return;
      }
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        draft.imageData = String(reader.result || '');
        document.getElementById('recipe-image-preview').innerHTML = `<img src="${escapeHtml(draft.imageData)}" alt="Предпросмотр блюда">`;
      });
      reader.addEventListener('error', () => {
        console.error('Не удалось прочитать изображение рецепта', reader.error);
        showToast('Не удалось открыть выбранное изображение');
      });
      reader.readAsDataURL(file);
    });
    ingredientList.addEventListener('input', updatePreview);
    ingredientList.addEventListener('change', () => {
      updateIngredientHints();
      updatePreview();
    });
    ingredientList.addEventListener('click', (event) => {
      const remove = event.target.closest('[data-remove-ingredient]');
      if (!remove) return;
      remove.closest('[data-editor-ingredient-row]').remove();
      updatePreview();
    });
    nutrientList.addEventListener('input', updatePreview);
    nutrientList.addEventListener('click', (event) => {
      const remove = event.target.closest('[data-recipe-component-remove]');
      if (!remove) return;
      remove.closest('[data-recipe-component-row]').remove();
      if (!nutrientList.querySelector('[data-recipe-component-row]')) {
        nutrientList.innerHTML = '<div class="filter-admin-note">Пока нутриенты не добавлены.</div>';
      }
      updatePreview();
    });
    document.getElementById('recipe-add-component').addEventListener('click', () => {
      if (nutrientList.querySelector('.filter-admin-note')) nutrientList.innerHTML = '';
      nutrientList.insertAdjacentHTML('beforeend', recipeComponentRowMarkup());
      nutrientList.querySelector('[data-recipe-component-row]:last-child [data-recipe-component-name]').focus();
    });
    document.getElementById('recipe-add-ingredient').addEventListener('click', () => {
      let rowsSnapshot;
      let componentsSnapshot;
      try {
        rowsSnapshot = readRows();
        componentsSnapshot = readComponents();
      } catch (error) {
        showToast(error.message);
        return;
      }
      const currentDraft = readRecipeEditorFields(draft, rowsSnapshot, componentsSnapshot);
      recipeIngredientPickContext = {
        draft: currentDraft,
        existingId: existing?.id ?? null
      };
      recipeIngredientPickDraft = [];
      catalogView = 'myProducts';
      productCatalogSearch = '';
      openedCollectionId = null;
      closeModal(false);
      navigatePage('recipes');
    });
    ['recipe-edit-yield', 'recipe-edit-portion'].forEach((id) => {
      document.getElementById(id).addEventListener('input', updatePreview);
    });
    document.getElementById('recipe-editor-cancel').addEventListener('click', () => {
      closeModal(false);
      if (existing) openItemDetail('recipe', existing.id);
      else renderPicker();
    });
    document.getElementById('recipe-editor-save').addEventListener('click', () => {
      let recipeDraft;
      try {
        recipeDraft = captureDraft();
      } catch (error) {
        showToast(error instanceof Error ? error.message : 'Проверь данные рецепта');
        return;
      }
      if (!recipeDraft.name || recipeDraft.name.length > 120) {
        showToast('Укажи название рецепта до 120 символов');
        document.getElementById('recipe-edit-name').focus();
        return;
      }
      if (!recipeDraft.ingredientItems.length) {
        showToast('Добавь хотя бы один ингредиент');
        return;
      }
      for (const ingredient of recipeDraft.ingredientItems) {
        const product = data.products.find((item) => (
          String(item.id) === String(ingredient.productId)
        ));
        const basisUnit = product?.basisUnit === 'мл' ? 'мл' : 'г';
        if (product && ingredient.unit !== basisUnit && !(Number(product.density) > 0)) {
          showToast(`Для перевода г/мл укажи плотность продукта «${product.name}»`);
          return;
        }
      }
      if (!Number.isFinite(recipeDraft.totalWeight) || recipeDraft.totalWeight <= 0
        || !Number.isFinite(recipeDraft.portionGrams) || recipeDraft.portionGrams <= 0) {
        showToast('Проверь вес готового блюда и размер порции');
        return;
      }
      if (!Number.isFinite(recipeDraft.time) || recipeDraft.time < 0 || recipeDraft.time > 1440) {
        showToast('Время готовки должно быть от 0 до 1440 минут');
        return;
      }
      recipeDraft.allergens = [...new Map([
        ...recipeDraft.allergens,
        ...recipeDraft.ingredientItems.flatMap((item) => item.productAllergens || [])
      ].map((value) => [String(value).trim().toLocaleLowerCase('ru-RU'), String(value).trim()])).values()]
        .filter(Boolean);
      try {
        const result = catalogServices.saveRecipe({
          recipes: data.recipes,
          products: data.products,
          draft: recipeDraft,
          existingId: existing?.id ?? null
        });
        data.recipes = result.recipes;
        closeModal(false);
        renderPicker();
        if (existing) {
          openItemDetail('recipe', result.recipe.id);
          showToast('Рецепт обновлён');
        } else {
          catalogView = 'recipes';
          recipeSearch = '';
          renderPicker();
          showToast('Рецепт создан');
        }
      } catch (error) {
        console.error('Не удалось сохранить рецепт', error);
        showToast(error instanceof Error ? error.message : 'Не удалось сохранить рецепт');
      }
    });
    updateIngredientHints();
  }

  function toggleRecipeIngredientPick(productId) {
    if (!recipeIngredientPickContext) return;
    const product = data.products.find((item) => String(item.id) === String(productId));
    if (!product) {
      showToast('Продукт больше не найден');
      renderPicker();
      return;
    }
    if (recipeIngredientPickContext.draft.ingredientItems.some((item) => (
      String(item.productId) === String(product.id)
    ))) return;
    const index = recipeIngredientPickDraft.findIndex((item) => String(item.id) === String(product.id));
    if (index >= 0) recipeIngredientPickDraft.splice(index, 1);
    else recipeIngredientPickDraft.push(product);
    renderPicker();
  }

  function commitRecipeIngredientPickDraft() {
    if (!recipeIngredientPickContext) return;
    const { draft: recipeDraft, existingId } = recipeIngredientPickContext;
    let added = 0;
    for (const product of recipeIngredientPickDraft) {
      if (recipeDraft.ingredientItems.some((item) => String(item.productId) === String(product.id))) continue;
      const unit = product.basisUnit === 'мл' ? 'мл' : 'г';
      recipeDraft.ingredientItems.push({
        productId: product.id,
        amount: 100,
        unit,
        ...(unit === 'г' ? { grams: 100 } : {}),
        productName: product.name,
        productAllergens: Array.isArray(product.allergens) ? [...product.allergens] : []
      });
      added += 1;
    }
    recipeIngredientPickContext = null;
    recipeIngredientPickDraft = [];
    catalogView = 'recipes';
    navigatePage('recipes');
    openRecipeEditor(existingId, recipeDraft);
    showToast(added ? `Добавлено ингредиентов: ${added}` : 'Новые продукты не выбраны');
  }

  function productNutrientRowMarkup(component = {}) {
    const units = ['мг', 'мкг', 'г', 'МЕ'];
    return `<div class="product-nutrient-row" data-product-nutrient-row><div class="product-nutrient-name-wrap"><input type="text" data-product-nutrient-name placeholder="Например, витамин C" value="${escapeHtml(component.name || '')}"></div><input type="number" min="0" step="any" data-product-nutrient-amount placeholder="Количество" value="${component.amount ?? ''}"><select data-product-nutrient-unit aria-label="Единица измерения">${units.map((unit) => `<option value="${unit}" ${component.unit === unit ? 'selected' : ''}>${unit}</option>`).join('')}</select><button type="button" class="entry-action" data-product-nutrient-remove aria-label="Удалить компонент">×</button></div>`;
  }

  function readProductNutrientRows(list) {
    const components = [];
    for (const row of list.querySelectorAll('[data-product-nutrient-row]')) {
      const name = row.querySelector('[data-product-nutrient-name]').value.trim();
      const amountValue = row.querySelector('[data-product-nutrient-amount]').value.trim();
      const amount = Number(amountValue);
      if (!name && !amountValue) continue;
      if (!name || !amountValue || !Number.isFinite(amount) || amount < 0) {
        throw new TypeError('Заполни название и корректное количество для каждого компонента.');
      }
      components.push({
        name,
        amount,
        unit: row.querySelector('[data-product-nutrient-unit]').value
      });
    }
    return components;
  }

  function openProductEditor(existingId = null, resumeDraft = null) {
    const existing = existingId === null
      ? null
      : data.products.find((product) => String(product.id) === String(existingId));
    if (existingId !== null && !existing) {
      showToast('Продукт больше не найден');
      renderPicker();
      return;
    }
    const draft = resumeDraft
      ? { ...resumeDraft }
      : existing
        ? JSON.parse(JSON.stringify(existing))
        : {
          name: '',
          brand: '',
          kcal: 0,
          p: 0,
          f: 0,
          c: 0,
          basisUnit: 'г',
          density: null,
          categories: [],
          components: [],
          allergens: [],
          state: [],
          tags: [],
          customAttributes: {}
        };
    const dialog = ui.renderProductEditorModal({
      existing,
      draft,
      brandField: productTokenFieldMarkup('product-brand', 'Производитель / марка (необязательно)', draft.brand, 'single'),
      categoriesField: productTokenFieldMarkup('product-categories', 'Категория продукта', draft.categories),
      allergensField: productTokenFieldMarkup('product-allergens', 'Аллергены', draft.allergens),
      stateField: productTokenFieldMarkup('product-state', 'Состояние продукта', draft.state, 'single'),
      tagsField: productTokenFieldMarkup('product-tags', 'Пользовательские теги', draft.tags),
      customFieldsMarkup: productCustomFilterCategories.map((category) => (
        productTokenFieldMarkup(
          `product-custom-${category.id}`,
          category.label,
          recipeArray(draft.customAttributes?.[category.id])
        )
      )).join(''),
      componentRows: (Array.isArray(draft.components) ? draft.components : [])
        .map((component) => productNutrientRowMarkup(component)).join(''),
      escapeHtml
    });
    openModal(dialog.title, dialog.body, dialog.actions);
    bindProductTokenFields();
    const nutrientList = document.getElementById('product-nutrient-list');
    document.getElementById('product-add-nutrient').addEventListener('click', () => {
      if (nutrientList.querySelector('.filter-admin-note')) nutrientList.innerHTML = '';
      nutrientList.insertAdjacentHTML('beforeend', productNutrientRowMarkup());
      nutrientList.querySelector('[data-product-nutrient-row]:last-child [data-product-nutrient-name]').focus();
    });
    nutrientList.addEventListener('click', (event) => {
      const remove = event.target.closest('[data-product-nutrient-remove]');
      if (!remove) return;
      remove.closest('[data-product-nutrient-row]').remove();
      if (!nutrientList.querySelector('[data-product-nutrient-row]')) {
        nutrientList.innerHTML = '<div class="filter-admin-note">Пока компоненты не добавлены.</div>';
      }
    });
    document.getElementById('my-product-cancel').addEventListener('click', closeModal);
    document.getElementById('my-product-save').addEventListener('click', () => saveProductEditor(existing, draft, nutrientList));
  }

  function saveProductEditor(existing, draft, nutrientList) {
    const name = document.getElementById('my-product-name').value.trim();
    if (!name || name.length > 100) {
      showToast('Укажи название продукта до 100 символов');
      document.getElementById('my-product-name').focus();
      return;
    }
    const values = {
      kcal: Number(document.getElementById('my-product-kcal').value),
      p: Number(document.getElementById('my-product-p').value),
      f: Number(document.getElementById('my-product-f').value),
      c: Number(document.getElementById('my-product-c').value)
    };
    if (Object.values(values).some((value) => !Number.isFinite(value) || value < 0)) {
      showToast('Проверь значения КБЖУ');
      return;
    }
    let components;
    try {
      components = readProductNutrientRows(nutrientList);
    } catch (error) {
      showToast(error.message);
      return;
    }
    const densityRaw = document.getElementById('my-product-density').value.trim();
    const density = densityRaw ? Number(densityRaw) : null;
    if (densityRaw && (!Number.isFinite(density) || density <= 0 || density > 100)) {
      showToast('Укажи плотность больше 0 и не более 100 г/мл');
      return;
    }
    const productData = {
      name,
      brand: readProductTokenValues('product-brand')[0] || '',
      basisUnit: document.getElementById('my-product-basis').value,
      density,
      ...values,
      categories: readProductTokenValues('product-categories'),
      allergens: readProductTokenValues('product-allergens'),
      state: readProductTokenValues('product-state'),
      tags: readProductTokenValues('product-tags'),
      components,
      customAttributes: {
        ...(draft.customAttributes || {}),
        ...Object.fromEntries(productCustomFilterCategories.map((category) => [
          category.id,
          readProductTokenValues(`product-custom-${category.id}`)
        ]))
      }
    };
    saveProductData(existing, draft, productData);
  }

  function saveProductData(existing, draft, productData, confirmDensityChange = false) {
    let result;
    try {
      result = catalogServices.saveProduct({
        products: data.products,
        recipes: data.recipes,
        productData,
        existingId: existing?.id ?? null,
        confirmDensityChange
      });
    } catch (error) {
      console.error('Не удалось сохранить продукт', error);
      showToast(error instanceof Error ? error.message : 'Не удалось сохранить продукт');
      return;
    }
    if (result.status === 'confirmation-required') {
      const names = result.affectedRecipes.slice(0, 5).map((recipe) => recipe.name).join(', ');
      const remaining = result.affectedRecipes.length > 5
        ? ` и ещё ${result.affectedRecipes.length - 5}`
        : '';
      const body = `<p>Изменение плотности повлияет на ${result.affectedRecipes.length} рецептов: ${escapeHtml(names)}${remaining}. Подтвердить изменение и пересчитать пищевую ценность?</p>`;
      openModal(
        'Изменить плотность продукта?',
        body,
        '<button type="button" class="btn" id="density-change-cancel">Назад</button><button type="button" class="btn-primary" id="density-change-confirm">Подтвердить</button>'
      );
      document.getElementById('density-change-cancel').addEventListener('click', () => openProductEditor(existing.id, productData));
      document.getElementById('density-change-confirm').addEventListener('click', () => {
        saveProductData(existing, draft, productData, true);
      });
      return;
    }
    if (result.status !== 'saved') {
      showToast('Не удалось подтвердить изменение плотности продукта');
      return;
    }
    data.products = result.products;
    data.recipes = result.recipes;
    closeModal();
    catalogView = 'myProducts';
    productCatalogSearch = '';
    openedCollectionId = null;
    renderPicker();
    showToast(existing
      ? result.recalculatedRecipeCount
        ? `Продукт обновлён · пересчитано рецептов: ${result.recalculatedRecipeCount}`
        : 'Продукт обновлён'
      : 'Продукт добавлен в «Мои продукты»');
  }

  function deleteCatalogProduct(productId) {
    let deletion;
    try {
      deletion = catalogServices.deleteProduct({
        products: data.products,
        recipes: data.recipes,
        productId
      });
    } catch (error) {
      console.error('Не удалось удалить продукт каталога', error);
      showToast(error instanceof Error ? error.message : 'Не удалось удалить продукт');
      return;
    }
    data.products = deletion.products;
    data.recipes = deletion.recipes;
    renderPicker();
    showToast('Продукт удалён', 'Отменить', () => {
      try {
        const restored = catalogServices.restoreProduct({
          products: data.products,
          recipes: data.recipes,
          product: deletion.removed,
          index: deletion.index
        });
        data.products = restored.products;
        data.recipes = restored.recipes;
        renderPicker();
      } catch (error) {
        console.error('Не удалось восстановить продукт', error);
        showToast(error instanceof Error ? error.message : 'Не удалось восстановить продукт');
      }
    });
  }

  function save() {
    if (!context || !draft.length) return;
    const invalid = draft.find((item) => (
      !Number.isFinite(item.grams) || item.grams <= 0 || item.grams > 30000
    ));
    if (invalid) {
      showToast('Укажи количество больше 0 и не более 30000 г');
      return;
    }
    if (context.massEntry) {
      context.onSave(draft);
      return;
    }
    if (context.replaceEntry && draft.length !== 1) {
      showToast('Для замены выбери одну позицию');
      return;
    }
    try {
      if (context.replaceEntry) {
        const item = draft[0];
        data.diaryEntries = diaryServices.replaceEntry({
          entries: data.diaryEntries,
          id: context.replaceEntry.id,
          item: item.item,
          kind: item.kind,
          grams: item.grams,
          quantityMode: item.quantityMode,
          quantityValue: item.quantityValue,
          quantityUnit: item.quantityUnit,
          portionGrams: item.portionGrams,
          foodMetadataSnapshot: item.foodMetadataSnapshot,
          nutritionSnapshot: item.nutritionSnapshot,
          date: context.date,
          meal: context.meal,
          today
        }).entries;
      } else {
        const usedIds = new Set(data.diaryEntries.map((entry) => String(entry.id)));
        const items = draft.map((item) => ({
          id: createEntryId(usedIds),
          date: context.date,
          today,
          meal: context.meal,
          item: item.item,
          kind: item.kind,
          grams: item.grams,
          quantityMode: item.quantityMode,
          quantityValue: item.quantityValue,
          quantityUnit: item.quantityUnit,
          portionGrams: item.portionGrams,
          foodMetadataSnapshot: item.foodMetadataSnapshot,
          nutritionSnapshot: item.nutritionSnapshot
        }));
        data.diaryEntries = diaryServices.addEntries({
          entries: data.diaryEntries,
          items,
          today
        });
      }
    } catch (error) {
      console.error('Не удалось сохранить записи дневника', error);
      showToast(error instanceof Error ? error.message : 'Не удалось сохранить запись');
      return;
    }
    const meal = context.meal;
    const replacing = Boolean(context.replaceEntry);
    context = null;
    draft = [];
    closeModal(false);
    navigatePage('diary');
    renderDiary(meal);
    showToast(replacing ? 'Запись заменена' : 'Записи добавлены');
  }

  function createEntryId(known) {
    let id = Date.now() + Math.floor(Math.random() * 10000);
    while (known.has(String(id))) id += 1;
    known.add(String(id));
    return id;
  }

  function cancel() {
    const onDismiss = context?.onDismiss;
    context = null;
    draft = [];
    recipeIngredientPickContext = null;
    recipeIngredientPickDraft = [];
    collectionAddContext = null;
    collectionAddDraft = [];
    closeModal(false);
    if (onDismiss) onDismiss();
    else navigatePage('diary');
  }

  function startMassLibrary({ dates, onSave, onDismiss }) {
    if (!Array.isArray(dates) || !dates.length) throw new TypeError('Mass library dates are required.');
    context = {
      meal: getStandardMeals(data.profile)[0] || 'Завтрак',
      date: dates[0],
      dates: [...dates],
      massEntry: true,
      onSave,
      onDismiss
    };
    recipeIngredientPickContext = null;
    recipeIngredientPickDraft = [];
    collectionAddContext = null;
    collectionAddDraft = [];
    draft = [];
    productSearch = '';
    catalogView = 'recipes';
    showPlate();
  }

  function finishMassFlow() {
    context = null;
    draft = [];
    recipeIngredientPickContext = null;
    recipeIngredientPickDraft = [];
    collectionAddContext = null;
    collectionAddDraft = [];
  }

  return {
    start,
    openQuickAdd,
    renderPicker,
    showPlate,
    startMassLibrary,
    finishMassFlow,
    cancel,
    isPicking: () => Boolean(context || recipeIngredientPickContext || collectionAddContext)
  };
}
