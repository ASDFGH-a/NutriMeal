import assert from 'node:assert/strict';
import test from 'node:test';
import '../src/ui/screens/settings/settings-screen.js';

test('settings screen preserves appearance and theory navigation', () => {
  const html = globalThis.NutriMealUI.renderSettingsScreen({ theme: 'light' });
  assert.match(html, /Внешний вид/);
  assert.match(html, /id="settings-theme"/);
  assert.match(html, /aria-label="Тёмная тема"/);
  assert.doesNotMatch(html, /id="settings-theme"[^>]*checked/);
  assert.match(html, /id="settings-open-theory"/);
  assert.match(html, /Теория/);
});

test('settings screen reflects the dark theme', () => {
  const html = globalThis.NutriMealUI.renderSettingsScreen({ theme: 'dark' });
  assert.match(html, /id="settings-theme"[^>]*checked/);
  assert.match(html, /кг · г · см/);
  assert.match(html, /В разработке/);
});
