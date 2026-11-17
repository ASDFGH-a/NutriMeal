# PWA v60 — комплект извлечения (R01–R05-B2)

Это подготовленный комплект модулей для поэтапной миграции, не готовая замена исходного HTML.
Исходные пользовательские ключи localStorage сохранены без изменений.

## Состав

- `src/domain/recipe/recipe.defaults.js` — стартовый массив рецептов, извлечённый из R01.
- `src/domain/product/product.defaults.js` — стартовый массив продуктов, извлечённый из R01.
- `src/domain/product/product-seed-metadata.js` — метаданные стартовых продуктов.
- `src/domain/product/product-normalizer.js` — нормализация стартовых полей продуктов.
- `src/domain/diary/meal-config.js` — чистые функции конфигурации приёмов пищи.
- `src/infrastructure/persistence/storage.js` — общий адаптер массивов.
- `src/infrastructure/persistence/repositories/*.repository.js` — четыре репозитория.

## Важные решения совместимости

1. `recipes` и `productDB` экспортируются как изменяемые массивы: исходное приложение редактирует эти объекты во время работы. Не замораживать записи и не клонировать каталоги между модулями.
2. `collections` не переносится в этом комплекте: в v60 это изменяемое состояние со множеством UI-потребителей.
3. Функции `getStandardMeals`, `getMealShares`, `getDiaryMealOptions`, `diaryMealShare` теперь получают `mealCount` и `diaryEntries` явно вместо чтения глобальных `profile` и `diaryEntries`.
4. Репозитории принимают `storage` извне. Передавать `window.localStorage` на границе приложения; не обращаться к нему из domain.
5. Имена и значения четырёх ключей хранения оставлены прежними, чтобы не менять существующие данные пользователя.

## Что ещё НЕ сделано

- Модули не подключены к `main.js` и старому UI.
- Старые функции сохранения и загрузки не удалены из HTML.
- Нет миграции UI-состояния и глобальных переменных.
- Нет проверки поведения в браузере. Перед переключением приложения нужно интегрировать модули и выполнить регрессионные сценарии.

## Пример подключения на границе приложения

```js
import { createDiaryRepository } from './infrastructure/persistence/repositories/diary.repository.js';
import { createWaterRepository } from './infrastructure/persistence/repositories/water.repository.js';

const diaryRepository = createDiaryRepository(window.localStorage);
const waterRepository = createWaterRepository(window.localStorage);

const diaryEntries = diaryRepository.loadAll();
const waterEntries = waterRepository.loadAll();
```

Не подключать этот пример параллельно со старой загрузкой данных: сначала нужно заменить единый путь инициализации, иначе появятся два конкурирующих источника состояния.

## R03 — профиль, планирование и наборы питания

Добавлены изолированные модули:

- `domain/profile/` — значения профиля, уровни активности и нормализатор с поддержкой legacy `dailyActivity`.
- `domain/planning/` — модель и нормализатор плана, пресеты, расчёт возраста и целевых показателей.
- `domain/nutrition-set/` — модель набора/недели и нормализаторы с сохранением четырёх недель и legacy `firstDishId` / `secondDishId`.
- `infrastructure/persistence/repositories/` — репозитории профиля, плана, пресетов, наборов и ID активного набора.
- `application/usecases/` — однократный перенос legacy недельных целей и безопасное разрешение активного набора.

Ключи v60 сохранены: `nutrition-profile-v1`, `nutrition-plan-v2`, `nutrition-plan-presets-v1`, `nutrition-sets-v1`, `nutrition-active-set-v1`.

При создании `createNutritionSetsRepository` следует передать `isProductIdValid`, использующий актуальный каталог продуктов. Это сохраняет прежнюю проверку ссылок `productIds`, не создавая зависимости domain от глобального `productDB`.

R03 остаётся изолированным комплектом: новые репозитории не подключены к старой загрузке HTML и не являются вторым источником истины в работающем приложении.


## R04 — профильные поля и настройки карточек

Добавлены изолированные модули:

- `domain/profile/profile.constants.js` — дни недели.
- `domain/profile/profile-allergen-suggestions.js` — объединение подсказок аллергенов из переданных списков без чтения глобального состояния.
- `domain/catalog/catalog-card-settings.js` — defaults настроек карточек рецептов/продуктов и legacy-совместимость полей v35.
- `infrastructure/persistence/repositories/catalog-card-settings.repository.js` — чтение/запись по прежнему ключу `nutrition-catalog-card-settings`.
- `ui/components/profile/profile-token-markup.js` — разметка токенов профиля с обязательным `escapeHtml`.

R04 не подключён к старому HTML. `openCatalogCardSettings()`, `openProfileModal()` и `renderProfile()` пока остаются исходными. Истории веса и замеров остаются в репозиториях R02 и повторно не загружаются.

## Проверка комплекта R01–R04

Запуск из каталога комплекта:

```bash
node --test
```

Результат текущей версии: **22 теста пройдены, 0 ошибок**. Это unit-тесты изолированных модулей, не браузерная интеграция и не полная регрессионная проверка PWA.

## R05-A — localization data and pure functions

The isolated R05-A slice extracts the v60 locale dictionaries and pure locale helpers:

- `src/domain/localization/locale-data.js`
- `src/domain/localization/locale-functions.js`

The project decision is to support only `ru` (default) and `en`. The source dictionaries for Spanish and French were removed from the extracted contract. `localeTags(locale)` and `trMeal(name, locale)` receive locale explicitly; no global `appLocale` is used.

This is only the locale-data stage. `translateText`, `applyI18n`, and `setAppLocale` are not yet extracted. The exact v60 source references `UI_TRANSLATIONS` and `UI_PHRASES` without declaring them. The `nutrition-locale` key is written but no startup read was found. A complete English UI and persistence of the selected language are not yet implemented.

Tests for the current R05-A/B1 package are recorded in the migration log.


## R05-B2 — словарь точных UI-фраз

- `src/domain/localization/ui-translations.js` — 227 точных русских UI-строк с английскими эквивалентами.
- `src/domain/localization/ui-translation-functions.js` — `translateText(text, locale, translations)`.
- `tests/r05b2-translation.test.js` — тесты словаря, точного совпадения, RU passthrough, fallback и сохранения пользовательского текста.

Перевод выполняется только для точного совпадения с известной UI-строкой. Неизвестный текст возвращается без изменений. Это намеренно защищает пользовательские названия продуктов и рецептов, заметки, категории, записи дневника и значения профиля.

**Граница этапа:** словарь и чистая функция подготовлены как отдельные модули. Они ещё не подключены к `applyI18n`, DOM, `setAppLocale` или старому HTML. Динамические шаблонные сообщения, которых нет в словаре как точных строк, остаются без перевода до отдельной обработки.

## R05-B3 — переключение и восстановление локали

Добавлены изолированные модули:

- `src/domain/localization/locale-validation.js` — проверка и разрешение `ru` / `en`.
- `src/application/localization/locale-preferences.js` — сценарий восстановления и выбора локали.
- `src/infrastructure/persistence/repositories/locale-preferences.repository.js` — raw-строка в прежнем ключе `nutrition-locale`.
- `src/ui/localization/locale-ui.js` — применение `lang` к переданному документу и вызов перерисовки.
- `tests/r05b3-locale-preferences.test.js` — проверки сценариев локальных предпочтений.

Полный набор: **45 unit-тестов пройдены**. Модули пока не подключены к исходному HTML; реальный переключатель в настройках и восстановление до первого рендера остаются интеграционной задачей.
