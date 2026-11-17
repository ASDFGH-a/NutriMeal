# PWA v60 — R03: контракты и карта переноса

**Статус:** подготовка завершена; документ описывает целевой изолированный комплект R03, не интеграцию в UI.

## 1. Источники и границы достоверности

Контракты сверены по предоставленному `PWA_v60_code_blocks.html` и картам приложения/зависимостей. Текущие формы данных и ключи хранения фиксируются как совместимость v60. Новые поля не добавляются без подтверждения исходником или отдельного решения.

## 2. Контракты данных

### UserProfile

```js
{
  sex: '',
  birthDate: '',
  height: 166,
  currentWeight: 65.5,
  activityFactor: 1.375,
  trainingFrequency: '1–2 раза в неделю',
  trainingDays: [],
  allergies: [],
  foodRestrictions: [],
  mealCount: 5
}
```

Нормализация v60:
- `trainingDays` — только значения `Пн`, `Вт`, `Ср`, `Чт`, `Пт`, `Сб`, `Вс`;
- при `trainingFrequency === 'Нет регулярных тренировок'` дни очищаются;
- `allergies` и `foodRestrictions` — уникальные списки;
- `sex` допускает `Мужской`, `Женский` или пустую строку;
- `birthDate` — строка или пустая строка;
- `activityFactor` выбирается из `1.20`, `1.375`, `1.55`, `1.725`, `1.90`; legacy-поле `dailyActivity` преобразуется в коэффициент и не сохраняется в нормализованной форме.

### NutritionPlan

```js
{
  goal: 'Поддержание веса',
  targetWeight: 65,
  kcal: 2200,
  p: 110,
  f: 70,
  c: 275,
  energyAdjustment: 0,
  proteinPerKg: null,
  fatPercent: 30,
  personalWeeklyGoals: {
    completeness: {},
    frequency: {},
    diversity: {}
  }
}
```

Нормализация v60:
- цель приводится к `Снижение веса`, `Набор веса` или `Поддержание веса`;
- `targetWeight` — числовое значение, fallback `65`;
- `energyAdjustment` — конечное число либо поправка по цели (`-400`, `300`, `0`);
- `proteinPerKg` допускает только `0.8`, `1`, `1.2`, `1.4`, `1.6`, `1.8`, `2`, иначе `null`;
- `fatPercent` ограничивается диапазоном `20..35`, fallback `30`;
- `personalWeeklyGoals` нормализуется в три объекта `completeness`, `frequency`, `diversity`.

### PlanPreset

```js
{ id: 'string', name: 'string', plan: NutritionPlan, updatedAt: 'ISO date string' }
```

В загрузку попадают только элементы с `id`, `name` и `plan`. Вложенный `plan` нормализуется как `NutritionPlan`. Снимок для пресета включает `goal`, `targetWeight`, `energyAdjustment`, `proteinPerKg`, `fatPercent` и legacy `personalWeeklyGoals`; рассчитанные `kcal/p/f/c` не включаются в снимок.

### NutritionSet и NutritionWeek

```js
{
  id: 'string',
  name: 'string',
  comment: 'string',
  weeks: [NutritionWeek, NutritionWeek, NutritionWeek, NutritionWeek],
  personalWeeklyGoals: {
    completeness: {},
    frequency: {},
    diversity: {}
  }
}

{
  mainDishes: [{ id: 'string', recipeId: 'string' }],
  snacks: [{ id: 'string', recipeId: 'string' }],
  productIds: ['string']
}
```

Правила:
- `weeks` всегда нормализуется до четырёх элементов: лишние отсекаются, недостающие заполняются пустыми неделями;
- `mainDishes` и `snacks` хранят ссылки на рецепты, а не копии рецептов;
- строковые/числовые старые элементы преобразуются в `{id, recipeId}`;
- legacy `firstDishId` и `secondDishId` преобразуются в две позиции `mainDishes`, если `mainDishes` отсутствует;
- `productIds` сохраняются как уникальные строковые ID только при подтверждении существования продукта через внедрённую функцию проверки; domain не импортирует `productDB`;
- личные недельные цели принадлежат набору и общие для его четырёх недель.

## 3. Persistence contracts

| Репозиторий | Ключ v60 | Значение |
|---|---|---|
| ProfileRepository | `nutrition-profile-v1` | Один `UserProfile` |
| PlanRepository | `nutrition-plan-v2` | Один `NutritionPlan` |
| PlanPresetsRepository | `nutrition-plan-presets-v1` | Массив `PlanPreset` |
| NutritionSetsRepository | `nutrition-sets-v1` | Массив `NutritionSet` |
| ActiveNutritionSetRepository (или метод в NutritionSetsRepository) | `nutrition-active-set-v1` | ID активного набора |

Репозитории используют общий storage adapter R02, получают его извне и не обращаются напрямую к `window.localStorage`. Ключи и JSON-форматы пользовательских данных не переименовываются.

## 4. Application compatibility rule

При загрузке старых данных может существовать `plan.personalWeeklyGoals`. Если у активного набора нет собственных личных целей, legacy-значения переносятся в `activeSet.personalWeeklyGoals` и сохраняются. Эта операция выполняется отдельным application use case после загрузки плана и наборов. Она не должна запускаться повторно поверх уже существующих целей набора и не должна находиться внутри чистого domain normalizer.

## 5. Границы domain/application

- Domain: значения по умолчанию, нормализация, проверки форм, чистые расчётные функции.
- Infrastructure: чтение/запись старых ключей через переданный storage adapter.
- Application: загрузка/сохранение сценариев, выбор активного набора, одноразовая legacy-совместимость.
- UI: существующие экраны, формы, события и DOM остаются вне R03.
- Аналитика состава недель, использующая рецепты, продукты и метаданные дневника, остаётся за границей изолированного R03 до выделения её реальных зависимостей.

## 6. Карта файлов R03

```text
src/
  domain/
    profile/
      profile.model.js
      profile.normalizer.js
    planning/
      plan.model.js
      plan.normalizer.js
      plan-preset.model.js
    nutrition-set/
      nutrition-set.model.js
      nutrition-set.normalizer.js
  application/
    usecases/
      migrate-legacy-weekly-goals.js
  infrastructure/
    persistence/
      repositories/
        profile.repository.js
        plan.repository.js
        plan-presets.repository.js
        nutrition-sets.repository.js
        active-nutrition-set.repository.js
  tests/
    ...
```

## 7. Проверки R03

- профиль: legacy `dailyActivity`, допустимые дни, отсутствие тренировок, уникальность списков, пол и дата рождения;
- план: все варианты цели, fallback и границы `energyAdjustment`, `proteinPerKg`, `fatPercent`, структура личных целей;
- пресеты: фильтрация некорректных записей и нормализация вложенного плана;
- недели: пустые недели, legacy `firstDishId`/`secondDishId`, строковые/числовые блюда, сохранение ссылок;
- наборы: ровно четыре недели, лишние недели, старые `weeklyGoals`, комментарий и ID;
- репозитории: round-trip по всем старым ключам;
- legacy use case: перенос целей только когда у активного набора нет своих целей;
- отсутствие прямого импорта `localStorage`, DOM, `profile`, `plan` или `productDB` из domain.

## 8. Что не входит в R03

- подключение репозиториев к стартовой загрузке `main.js`;
- удаление старых функций из HTML;
- переписывание UI и редакторов;
- изменение продуктового смысла четырёхнедельного `NutritionSet`;
- изменение поведения массовой записи;
- миграция пользовательских данных на новые ключи или новые JSON-форматы.

## 9. Фактическая реализация R03

Изолированные модули добавлены в `PWA_v60_first_migration`:

- `domain/profile/profile.model.js`, `profile.normalizer.js`;
- `domain/planning/plan.model.js`, `plan.normalizer.js`, `plan-calculations.js`;
- `domain/nutrition-set/nutrition-set.model.js`, `nutrition-set.normalizer.js`;
- репозитории `profile`, `plan`, `plan-presets`, `nutrition-sets`, `active-nutrition-set`;
- use cases `migrate-legacy-weekly-goals` и `resolve-active-nutrition-set`.

Общий persistence adapter R02 расширен функциями чтения/записи одиночного JSON-значения. Старые функции массивов сохранены.

**Проверка:** `node --test` — 14 тестов пройдены, 0 ошибок. Тесты покрывают нормализацию, старые форматы недель, четыре недели на набор, репозитории и ключи, начальное заполнение только при отсутствии ключа, перенос legacy-целей, выбор активного набора и расчёт плановых показателей.

**Интеграция:** не выполнена. Старые глобальные объявления и UI-функции в исходном HTML не удалялись. Для реального подключения репозитории нужно создать один раз на application boundary и заменить старый путь загрузки, не запуская оба параллельно.


------------------------------------------------------------------------

# R04 — профильные поля и настройки карточек

**Статус:** изолированная реализация завершена; интеграция в HTML/UI приложения не выполнялась.

## Объекты и контракты

### Profile weekdays

`PROFILE_WEEKDAYS` — неизменяемый справочник `['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']`.

### Аллергены профиля

`profileAllergenSuggestions({ productAllergenDefaults, recipeAllergens, selectedAllergies })`

- объединяет три явно переданных списка;
- обрезает пробелы;
- удаляет пустые значения;
- дедуплицирует без учёта регистра по `ru-RU`;
- сохраняет первое встретившееся написание и порядок;
- не читает глобальные `profile`, `recipeStandardFilters` или `productAllergenDefaults`.

### Настройки карточек

`defaultRecipeCardDisplaySettings(customCategories)` создаёт defaults v60 и добавляет неизвестные пользовательские категории рецептов со значением `false`.

`DEFAULT_PRODUCT_CARD_DISPLAY_SETTINGS` содержит defaults v60 для карточек продуктов.

`defaultCatalogCardSettings(customRecipeCategories)` создаёт обе группы настроек.

`normalizeCatalogCardSettings(saved, customRecipeCategories)` объединяет сохранённые поля с defaults и поддерживает legacy-поля v35:
- `mealType` → `mealTypes`, только если современное поле отсутствует;
- `energy` / `macros` → `composition`, только если современное поле отсутствует;
- `tags` → `customTags`, только если современное поле отсутствует.

### Persistence

`CatalogCardSettingsRepository` использует прежний ключ `nutrition-catalog-card-settings` и общий storage adapter R02. Сигнатура фабрики:

`createCatalogCardSettingsRepository(storage, { customRecipeCategories, logger })`

Методы: `load()` и `save(settings)`.

### UI markup

В `src/ui/components/profile/profile-token-markup.js` находятся:
- `profileTokenChipMarkup(values, type, escapeHtml)`;
- `profileTokenDisplayMarkup(values, escapeHtml)`;
- `profileTokenEditorMarkup(type, label, placeholder, help, escapeHtml)`.

Функции не обращаются к DOM и требуют явную функцию `escapeHtml`; динамические значения и атрибуты экранируются.

## Карта файлов R04

```text
src/
  domain/
    profile/
      profile.constants.js
      profile-allergen-suggestions.js
    catalog/
      catalog-card-settings.js
  infrastructure/
    persistence/
      repositories/
        catalog-card-settings.repository.js
  ui/
    components/
      profile/
        profile-token-markup.js
tests/
  r04-migration.test.js
```

## Проверки R04

- порядок дней недели;
- объединение и дедупликация подсказок аллергенов;
- defaults рецептов/продуктов и пользовательские категории;
- legacy-совместимость полей v35;
- round-trip репозитория и прежний ключ;
- повреждённый JSON и неверная форма сохранённых данных;
- HTML escaping токенов, редактора и атрибутов;
- обязательная передача `escapeHtml`.

**Общее состояние тестов после R04:** 22 теста пройдены, 0 ошибок.

## Ограничения интеграции

- `catalogCardSettings` пока не подключён к загрузке приложения.
- `openCatalogCardSettings()` не заменён новым кодом.
- `profileAllergenSuggestions()` и UI token markup не подключены к `openProfileModal()` / `renderProfile()`.
- Старый HTML и старые глобальные функции не удалялись.
- Истории веса и замеров не затрагивались: они остаются в R02.

------------------------------------------------------------------------

# R05-A — локализационные справочники и чистые функции

**Статус:** подготовка завершена; изолированный перенос R05-A выполняется отдельно. Полный R05 не считается перенесённым.

## Контракты

- `I18N_LOCALES`: поддерживаемые коды `ru`, `en`, `es`, `fr` и исходные отображаемые названия.
- `I18N_MONTHS`: 12 названий месяцев для каждого из четырёх языков.
- `I18N_WEEKDAYS_SHORT`: семь коротких названий дней недели для каждого языка, с понедельника.
- `I18N_MEALS`: исходные переводы семи названий приёмов пищи.
- `localeTags(locale)`: `ru` → `ru-RU`; иначе вернуть переданный код без преобразования.
- `trMeal(name, locale)`: для `ru` вернуть исходное имя; для остальных локалей вернуть перевод, если запись существует, иначе исходное имя.

## Границы

- Domain получает locale явно и не читает глобальный `appLocale`.
- `translateText` исключена: `UI_TRANSLATIONS` и `UI_PHRASES` отсутствуют в точном исходнике.
- `applyI18n` и `setAppLocale` остаются UI/application-сценариями.
- `titles` и DOM-узел `page` не переносятся в domain.
- `nutrition-locale` сейчас только записывается исходным сценарием; чтение при запуске не добавляется.

## Предлагаемая карта файлов

```text
src/domain/localization/
  locale-data.js
  locale-functions.js
tests/
  r05-localization.test.js
```

## Фактическая реализация R05-A

Добавлены:

- `src/domain/localization/locale-data.js` — `I18N_LOCALES`, `I18N_MONTHS`, `I18N_WEEKDAYS_SHORT`, `I18N_MEALS`; справочники и вложенные структуры заморожены.
- `src/domain/localization/locale-functions.js` — `localeTags(locale)` и `trMeal(name, locale, mealTranslations)` с явным locale.
- `tests/r05-localization.test.js` — пять тестов справочников, порядка значений, функций и неизменяемости.

**Проверка:** `node --test` — **27 passed, 0 failed** (22 прежних + 5 новых).

**Границы:** `translateText`, `applyI18n`, `setAppLocale`, `titles` и DOM-узел `page` не переносились. Полный R05 остаётся незавершённым из-за отсутствующих `UI_TRANSLATIONS` и `UI_PHRASES` и неописанного контракта запуска/восстановления локали. UI и исходный HTML не интегрировались.


## R05-B2 — дополнение к карте локализации

| Модуль | Ответственность | Контракт |
|---|---|---|
| `src/domain/localization/ui-translations.js` | Справочник точных UI-фраз | `UI_TRANSLATIONS[ruPhrase.toLocaleLowerCase('ru-RU')].en` |
| `src/domain/localization/ui-translation-functions.js` | Чистый перевод точной строки | `translateText(text, locale, translations)` |

Функция не зависит от DOM, localStorage или глобального состояния. Она не переводит неизвестные строки и пользовательские данные. UI-обход DOM и переключение локали остаются за пределами domain.

------------------------------------------------------------------------

# R05-B3 — переключение и восстановление локали

```text
src/
  domain/localization/
    locale-validation.js
  application/localization/
    locale-preferences.js
  infrastructure/persistence/repositories/
    locale-preferences.repository.js
  ui/localization/
    locale-ui.js
  tests/
    r05b3-locale-preferences.test.js
```

Контракты:
- Поддерживаются только `ru` и `en`; fallback — `ru`.
- Сохранение — raw-строка в прежнем ключе `nutrition-locale`.
- Application координирует сценарий через внедрённый repository и не обращается к DOM/storage напрямую.
- UI получает `document` и `rerender` явно.
- Исходный HTML не изменён; переключатель и startup wiring ещё не интегрированы.
