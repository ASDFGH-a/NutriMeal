(function registerSettingsScreen(root) {
  const ui = root.NutriMealUI || {};

  ui.renderSettingsScreen = function renderSettingsScreen({ theme = 'light' } = {}) {
    return `<section class="card">
   <div class="card-head"><div><div class="card-title">Внешний вид</div><div class="card-desc">Оформление приложения</div></div></div>
   <div class="settings-list">
    <div class="setting"><div><strong>Тёмная тема</strong><small>Переключение светлого и тёмного оформления</small></div><input class="switch" type="checkbox" id="settings-theme" ${theme === 'dark' ? 'checked' : ''}></div>
    <div class="setting"><div><strong>Единицы измерения</strong><small>Вес, продукты и замеры тела</small></div><span class="tag">кг · г · см</span></div>
   </div>
  </section>
  <section class="card">
   <div class="card-head"><div><div class="card-title">Данные приложения</div><div class="card-desc">Локальный каталог продуктов и рецептов</div></div><span class="tag">В разработке</span></div>
   <div class="setting"><div><strong>Формат каталога</strong><small>В перспективе — импорт и экспорт данных в JSON</small></div><span class="tag">JSON</span></div>
  </section>
  <section class="card settings-theory-entry-card">
   <button type="button" class="settings-theory-entry" id="settings-open-theory">
    <span class="settings-theory-entry-icon" aria-hidden="true">▤</span>
    <span class="settings-theory-entry-copy"><strong>Теория</strong><small>Документация формул, норм и принципов, используемых в Планировании</small></span>
    <span class="settings-theory-entry-action">Открыть <span aria-hidden="true">→</span></span>
   </button>
  </section>`;
  };

  root.NutriMealUI = ui;
})(globalThis);
