import assert from 'node:assert/strict';
import test from 'node:test';
import '../src/ui/screens/screen-router.js';

test('screen router dispatches registered screens and lifecycle hooks', () => {
  const calls = [];
  const router = globalThis.NutriMealUI.createScreenRouter({
    screens: {
      diary: () => calls.push('render-diary'),
      profile: () => calls.push('render-profile')
    },
    beforeRender: () => calls.push('before'),
    afterRender: () => calls.push('after')
  });

  assert.deepEqual(router.getPages(), ['diary', 'profile']);
  assert.equal(router.render('profile'), true);
  assert.deepEqual(calls, ['before', 'render-profile', 'after']);
  assert.throws(() => router.render('missing'), /Unknown application screen/);
});

test('screen router rejects invalid registry and hooks', () => {
  assert.throws(
    () => globalThis.NutriMealUI.createScreenRouter({ screens: null }),
    /Screen registry/
  );
  assert.throws(
    () => globalThis.NutriMealUI.createScreenRouter({
      screens: { diary: null }
    }).render('diary'),
    /render function/
  );
  assert.throws(
    () => globalThis.NutriMealUI.createScreenRouter({
      screens: {},
      beforeRender: true
    }),
    /beforeRender/
  );
});
