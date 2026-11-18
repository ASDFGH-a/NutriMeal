import assert from 'node:assert/strict';
import test from 'node:test';
import '../src/ui/state/app-state.js';
import '../src/ui/components/app-shell.js';
import '../src/ui/components/overlay-host.js';
import '../src/ui/app/application-bootstrap.js';

function createDocument() {
  const elements = {
    'app-shell': { innerHTML: '' },
    'overlay-host': { innerHTML: '' }
  };
  return {
    getElementById(id) {
      return elements[id] || null;
    }
  };
}

test('application bootstrap mounts shell, overlays, and initial state', () => {
  const document = createDocument();
  const application = globalThis.NutriMealUI.bootstrapApplication({
    document,
    initialPage: 'profile',
    title: 'Профиль',
    subtitle: 'Обзор'
  });

  assert.equal(application.state.activePage, 'profile');
  assert.match(application.shellElement.innerHTML, /Профиль/);
  assert.match(application.overlayElement.innerHTML, /modal-backdrop/);
  assert.match(application.overlayElement.innerHTML, /id="toast"/);
});

test('application bootstrap rejects missing mount points and UI components', () => {
  assert.throws(
    () => globalThis.NutriMealUI.bootstrapApplication({ document: null }),
    /Application document/
  );
  assert.throws(
    () => globalThis.NutriMealUI.bootstrapApplication({
      document: { getElementById: () => null }
    }),
    /mount points/
  );
});
