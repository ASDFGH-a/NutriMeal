import assert from 'node:assert/strict';
import test from 'node:test';
import '../src/ui/components/overlay-host.js';

test('overlay host renders the modal and toast hosts', () => {
  const html = globalThis.NutriMealUI.renderOverlayHost({ title: 'Добавить' });
  assert.match(html, /id="modal-backdrop"/);
  assert.match(html, /id="modal-title">Добавить/);
  assert.match(html, /id="modal-body"/);
  assert.match(html, /id="modal-actions"/);
  assert.match(html, /id="toast"/);
  assert.match(html, /aria-live="polite"/);
});

test('overlay host supports a custom modal title', () => {
  const html = globalThis.NutriMealUI.renderModalHost({ title: 'Вес' });
  assert.match(html, /id="modal-title">Вес/);
});
