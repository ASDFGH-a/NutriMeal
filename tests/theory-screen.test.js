import assert from 'node:assert/strict';
import test from 'node:test';
import '../src/ui/screens/settings/theory-screen.js';

test('theory screen renders navigation and reference tables', () => {
  const html = globalThis.NutriMealUI.renderTheoryScreen({
    weeklyReferenceRows: '<tr><td>Овощи</td><td>400 г</td></tr>',
    rdaMarkup: '<table><tr><td>Железо</td></tr></table>'
  });

  assert.match(html, /id="settings-theory-back"/);
  assert.match(html, /href="#theory-energy"/);
  assert.match(html, /id="theory-nutrients"/);
  assert.match(html, /Овощи/);
  assert.match(html, /Железо/);
});
