import assert from 'node:assert/strict';
import test from 'node:test';
import '../src/ui/screens/profile/profile-screen.js';
import { MEASUREMENT_DEFINITIONS } from '../src/domain/measurement/measurement.model.js';
import { getActivityLevel } from '../src/domain/profile/profile.model.js';

const renderProfileScreen = globalThis.NutriMealUI.renderProfileScreen;

function renderProfile({
  profile = {},
  measurementHistory = [],
  measurements = MEASUREMENT_DEFINITIONS.map((measurement) => ({ ...measurement, value: null }))
} = {}) {
  return renderProfileScreen({
    profile: {
      sex: 'Женский',
      birthDate: '',
      height: 166,
      currentWeight: 65.5,
      activityFactor: 1.375,
      trainingFrequency: '1–2 раза в неделю',
      trainingDays: ['Пн', 'Ср'],
      allergies: [],
      foodRestrictions: [],
      mealCount: 5,
      ...profile
    },
    measurementHistory,
    measurements,
    weekdays: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'],
    calculateProfileAge: () => null,
    readableDate: (date) => date,
    getActivityLevel,
    formatActivityFactor: (factor) => String(factor),
    locale: 'ru-RU',
    escapeHtml: (value) => String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;')
  });
}

test('profile screen preserves the overview and uses the latest measurement snapshot', () => {
  const html = renderProfile({
    measurementHistory: [
      { date: '2026-01-01', values: { 'Талия': 80, 'Бицепс — левая рука': 30, 'Бицепс — правая рука': 31 } },
      { date: '2026-02-01', values: { 'Талия': 76, 'Бицепс — левая рука': 32, 'Бицепс — правая рука': 33 } }
    ]
  });

  assert.match(html, /Персональные параметры/);
  assert.match(html, /Изменить параметры/);
  assert.match(html, /Последнее измерение · 2026-02-01/);
  assert.match(html, /<span>Талия<\/span><b>76 см<\/b>/);
  assert.match(html, /<span>Бицепс<\/span><b>32 см<\/b><b>33 см<\/b>/);
  assert.match(html, /id="profile-edit-measures"/);
});

test('profile screen safely escapes user-provided values and renders empty measurements', () => {
  const html = renderProfile({
    profile: { sex: '<img src=x>', allergies: ['<script>'] }
  });

  assert.match(html, /&lt;img src=x&gt;/);
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /Замеры пока не добавлены/);
  assert.match(html, /Не указано/);
});
