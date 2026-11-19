(function registerAppShell(root) {
  const ui = root.NutriMealUI || {};

  function navIcon(paths) {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
  }

  ui.renderAppShell = function renderAppShell({
    activePage = 'diary',
    title = 'Дневник',
    subtitle = 'Ежедневный учёт питания и показателей'
  } = {}) {
    const navigation = [
      ['diary', navIcon('<rect x="3.5" y="5" width="17" height="16" rx="2"/><path d="M8 3v4M16 3v4M3.5 10h17M7.5 14h3M13.5 14h3M7.5 17h3"/>'), 'Дневник', 'День'],
      ['recipes', navIcon('<path d="M4 5.5c2.2-1.2 4.8-1.2 8 0v14c-3.2-1.2-5.8-1.2-8 0z"/><path d="M20 5.5c-2.2-1.2-4.8-1.2-8 0v14c3.2-1.2 5.8-1.2 8 0zM8 9h1M15 9h1"/>'), 'Рецепты', 'Еда'],
      ['planning', navIcon('<path d="m4 7 1.5 1.5L8 6"/><path d="M11 7h9M4 13l1.5 1.5L8 12"/><path d="M11 13h9M4 19l1.5 1.5L8 18"/><path d="M11 19h9"/>'), 'Планирование', 'План'],
      ['stats', navIcon('<path d="M4 19V5M4 19h16"/><path d="m7 15 4-4 3 2 5-7"/><path d="M16 6h3v3"/>'), 'Статистика', 'Стат'],
      ['profile', navIcon('<circle cx="12" cy="8" r="3.5"/><path d="M5 20c.5-3.3 3.2-5.5 7-5.5s6.5 2.2 7 5.5"/>'), 'Профиль', 'Профиль'],
      ['settings', navIcon('<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>'), 'Настройки', 'Ещё']
    ];

    return `<div class="app">
  <aside class="sidebar">
    <div class="brand"><div class="brand-mark">п.</div><div><div class="brand-name">Питание</div><div class="brand-sub">личный трекер</div></div></div>
    <div><div class="nav-label">Рабочее пространство</div><nav class="nav" id="nav">
      ${navigation.map(([page, icon, label, shortLabel]) => `<button class="nav-btn${page === activePage ? ' active' : ''}" data-page="${page}" data-label="${label}" aria-label="${label}"><span class="nav-ico" aria-hidden="true">${icon}</span><span class="nav-label-full">${label}</span><span class="nav-label-short">${shortLabel}</span></button>`).join('')}
    </nav></div>
    <div class="sidebar-bottom">
      <div class="muted-box">Локальный прототип интерфейса. Данные демонстрационные.</div>
      <div class="profile-mini"><div class="avatar">U</div><div><strong>Пользователь</strong><small>Личный профиль</small></div></div>
    </div>
  </aside>
  <main class="main">
    <header class="topbar">
      <div class="heading"><h1 id="page-title">${title}</h1><p id="page-subtitle">${subtitle}</p></div>
      <div class="top-actions"><button class="btn-quiet" id="quick-add" aria-label="Быстрая запись"><span class="quick-add-icon" aria-hidden="true">＋</span><span class="quick-add-label">Быстрая запись</span></button></div>
    </header>
    <div id="page" class="content"></div>
  </main>
</div>`;
  };

  root.NutriMealUI = ui;
})(globalThis);
