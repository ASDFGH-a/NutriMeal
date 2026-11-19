import assert from 'node:assert/strict';
import test from 'node:test';
import '../src/ui/modals/body-history-modals.js';
import '../src/ui/modals/profile-modal.js';

test('body-history modal markup preserves weight and measurement views', () => {
  const weightBody = globalThis.NutriMealUI.renderWeightModalBody({
    editing: false,
    history: [{ date: '2026-11-16', weight: 65.5 }],
    today: '2026-11-17'
  });
  assert.match(weightBody, /weight-value/);
  assert.match(weightBody, /value="65.5"/);

  const weightHistory = globalThis.NutriMealUI.renderWeightHistoryBody({
    history: [{ date: '2026-11-16', weight: 65.5 }],
    readableDate: (date) => date
  });
  assert.match(weightHistory, /Последняя запись/);
  assert.match(weightHistory, /65,5 кг/);

  const measurementBody = globalThis.NutriMealUI.renderMeasurementModalBody({
    today: '2026-11-17',
    date: '2026-11-17',
    profileHeight: 166,
    values: { height: 166 },
    measurements: [
      { name: 'Плечи', group: 'Верхняя часть тела', value: null },
      { name: 'Бицепс — левая рука', group: 'Руки', value: null },
      { name: 'Бицепс — правая рука', group: 'Руки', value: null }
    ],
    ratioMarkup: '<div>Соотношения</div>'
  });
  assert.match(measurementBody, /measure-height/);
  assert.match(measurementBody, /Соотношения/);
  assert.match(measurementBody, /aria-label="Плечи"/);
  assert.match(measurementBody, /aria-label="Бицепс — левая рука"/);
  assert.doesNotMatch(measurementBody, /aria-label="Плечи — Плечи"/);
});

test('profile modal markup renders locale-safe fields and training options', () => {
  const body = globalThis.NutriMealUI.renderProfileModalBody({
    draft: {
      today: '2026-11-17',
      sex: 'Женский',
      birthDate: '',
      height: 166,
      currentWeight: 65.5,
      mealCount: 5,
      activityFactor: 1.375,
      trainingFrequency: '1–2 раза в неделю',
      trainingDays: ['Пн']
    },
    activityOptions: [{ label: 'Низкая', factor: 1.375 }],
    trainingOptions: ['1–2 раза в неделю'],
    weekdays: ['Пн', 'Вт'],
    age: null,
    ageNote: 'Укажи дату рождения',
    formatActivityFactor: () => '1,375',
    escapeHtml: (value) => String(value),
    tokenEditorMarkup: (type) => `<div id="${type}"></div>`
  });

  assert.match(body, /profile-height/);
  assert.match(body, /selected>Женский/);
  assert.match(body, /Укажи дату рождения/);
  assert.match(body, /id="allergies"/);
});
