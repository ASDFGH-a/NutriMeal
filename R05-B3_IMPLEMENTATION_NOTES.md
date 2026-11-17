# R05-B3 — реализация модулей

**Статус:** модульная реализация создана; интеграция в приложение не выполнена.

## Добавлено
- `src/domain/localization/locale.constants.js` — допустимые локали, ключ и нормализация.
- `src/infrastructure/persistence/localization/locale-storage.js` — безопасный адаптер legacy-ключа `nutrition-locale`.
- `src/application/localization/locale-service.js` — восстановление начального состояния (`initialize`) и смена локали.
- `src/ui/localization/apply-locale.js` — обратимое применение перевода к DOM.
- `tests/r05-b3-locale.test.js` — unit-тесты domain/storage/application.

## Ограничение текущего набора
Фактические `FILE_MAP.md`, `CONTRACTS.md`, `PWA_MIGRATION_LOG.md` и исходные файлы R05-B1/B2 не были доступны в текущем рабочем наборе. Поэтому они не изменялись, а точное соответствие экспортов и путей ранее созданным модулям пока не подтверждено. Перед интеграцией нужно сверить этот комплект с актуальной картой проекта.

Исходный HTML v60 не изменён. Это не интегрированная сборка приложения.
