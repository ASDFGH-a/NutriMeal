import assert from 'node:assert/strict';
import test from 'node:test';
import '../src/ui/components/app-shell.js';

test('app shell keeps navigation and topbar structure', () => {
  const html = globalThis.NutriMealUI.renderAppShell();

  assert.match(html, /class="app"/);
  assert.match(html, /id="nav"/);
  assert.match(html, /class="nav-btn active"[^>]*data-page="diary"/);
  assert.match(html, /data-page="profile"/);
  assert.match(html, /id="page-title">Дневник/);
  assert.match(html, /id="quick-add"/);
});

test('app shell marks the active page and custom heading', () => {
  const html = globalThis.NutriMealUI.renderAppShell({
    activePage: 'profile',
    title: 'Профиль',
    subtitle: 'Обзор персональных параметров'
  });

  assert.match(html, /class="nav-btn active"[^>]*data-page="profile"/);
  assert.match(html, /id="page-title">Профиль/);
  assert.match(html, /id="page-subtitle">Обзор персональных параметров/);
});
