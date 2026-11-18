import assert from 'node:assert/strict';
import test from 'node:test';
import { createSettingsFlow } from '../src/ui/app/settings-flow.js';

class FakeElement {
  constructor() {
    this.handlers = new Map();
    this.dataset = {};
    this.checked = false;
    this.innerHTML = '';
    this.textContent = '';
  }

  addEventListener(name, handler) {
    this.handlers.set(name, handler);
  }

  trigger(name, event = {}) {
    this.handlers.get(name)?.({ currentTarget: this, ...event });
  }
}

function createDocument() {
  const elements = new Map();
  return {
    documentElement: { dataset: {} },
    getElementById(id) {
      if (!elements.has(id)) elements.set(id, new FakeElement());
      return elements.get(id);
    }
  };
}

test('settings flow saves theme changes and opens theory with current reference data', () => {
  const document = createDocument();
  const data = {
    theme: 'light',
    profile: { birthDate: '1990-01-01', sex: '' }
  };
  const savedThemes = [];
  const ui = {
    renderSettingsScreen: ({ theme }) => `settings:${theme}`,
    renderTheoryScreen: ({ weeklyReferenceRows, rdaMarkup }) => `${weeklyReferenceRows}${rdaMarkup}`
  };
  const flow = createSettingsFlow({
    document,
    ui,
    data,
    themeRepository: { save: (theme) => savedThemes.push(theme) },
    showToast: assert.fail,
    escapeHtml: (value) => String(value)
  });

  flow.render();
  assert.equal(document.getElementById('page-title').textContent, 'Настройки');
  assert.equal(document.getElementById('page').innerHTML, 'settings:light');

  const themeToggle = document.getElementById('settings-theme');
  themeToggle.checked = true;
  themeToggle.trigger('change');
  assert.deepEqual(savedThemes, ['dark']);
  assert.equal(data.theme, 'dark');
  assert.equal(document.documentElement.dataset.theme, 'dark');

  document.getElementById('settings-open-theory').trigger('click');
  const theoryHtml = document.getElementById('page').innerHTML;
  assert.equal(document.getElementById('page-title').textContent, 'Теория');
  assert.match(theoryHtml, /Овощи<\/td><td>Ежедневно/);
  assert.match(theoryHtml, /Возрастная группа: <strong>31-50/);
  assert.match(theoryHtml, /900 \/ 700 мкг RAE/);

  document.getElementById('settings-theory-back').trigger('click');
  assert.equal(document.getElementById('page-title').textContent, 'Настройки');
  assert.equal(document.getElementById('page').innerHTML, 'settings:dark');
});

test('settings flow reports theme storage failures and restores the current setting', () => {
  const document = createDocument();
  const data = { theme: 'light', profile: { birthDate: '', sex: '' } };
  const messages = [];
  const errors = [];
  const originalError = console.error;
  console.error = (...args) => errors.push(args);

  try {
    const flow = createSettingsFlow({
      document,
      ui: { renderSettingsScreen: () => 'settings', renderTheoryScreen: () => 'theory' },
      data,
      themeRepository: { save: () => { throw new Error('write failed'); } },
      showToast: (message) => messages.push(message),
      escapeHtml: (value) => String(value)
    });

    flow.render();
    const themeToggle = document.getElementById('settings-theme');
    themeToggle.checked = true;
    themeToggle.trigger('change');

    assert.equal(themeToggle.checked, false);
    assert.equal(data.theme, 'light');
    assert.equal(document.documentElement.dataset.theme, undefined);
    assert.deepEqual(messages, ['write failed']);
    assert.equal(errors[0][0], 'Не удалось сохранить тему оформления');
  } finally {
    console.error = originalError;
  }
});
