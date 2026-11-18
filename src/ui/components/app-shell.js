(function registerAppShell(root) {
  const ui = root.NutriMealUI || {};

  ui.renderAppShell = function renderAppShell({
    activePage = 'diary',
    title = 'Дневник',
    subtitle = 'Ежедневный учёт питания и показателей'
  } = {}) {
    const navigation = [
      ['diary', '▦', 'Дневник'],
      ['recipes', '▤', 'Рецепты'],
      ['planning', '▦', 'Планирование'],
      ['stats', '⌁', 'Статистика'],
      ['profile', '○', 'Профиль'],
      ['settings', '⚙', 'Настройки']
    ];

    return `<div class="app">
  <aside class="sidebar">
    <div class="brand"><div class="brand-mark">п.</div><div><div class="brand-name">Питание</div><div class="brand-sub">личный трекер</div></div></div>
    <div><div class="nav-label">Рабочее пространство</div><nav class="nav" id="nav">
      ${navigation.map(([page, icon, label]) => `<button class="nav-btn${page === activePage ? ' active' : ''}" data-page="${page}" data-label="${label}"><span class="nav-ico">${icon}</span>${label}</button>`).join('')}
    </nav></div>
    <div class="sidebar-bottom">
      <div class="muted-box">Локальный прототип интерфейса. Данные демонстрационные.</div>
      <div class="profile-mini"><div class="avatar">U</div><div><strong>Пользователь</strong><small>Личный профиль</small></div></div>
    </div>
  </aside>
  <main class="main">
    <header class="topbar">
      <div class="heading"><h1 id="page-title">${title}</h1><p id="page-subtitle">${subtitle}</p></div>
      <div class="top-actions"><button class="btn-quiet" id="quick-add">＋ Быстрая запись</button></div>
    </header>
    <div id="page" class="content"></div>
  </main>
</div>`;
  };

  root.NutriMealUI = ui;
})(globalThis);
