import '../state/app-state.js';
import '../components/app-shell.js';
import '../components/overlay-host.js';
import '../router/app-router.js';
import '../screens/screen-router.js';
import './application-bootstrap.js';
import '../screens/diary/diary-screen.js';
import '../screens/catalog/catalog-screen.js';
import '../screens/statistics/statistics-screen.js';
import '../screens/settings/settings-screen.js';
import '../screens/settings/theory-screen.js';
import '../screens/planning/planning-screen.js';
import '../screens/profile/profile-screen.js';
import '../screens/planning/nutrition-set-library.js';
import '../screens/planning/planning-week.js';
import '../screens/planning/planning-analytics.js';
import '../components/catalog/catalog-cards.js';
import '../components/catalog/catalog-filters.js';
import '../modals/diary-modals.js';
import '../modals/catalog-editors.js';
import '../modals/catalog-modals.js';
import '../modals/planning-modals.js';
import '../modals/profile-modal.js';
import '../modals/body-history-modals.js';
import { initializeCoreData } from '../../application/services/initialize-core-data.js';
import { createSeedCatalog } from '../../domain/catalog/catalog-seed.js';
import { createCoreRepositories } from '../../infrastructure/persistence/create-core-repositories.js';
import { createDiaryServices } from '../../application/services/diary-services.js';
import { createWaterServices } from '../../application/services/water-services.js';
import { createCatalogServices } from '../../application/services/catalog-services.js';
import { createPlanningServices } from '../../application/services/planning-services.js';
import { createProfileServices } from '../../application/services/profile-services.js';
import { createBodyHistoryServices } from '../../application/services/body-history-services.js';
import { dateKey, todayLocalDate } from '../../domain/shared/date-utils.js';
import { createDiaryViewModel } from '../screens/diary/diary-presenter.js';
import { createMealAddFlow } from './meal-add-flow.js';
import { createMassEntryFlow } from './mass-entry-flow.js';
import { createStatisticsFlow } from './statistics-flow.js';
import { createSettingsFlow } from './settings-flow.js';
import { createPlanningFlow } from './planning-flow.js';
import { createProfileFlow } from './profile-flow.js';

const ui = globalThis.NutriMealUI;
const storage = globalThis.localStorage;
const catalog = createSeedCatalog();
const repositories = createCoreRepositories(storage, catalog.products);
const data = initializeCoreData({ catalog, repositories });
const diaryServices = createDiaryServices(repositories.diary);
const waterServices = createWaterServices(repositories.water);
const catalogServices = createCatalogServices();
const planningServices = createPlanningServices({
  planRepository: repositories.plan,
  presetRepository: repositories.planPresets,
  nutritionSetRepository: repositories.nutritionSets,
  activeNutritionSetRepository: repositories.activeNutritionSet,
  products: data.products
});
const profileServices = createProfileServices(repositories.profile);
const bodyHistoryServices = createBodyHistoryServices({
  weightRepository: repositories.weightHistory,
  measurementRepository: repositories.measurementHistory,
  profileRepository: repositories.profile
});
const catalogCardSettingsRepository = repositories.catalogCardSettings;
const application = ui.bootstrapApplication({ document, initialPage: 'diary' });
const page = document.getElementById('page');
page.dataset.page = 'diary';
const today = dateKey(todayLocalDate());
const pageTitles = {
  diary: ['Дневник', 'Ежедневный учёт питания и показателей'],
  recipes: ['Рецепты', 'Каталог блюд и продуктов'],
  planning: ['Планирование', 'Составление плана питания'],
  stats: ['Статистика', 'Показатели питания и тела за выбранный период'],
  profile: ['Профиль', 'Личные параметры и история тела'],
  settings: ['Настройки', 'Настройки приложения']
};
let selectedDate = today;
let expandedMeals = new Set();
let toastTimer;
let modalDismissHandler = null;
let mealAddFlow;
let massEntryFlow;
let statisticsFlow;
let settingsFlow;
let planningFlow;
let profileFlow;
let appRouter;
let screenRouter;

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function showToast(message, actionLabel, action) {
  const toast = document.getElementById('toast');
  toast.replaceChildren();
  const text = document.createElement('span');
  text.textContent = message;
  toast.append(text);
  if (actionLabel && typeof action === 'function') {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'toast-action';
    button.textContent = actionLabel;
    button.addEventListener('click', () => {
      clearTimeout(toastTimer);
      toast.classList.remove('show');
      action();
    }, { once: true });
    toast.append(button);
  }
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 4200);
}

function openModal(title, body, actions, onDismiss = null) {
  const modal = document.querySelector('.modal');
  [
    'mass-entry-modal',
    'stats-detail-modal',
    'stats-period-modal',
    'meal-chooser-modal',
    'filter-admin-modal',
    'recipe-detail-modal',
    'recipe-edit-modal',
    'product-detail-modal',
    'nutrition-review-modal',
    'profile-edit-modal',
    'measurements-modal'
  ].forEach((className) => modal.classList.remove(className));
  const head = document.querySelector('.modal-head');
  modalDismissHandler = onDismiss;
  head.innerHTML = '<h2 id="modal-title"></h2><button class="modal-close" id="modal-close" aria-label="Закрыть">×</button>';
  head.querySelector('h2').textContent = title;
  document.getElementById('modal-body').innerHTML = body;
  document.getElementById('modal-actions').innerHTML = actions;
  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('modal-backdrop').classList.add('open');
  const first = modal.querySelector('input:not([disabled]), select:not([disabled]), button:not([disabled])');
  if (first) first.focus();
}

function closeModal(invokeDismiss = true) {
  const dismissHandler = modalDismissHandler;
  modalDismissHandler = null;
  document.getElementById('modal-backdrop').classList.remove('open');
  if (invokeDismiss && dismissHandler) dismissHandler();
}

function setSelectedDate(value) {
  const [year, month, day] = value.split('-').map(Number);
  selectedDate = dateKey(new Date(year, month - 1, day));
  renderDiary();
}

function renderDiary(expandMeal) {
  if (expandMeal) expandedMeals.add(expandMeal);
  profileFlow.syncPlanCalculations();
  const model = createDiaryViewModel({
    data,
    selectedDate,
    today,
    expandedMeals
  });
  page.innerHTML = ui.renderDiaryScreen(model);

  page.querySelectorAll('[data-date]').forEach((button) => {
    button.addEventListener('click', () => {
      const [year, month, day] = selectedDate.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      date.setDate(date.getDate() + (button.dataset.date === 'next' ? 1 : -1));
      setSelectedDate(dateKey(date));
    });
  });
  document.getElementById('today-btn').addEventListener('click', () => setSelectedDate(today));
  document.getElementById('open-calendar').addEventListener('click', () => {
    openModal('Выбрать дату', `<div class="field"><label for="calendar-date">Дата дневника</label><input id="calendar-date" type="date" value="${escapeHtml(selectedDate)}"></div>`, '<button class="btn" id="calendar-cancel">Отмена</button><button class="btn-primary" id="calendar-save">Открыть</button>');
    document.getElementById('calendar-cancel').addEventListener('click', closeModal);
    document.getElementById('calendar-save').addEventListener('click', () => {
      const value = document.getElementById('calendar-date').value;
      if (!value) {
        showToast('Выбери дату дневника');
        return;
      }
      closeModal();
      setSelectedDate(value);
    });
  });
  page.querySelectorAll('[data-toggle-meal]').forEach((button) => {
    button.addEventListener('click', () => {
      const meal = button.dataset.toggleMeal;
      if (expandedMeals.has(meal)) expandedMeals.delete(meal);
      else expandedMeals.add(meal);
      renderDiary();
    });
  });
  document.getElementById('toggle-snack').addEventListener('click', () => {
    if (expandedMeals.has('Перекус')) expandedMeals.delete('Перекус');
    else expandedMeals.add('Перекус');
    renderDiary();
  });

  page.querySelectorAll('[data-add-meal]').forEach((button) => {
    button.addEventListener('click', () => mealAddFlow.start(button.dataset.addMeal));
  });
  document.getElementById('add-snack').addEventListener('click', () => mealAddFlow.start('Перекус'));
  document.getElementById('quick-add').onclick = () => mealAddFlow.openQuickAdd();
  page.querySelectorAll('[data-edit-entry]').forEach((button) => {
    button.addEventListener('click', () => {
      const entry = data.diaryEntries.find((item) => String(item.id) === button.dataset.editEntry);
      if (entry) openFoodModal(entry.meal, entry, false);
    });
  });
  page.querySelectorAll('[data-replace-entry]').forEach((button) => {
    button.addEventListener('click', () => {
      const entry = data.diaryEntries.find((item) => String(item.id) === button.dataset.replaceEntry);
      if (entry) mealAddFlow.start(entry.meal, entry);
    });
  });
  page.querySelectorAll('[data-remove-entry]').forEach((button) => {
    button.addEventListener('click', () => removeFoodEntry(button.dataset.removeEntry));
  });
  page.querySelectorAll('[data-water-quick]').forEach((button) => {
    button.addEventListener('click', () => addWaterEntry(Number(button.dataset.waterQuick)));
  });
  page.querySelectorAll('[data-water-remove]').forEach((button) => {
    button.addEventListener('click', () => removeWaterEntry(button.dataset.waterRemove));
  });

  profileFlow.bindDiaryActions();
}

function updateNavigation(activePage) {
  document.querySelectorAll('#nav [data-page]').forEach((button) => {
    const available = button.dataset.page === 'diary'
      || button.dataset.page === 'recipes'
      || button.dataset.page === 'planning'
      || button.dataset.page === 'stats'
      || button.dataset.page === 'profile'
      || button.dataset.page === 'settings';
    button.disabled = !available;
    button.classList.toggle('active', button.dataset.page === activePage);
    button.title = available ? '' : 'Этот раздел будет подключён следующим этапом переноса';
  });
}

function navigatePage(name) {
  appRouter.navigate(name);
}

function openFoodModal(meal, existing = null, replacing = false) {
  if (selectedDate > today && !existing) {
    showToast('Нельзя добавлять записи на будущую дату');
    return;
  }
  const products = data.products;
  if (!products.length) {
    showToast('В каталоге нет продуктов для добавления');
    return;
  }
  const selectedProduct = products[0];
  const existingProduct = existing && !replacing
    ? products.find((product) => String(product.id) === String(existing.productId))
    : null;
  const options = existing && !replacing
    ? `<option value="${escapeHtml(existingProduct?.id ?? 'saved')}" selected>${escapeHtml(existingProduct?.name || existing.name)}</option>`
    : products.map((product) => `<option value="${escapeHtml(product.id)}">${escapeHtml(product.name)}</option>`).join('');
  const unit = existing && !replacing
    ? existing.quantityUnit === 'мл' ? 'мл' : 'г'
    : selectedProduct.basisUnit === 'мл' ? 'мл' : 'г';
  const quantity = existing ? Math.round(Number(existing.grams) || 100) : 100;
  const actionLabel = replacing ? 'Заменить' : existing ? 'Сохранить' : 'Добавить';
  const title = replacing ? 'Заменить продукт' : existing ? 'Изменить запись' : `Добавить · ${meal}`;
  const body = `<div class="form-grid"><div class="field"><label for="food-product">Продукт</label><select id="food-product">${options}</select></div><div class="field"><label for="food-quantity">Количество, ${unit}</label><input id="food-quantity" type="number" min="1" max="30000" step="1" value="${quantity}"></div></div>`;
  openModal(title, body, `<button class="btn" id="food-cancel">Отмена</button><button class="btn-primary" id="food-save">${actionLabel}</button>`);
  const select = document.getElementById('food-product');
  const quantityInput = document.getElementById('food-quantity');
  const label = document.querySelector('label[for="food-quantity"]');
  const updateUnit = () => {
    const product = products.find((item) => String(item.id) === select.value);
    label.textContent = `Количество, ${product?.basisUnit === 'мл' ? 'мл' : 'г'}`;
  };
  select.disabled = Boolean(existing && !replacing);
  select.addEventListener('change', updateUnit);
  document.getElementById('food-cancel').addEventListener('click', closeModal);
  document.getElementById('food-save').addEventListener('click', () => {
    const product = products.find((item) => String(item.id) === select.value);
    const amount = Number(quantityInput.value);
    if ((!existing || replacing) && !product) {
      showToast('Выбери продукт');
      select.focus();
      return;
    }
    if (!Number.isInteger(amount) || amount < 1 || amount > 30000) {
      showToast('Укажи продукт и количество от 1 до 30000');
      quantityInput.focus();
      return;
    }
    try {
      if (replacing) {
        data.diaryEntries = diaryServices.replaceEntry({
          entries: data.diaryEntries,
          id: existing.id,
          item: product,
          kind: 'product',
          grams: amount,
          date: existing.date,
          meal: existing.meal,
          today
        }).entries;
      } else if (existing) {
        data.diaryEntries = diaryServices.updateEntry({
          entries: data.diaryEntries,
          id: existing.id,
          changes: { grams: amount },
          today
        }).entries;
      } else {
        data.diaryEntries = diaryServices.addEntry({
          entries: data.diaryEntries,
          date: selectedDate,
          today,
          meal,
          item: product,
          kind: 'product',
          grams: amount
        });
      }
    } catch (error) {
      console.error('Не удалось сохранить запись дневника', error);
      showToast(error instanceof Error ? error.message : 'Не удалось сохранить запись');
      return;
    }
    closeModal();
    expandedMeals.add(existing?.meal || meal);
    renderDiary();
    showToast(replacing ? 'Запись заменена' : existing ? 'Запись обновлена' : 'Запись добавлена');
  });
}

function removeFoodEntry(id) {
  try {
    const result = diaryServices.removeEntry({ entries: data.diaryEntries, id });
    if (!result.removed) return;
    data.diaryEntries = result.entries;
    renderDiary();
    showToast('Запись удалена', 'Отменить', () => {
      try {
        data.diaryEntries = diaryServices.restoreEntry({
          entries: data.diaryEntries,
          entry: result.removed,
          index: result.index
        });
        expandedMeals.add(result.removed.meal);
        renderDiary();
        showToast('Запись восстановлена');
      } catch (error) {
        console.error('Не удалось восстановить запись дневника', error);
        showToast(error instanceof Error ? error.message : 'Не удалось восстановить запись');
      }
    });
  } catch (error) {
    console.error('Не удалось удалить запись дневника', error);
    showToast(error instanceof Error ? error.message : 'Не удалось удалить запись');
  }
}

function addWaterEntry(ml) {
  try {
    data.waterEntries = waterServices.addEntry({
      entries: data.waterEntries,
      date: selectedDate,
      today,
      ml
    });
    renderDiary();
    showToast(`Добавлено воды: ${ml} мл`);
  } catch (error) {
    console.error('Не удалось добавить запись воды', error);
    showToast(error instanceof Error ? error.message : 'Не удалось сохранить запись воды');
  }
}

function removeWaterEntry(id) {
  try {
    const result = waterServices.removeEntry({ entries: data.waterEntries, id });
    if (!result.removed) return;
    data.waterEntries = result.entries;
    renderDiary();
    showToast('Запись воды удалена', 'Отменить', () => {
      try {
        data.waterEntries = waterServices.restoreEntry({
          entries: data.waterEntries,
          entry: result.removed,
          index: result.index
        });
        renderDiary();
        showToast('Запись воды восстановлена');
      } catch (error) {
        console.error('Не удалось восстановить запись воды', error);
        showToast(error instanceof Error ? error.message : 'Не удалось восстановить запись воды');
      }
    });
  } catch (error) {
    console.error('Не удалось удалить запись воды', error);
    showToast(error instanceof Error ? error.message : 'Не удалось удалить запись воды');
  }
}

mealAddFlow = createMealAddFlow({
  document,
  ui,
  data,
  diaryServices,
  catalogServices,
  today,
  getSelectedDate: () => selectedDate,
  openModal,
  closeModal,
  navigatePage,
  renderDiary,
  showToast,
  escapeHtml,
  saveCatalogCardSettings: (settings) => catalogCardSettingsRepository.save(settings),
  openMassEntry: () => massEntryFlow.start()
});

massEntryFlow = createMassEntryFlow({
  document,
  ui,
  data,
  diaryServices,
  mealAddFlow,
  today,
  getSelectedDate: () => selectedDate,
  setSelectedDate,
  expandDiaryMeals: (meals) => meals.forEach((meal) => expandedMeals.add(meal)),
  navigatePage,
  openModal,
  closeModal,
  showToast,
  escapeHtml
});

statisticsFlow = createStatisticsFlow({
  document,
  ui,
  data,
  openModal,
  closeModal,
  showToast,
  escapeHtml
});

settingsFlow = createSettingsFlow({
  document,
  ui,
  data,
  themeRepository: repositories.theme,
  showToast,
  escapeHtml
});

profileFlow = createProfileFlow({
  document,
  ui,
  page,
  data,
  profileServices,
  bodyHistoryServices,
  planningServices,
  today,
  openModal,
  closeModal,
  showToast,
  escapeHtml,
  renderDiary
});

planningFlow = createPlanningFlow({
  document,
  ui,
  data,
  services: planningServices,
  mealAddFlow,
  navigatePage,
  openProfile: () => {
    navigatePage('profile');
    profileFlow.openProfileModal();
  },
  openModal,
  closeModal,
  showToast,
  escapeHtml
});

screenRouter = ui.createScreenRouter({
  screens: {
    diary: renderDiary,
    recipes: () => mealAddFlow.renderPicker(),
    planning: () => planningFlow.render(),
    stats: () => statisticsFlow.render(),
    profile: () => profileFlow.render(),
    settings: () => settingsFlow.render()
  },
  afterRender: () => updateNavigation(application.state.activePage)
});

appRouter = ui.createAppRouter({
  state: application.state,
  onNavigate(name) {
    const [title, subtitle] = pageTitles[name];
    document.getElementById('page-title').textContent = title;
    document.getElementById('page-subtitle').textContent = subtitle;
    page.dataset.page = name;
    screenRouter.render(name);
  }
});

document.documentElement.dataset.theme = data.theme;
document.querySelectorAll('#nav [data-page]').forEach((button) => {
  button.addEventListener('click', () => {
    if (button.disabled) return;
    if (button.dataset.page !== 'recipes' && mealAddFlow.isPicking()) {
      if (mealAddFlow.abandonPlannerRecipeSelection()) {
        navigatePage(button.dataset.page);
        return;
      }
      mealAddFlow.cancel();
      if (button.dataset.page !== 'diary') navigatePage(button.dataset.page);
      return;
    }
    navigatePage(button.dataset.page);
  });
});
document.getElementById('modal-backdrop').addEventListener('click', (event) => {
  if (event.target.id === 'modal-backdrop') closeModal();
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && document.getElementById('modal-backdrop').classList.contains('open')) closeModal();
});
navigatePage('diary');
