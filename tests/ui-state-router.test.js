import assert from 'node:assert/strict';
import test from 'node:test';
import '../src/ui/state/app-state.js';
import '../src/ui/router/app-router.js';

test('application state validates pages and notifies subscribers', () => {
  const state = globalThis.NutriMealUI.createAppState('diary');
  const seen = [];
  const unsubscribe = state.subscribe((page) => seen.push(page));

  assert.equal(state.activePage, 'diary');
  assert.equal(state.setPage('profile'), true);
  assert.equal(state.activePage, 'profile');
  assert.equal(state.setPage('profile'), false);
  assert.deepEqual(seen, ['profile']);
  assert.throws(() => state.setPage('unknown'), /Unknown application page/);

  unsubscribe();
  state.setPage('settings');
  assert.deepEqual(seen, ['profile']);
});

test('application router delegates navigation and supports allowed navigation container', () => {
  const state = globalThis.NutriMealUI.createAppState();
  const navigated = [];
  const router = globalThis.NutriMealUI.createAppRouter({
    state,
    onNavigate: (page) => navigated.push(page)
  });

  assert.equal(router.navigate('stats'), true);
  assert.equal(router.activePage, 'stats');
  assert.deepEqual(navigated, ['stats']);
  assert.throws(() => router.navigate('missing'), /Unknown application page/);

  let listener;
  const container = {
    addEventListener(type, callback) {
      assert.equal(type, 'click');
      listener = callback;
    }
  };
  assert.doesNotThrow(() => router.bindNavigation(container));
  listener({
    target: {
      closest(selector) {
        assert.equal(selector, '[data-page]');
        return { dataset: { page: 'profile' } };
      }
    }
  });
  assert.equal(router.activePage, 'profile');
});
