import { getDiaryStatistics } from '../../application/usecases/statistics/get-diary-statistics.js';
import {
  getDiaryStatisticsBuckets,
  getDiaryStatisticsRange,
  getMeasurementDelta,
  STATISTICS_PERIODS
} from '../../domain/statistics/diary-statistics.js';
import { measurementValue } from '../../domain/measurement/measurement-calculations.js';
import { dateKey, isValidDateKey, todayLocalDate } from '../../domain/shared/date-utils.js';

const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
const MEASUREMENT_NAMES = ['Талия', 'Грудь', 'Бёдра', 'Плечи'];

function dateFromKey(key) {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function readableDate(key) {
  const [year, month, day] = key.split('-').map(Number);
  return `${day} ${MONTHS[month - 1]} ${year} г.`;
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString('ru-RU', { maximumFractionDigits: 1 });
}

function averageText(value, unit = '') {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return '—';
  return `${formatNumber(value)}${unit ? ` ${unit}` : ''}`;
}

function percentText(value) {
  return `${Math.round(value)}%`;
}

function daysText(value) {
  const count = Math.abs(Math.trunc(Number(value) || 0));
  const lastTwo = count % 100;
  const last = count % 10;
  const suffix = lastTwo >= 11 && lastTwo <= 14
    ? 'дней'
    : last === 1 ? 'день' : last >= 2 && last <= 4 ? 'дня' : 'дней';
  return `${count} ${suffix}`;
}

function periodCaption(period) {
  const preset = STATISTICS_PERIODS.find((item) => item.key === period);
  if (!preset) return 'Произвольный период';
  return preset.days === 365 ? 'Последние 12 месяцев' : `Последние ${preset.days} дней`;
}

function chartLabel(startKey, endKey, period) {
  const start = dateFromKey(startKey);
  const end = dateFromKey(endKey);
  if (startKey === endKey) {
    return period === 'Неделя'
      ? start.toLocaleDateString('ru-RU', { weekday: 'short' }).replace(/\.$/, '')
      : start.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }).replace(/\.$/, '');
  }
  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    return `${start.getDate()}–${end.getDate()} ${end.toLocaleDateString('ru-RU', { month: 'short' }).replace(/\.$/, '')}`;
  }
  return `${start.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })} – ${end.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}`;
}

function makeBuckets(stats, key, period) {
  return getDiaryStatisticsBuckets(stats, key, period).map((bucket) => ({
    ...bucket,
    label: bucket.startKey ? chartLabel(bucket.startKey, bucket.endKey, period) : ''
  }));
}

export function createStatisticsFlow({
  document,
  ui,
  data,
  openModal,
  closeModal,
  showToast,
  escapeHtml
}) {
  const page = document.getElementById('page');
  let period = 'Неделя';
  let periodEnd = dateKey(todayLocalDate());
  let customStart = '';
  let customEnd = '';
  let currentStats = null;

  function statsBars(values, unit = '') {
    if (!values.length) return '<div class="history-empty">Нет данных за выбранный период.</div>';
    const max = Math.max(...values.map((item) => Number.isFinite(item.value) ? item.value : 0), 1);
    return `<div class="stats-bars" style="grid-template-columns:repeat(${values.length},minmax(0,1fr))" role="img" aria-label="Динамика показателя за ${escapeHtml(periodCaption(period))}">${values.map((item) => `<div class="stats-bar-column"><div class="stats-bar-value">${item.value === null ? '—' : `${formatNumber(item.value)}${unit}`}</div><div class="stats-bar-track"><i style="height:${item.value === null ? 0 : Math.max(3, Math.round(item.value / max * 100))}%"></i></div><span>${escapeHtml(item.label)}</span></div>`).join('')}</div>`;
  }

  function statsProgressRow(label, value, percent, meta = '') {
    return `<div class="stats-progress-row"><div class="stats-progress-head"><span>${escapeHtml(label)}</span><b>${escapeHtml(value)}</b></div><div class="stats-progress-track"><i style="width:${Math.min(100, Math.max(0, percent))}%"></i></div>${meta ? `<small>${escapeHtml(meta)}</small>` : ''}</div>`;
  }

  function statsCoverageMetric(label, used, total, note) {
    const percent = total ? Math.min(100, Math.max(0, used / total * 100)) : 0;
    return `<div class="stats-coverage-metric"><div class="stats-coverage-metric-head"><b>${escapeHtml(label)}</b><strong>${used} из ${total} дн.</strong></div><div class="stats-coverage-track"><i style="width:${percent}%"></i></div><small>${escapeHtml(note)}</small></div>`;
  }

  function statsLine(values) {
    const points = values
      .map((item) => ({ label: String(item.label), value: Number(item.value) }))
      .filter((item) => Number.isFinite(item.value));
    if (!points.length) return '<div class="history-empty">Нет данных о весе за выбранный период.</div>';

    const target = Number(data.plan.targetWeight);
    const hasTarget = Number.isFinite(target) && target > 0;
    const bounds = [...points.map((item) => item.value), ...(hasTarget ? [target] : [])];
    const rawMin = Math.min(...bounds);
    const rawMax = Math.max(...bounds);
    const spread = Math.max(rawMax - rawMin, 0.8);
    const padding = Math.max(spread * 0.32, 0.35);
    const step = spread <= 1.5 ? 0.5 : 1;
    const min = Math.floor((rawMin - padding) / step) * step;
    const max = Math.ceil((rawMax + padding) / step) * step;
    const range = Math.max(max - min, step);
    const width = 960;
    const height = 250;
    const left = 64;
    const right = 936;
    const top = 22;
    const bottom = 188;
    const xFor = (index) => points.length === 1
      ? (left + right) / 2
      : left + index * (right - left) / (points.length - 1);
    const yFor = (value) => bottom - ((value - min) / range) * (bottom - top);
    const coords = points.map((item, index) => ({ x: xFor(index), y: yFor(item.value) }));
    const ticks = Array.from({ length: 5 }, (_, index) => min + range / 4 * index);
    const grid = ticks.map((value) => {
      const y = yFor(value);
      return `<line x1="${left}" y1="${y.toFixed(2)}" x2="${right}" y2="${y.toFixed(2)}" class="stats-line-grid"/><text x="51" y="${(y + 4).toFixed(2)}" text-anchor="end" class="stats-line-axis-text">${formatNumber(value)}</text>`;
    }).join('');
    const targetLine = hasTarget
      ? `<line x1="${left}" y1="${yFor(target).toFixed(2)}" x2="${right}" y2="${yFor(target).toFixed(2)}" class="stats-line-target"/><text x="${right - 3}" y="20" text-anchor="end" class="stats-line-target-label">Цель ${formatNumber(target)} кг</text>`
      : '';
    const path = coords.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(' ');
    const dots = coords.map((point, index) => `<circle cx="${point.x.toFixed(2)}" cy="${point.y.toFixed(2)}" r="4.5" class="stats-line-dot"><title>${escapeHtml(points[index].label)}: ${formatNumber(points[index].value)} кг</title></circle>`).join('');
    const labelStep = Math.max(1, Math.ceil(points.length / 8));
    const labels = coords.map((point, index) => {
      if (index !== 0 && index !== points.length - 1 && index % labelStep !== 0) return '';
      return `<text x="${point.x.toFixed(2)}" y="224" text-anchor="middle" class="stats-line-axis-text">${escapeHtml(points[index].label)}</text>`;
    }).join('');
    return `<div class="stats-line-chart"><svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Динамика веса за период, килограммы">${grid}${targetLine}<path d="${path}" class="stats-line-path"/>${dots}<line x1="${left}" y1="${bottom}" x2="${right}" y2="${bottom}" class="stats-line-baseline"/>${labels}</svg></div>`;
  }

  function formatSigned(value, unit) {
    const rounded = Math.round(Number(value) * 10) / 10;
    const sign = rounded > 0 ? '+' : rounded < 0 ? '−' : '';
    return `${sign}${formatNumber(Math.abs(rounded))}${unit}`;
  }

  function measurementDelta(name, current, previous) {
    const delta = getMeasurementDelta(name, current, previous);
    return delta === null ? 'Нет сравнения' : formatSigned(delta, ' см');
  }

  function makeRequest() {
    return {
      diaryEntries: data.diaryEntries,
      waterEntries: data.waterEntries,
      weightHistory: data.weightHistory,
      measurementHistory: data.measurementHistory,
      recipes: data.recipes,
      products: data.products,
      profile: data.profile,
      nutritionSets: data.nutritionSets,
      activeNutritionSetId: data.activeNutritionSetId,
      period,
      periodEnd,
      customStart,
      customEnd,
      today: todayLocalDate()
    };
  }

  function openDetail(key) {
    if (!currentStats) return;
    const stats = currentStats;
    const body = stats.body;
    const dateRange = `${readableDate(stats.startKey)} — ${readableDate(stats.endKey)}`;
    let title;
    let eyebrow;
    let value;
    let unit;
    let note;
    let chart;
    let rows;

    if (key === 'calories') {
      title = 'Калории';
      eyebrow = 'ФАКТИЧЕСКОЕ ПОТРЕБЛЕНИЕ';
      value = averageText(stats.averages.kcal);
      unit = 'ккал / календарный день';
      note = stats.foodEntries.length
        ? `Всего ${averageText(stats.totals.kcal, 'ккал')} за ${stats.days} календарных дней. Среднее включает дни без записей.`
        : 'В выбранном периоде нет записей питания.';
      chart = statsBars(makeBuckets(stats, 'kcal', period));
      const goal = Number(data.plan.kcal) || 0;
      rows = [
        ['Всего за период', averageText(stats.totals.kcal, 'ккал')],
        ['Среднее за календарный день', averageText(stats.averages.kcal, 'ккал')],
        ['Ориентир в день', goal ? averageText(goal, 'ккал') : 'Не задан'],
        ['Среднее от ориентира', goal ? percentText(stats.averages.kcal / goal * 100) : 'Нет ориентира'],
        ['Дней с записями', `${stats.loggedFoodDays} из ${stats.days}`]
      ];
    } else if (key === 'macros') {
      title = 'БЖУ';
      eyebrow = 'ФАКТИЧЕСКИЕ МАКРОНУТРИЕНТЫ';
      value = `${averageText(stats.averages.p)} / ${averageText(stats.averages.f)} / ${averageText(stats.averages.c)}`;
      unit = 'белки · жиры · углеводы, г / день с данными';
      note = stats.macroKnownDays
        ? `Среднее рассчитано по ${stats.macroKnownDays} из ${stats.days} дн. с известными БЖУ. Исключено: ${daysText(stats.macroIncompleteDays)} с неполным составом и ${daysText(stats.noRecordDays)} без записей.`
        : 'Нет дней с пригодными данными о БЖУ. Неполные калорийные записи и дни без записей не считаются нулевыми значениями.';
      chart = `<div class="stats-detail-macro-bars">${[
        ['Белки', 'p'],
        ['Жиры', 'f'],
        ['Углеводы', 'c']
      ].map(([label, nutrient]) => statsProgressRow(
        label,
        averageText(stats.averages[nutrient], 'г'),
        stats.averages[nutrient] !== null && Number(data.plan[nutrient]) > 0
          ? stats.averages[nutrient] / data.plan[nutrient] * 100
          : 0,
        `Цель: ${formatNumber(data.plan[nutrient])} г / день`
      )).join('')}</div>`;
      rows = [
        ['Дней с известными БЖУ', `${stats.macroKnownDays} из ${stats.days}`],
        ['Дней с неполным составом', String(stats.macroIncompleteDays)],
        ['Дней без записей питания', String(stats.noRecordDays)],
        ['Белки · всего', averageText(stats.totals.p, 'г')],
        ['Жиры · всего', averageText(stats.totals.f, 'г')],
        ['Углеводы · всего', averageText(stats.totals.c, 'г')]
      ];
    } else if (key === 'water') {
      const waterBuckets = makeBuckets(stats, 'water', period).map((item) => ({ ...item, value: item.value / 1000 }));
      const recorded = stats.dailyRows.map((row) => row.waterMl).filter((amount) => amount > 0);
      title = 'Вода';
      eyebrow = 'ФАКТИЧЕСКОЕ ПОТРЕБЛЕНИЕ ВОДЫ';
      value = averageText(stats.waterAverageMl / 1000);
      unit = 'л на календарный день';
      note = `Всего ${averageText(stats.waterTotalMl / 1000, 'л')} · учитываются только записи обычной воды`;
      chart = statsBars(waterBuckets, ' л');
      rows = [
        ['Всего за период', averageText(stats.waterTotalMl / 1000, 'л')],
        ['Среднее за календарный день', averageText(stats.waterAverageMl / 1000, 'л')],
        ['Дней с записями воды', `${stats.loggedWaterDays} из ${stats.days}`],
        ['Максимум за день', recorded.length ? averageText(Math.max(...recorded) / 1000, 'л') : 'Нет данных'],
        ['Минимум среди дней с записями', recorded.length ? averageText(Math.min(...recorded) / 1000, 'л') : 'Нет данных']
      ];
    } else if (key === 'variety') {
      title = 'Полнота и разнообразие';
      eyebrow = 'ФАКТИЧЕСКИЙ СОСТАВ РАЦИОНА';
      value = String(stats.allFoodItemCount);
      unit = 'разных продуктов за период';
      note = stats.foodEntries.length
        ? `${stats.groupStats.filter((item) => item.entries >= item.targetEntries).length} из ${stats.groupStats.length} групп достигли частотного ориентира`
        : 'В выбранном периоде нет записей питания.';
      chart = `<div class="stats-detail-list">${stats.groupStats.map((item) => statsProgressRow(
        item.group.label,
        `${item.entries} / ${item.targetEntries} блюд`,
        item.frequencyPercent,
        `${item.dayCount} дней · ${item.itemCount} разных продуктов`
      )).join('')}</div>`;
      rows = [
        ['Уникальных продуктов всего', String(stats.allFoodItemCount)],
        ['Записей питания', String(stats.foodEntries.length)],
        ...stats.groupStats.map((item) => [item.group.label, `${item.entries} блюд · ${item.itemCount} продуктов`])
      ];
    } else if (key === 'micros') {
      title = 'Витамины и минералы';
      eyebrow = 'МИКРОНУТРИЕНТЫ ИЗ СОСТАВА ПРОДУКТОВ';
      value = stats.averageCoverage === null ? '—' : percentText(stats.averageCoverage);
      unit = stats.averageCoverage === null ? 'нет сопоставимых норм' : 'среднее покрытие RDA / AI';
      note = stats.micronutrients.length
        ? `Есть данные о микронутриентах за ${stats.microKnownDays} из ${stats.days} дн. Среднее считается только по дням, где компонент указан.`
        : 'В записях периода нет данных о микронутриентах.';
      chart = stats.micronutrients.length
        ? `<div class="stats-detail-list">${stats.micronutrients.map((item) => {
          const actual = `${formatNumber(item.dailyAmount)} ${escapeHtml(item.unit)}`;
          const target = item.target
            ? `${item.percent}% от ${item.target.kind} · ${formatNumber(item.target.value)} ${escapeHtml(item.target.unit)}`
            : 'Нет сопоставимой нормы';
          return `<div class="stats-progress-row"><div class="stats-progress-head"><span>${escapeHtml(item.name)}</span><b>${actual}</b></div>${item.percent === null ? '' : `<div class="stats-progress-track"><i style="width:${Math.min(100, Math.max(0, item.percent))}%"></i></div>`}<small>${target} · ${daysText(item.daysCount)} с данными</small></div>`;
        }).join('')}</div>`
        : '<div class="history-empty">Нет фактических данных о микронутриентах за этот период.</div>';
      rows = [
        ['Дней с данными о микронутриентах', `${stats.microKnownDays} из ${stats.days}`],
        ['Дней без данных о микронутриентах', String(stats.microMissingOnKnownMacroDays)],
        ['Компонентов с данными', String(stats.micronutrients.length)],
        ['Сопоставлены с нормами', String(stats.micronutrients.filter((item) => item.percent !== null).length)],
        ['Среднее покрытие', stats.averageCoverage === null ? 'Не рассчитано' : percentText(stats.averageCoverage)]
      ];
    } else if (key === 'weight') {
      const latest = body.latestWeight;
      title = 'Вес';
      eyebrow = 'ДИНАМИКА МАССЫ ТЕЛА';
      value = latest ? formatNumber(latest.weight) : '—';
      unit = 'кг';
      note = latest ? `Последнее измерение · ${readableDate(latest.date)}` : 'За выбранный период нет записей веса.';
      chart = statsLine(body.weights.map((item) => ({
        label: dateFromKey(item.date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }),
        value: Number(item.weight)
      })));
      const target = Number(data.plan.targetWeight);
      rows = [
        ['Последнее измерение', latest ? `${formatNumber(latest.weight)} кг · ${readableDate(latest.date)}` : 'Нет данных за период'],
        ['Изменение за период', body.weightChange === null ? 'Недостаточно измерений для сравнения' : formatSigned(body.weightChange, ' кг')],
        ['Целевой ориентир', Number.isFinite(target) && target > 0 ? `${formatNumber(target)} кг` : 'Не задан'],
        ['Измерений за период', String(body.weights.length)]
      ];
    } else if (key === 'measures') {
      const latest = body.latestMeasure;
      const filled = latest
        ? MEASUREMENT_NAMES.filter((name) => measurementValue(name, latest.values) !== null).length
        : 0;
      title = 'Замеры тела';
      eyebrow = 'ИЗМЕНЕНИЯ ПАРАМЕТРОВ';
      value = latest ? String(filled) : '—';
      unit = 'показателей заполнено';
      note = latest ? `Последний замер · ${readableDate(latest.date)}` : 'За выбранный период нет записей замеров.';
      chart = latest
        ? `<div class="stats-measure-list">${MEASUREMENT_NAMES.map((name) => {
          const current = measurementValue(name, latest.values);
          if (current === null) return '';
          return `<div><span>${escapeHtml(name)}</span><b>${formatNumber(current)} см</b><small>${escapeHtml(measurementDelta(name, latest, body.previousMeasure))}</small></div>`;
        }).join('') || '<div class="history-empty">Нет замеров за выбранный период.</div>'}</div>`
        : '<div class="history-empty">Нет замеров за выбранный период.</div>';
      rows = [
        ['Последнее измерение', latest ? readableDate(latest.date) : 'Нет данных'],
        ['Заполнено параметров', `${filled} из ${MEASUREMENT_NAMES.length}`],
        ['История измерений', `${body.measureRecords.length} записей за период`]
      ];
    } else {
      return;
    }

    const table = rows.map(([label, content]) => (
      `<div class="stats-detail-row"><span>${escapeHtml(label)}</span><b>${escapeHtml(content)}</b></div>`
    )).join('');
    const modalBody = `<div class="stats-detail"><div class="stats-detail-period">${escapeHtml(periodCaption(period))} · ${escapeHtml(dateRange)}</div><div class="stats-detail-hero"><span>${escapeHtml(eyebrow)}</span><strong>${escapeHtml(value)}</strong><b>${escapeHtml(unit)}</b><small>${escapeHtml(note)}</small></div><section class="stats-detail-section"><div class="stats-detail-section-head"><b>Динамика</b><span>${escapeHtml(periodCaption(period))}</span></div>${chart}</section><section class="stats-detail-section"><div class="stats-detail-section-head"><b>Показатели периода</b></div><div class="stats-detail-table">${table}</div></section></div>`;
    openModal(title, modalBody, '<button type="button" class="btn" id="stats-detail-close">Закрыть</button>');
    document.querySelector('.modal').classList.add('stats-detail-modal');
    document.getElementById('stats-detail-close').addEventListener('click', closeModal);
  }

  function openPeriodPicker() {
    const today = dateKey(todayLocalDate());
    const range = getDiaryStatisticsRange({ period, periodEnd, customStart, customEnd, today: todayLocalDate() });
    const draft = {
      preset: period === 'Произвольный период' ? 'custom' : period,
      start: range.startKey,
      end: range.endKey
    };
    const presetMarkup = STATISTICS_PERIODS.map((item) => {
      const label = item.days === 365 ? '12 месяцев' : `${item.days} дней`;
      const active = draft.preset === item.key;
      return `<button type="button" class="stats-period-option ${active ? 'active' : ''}" data-stats-preset="${escapeHtml(item.key)}" aria-pressed="${active}"><strong>${label}</strong><small>${periodCaption(item.key)}</small></button>`;
    }).join('');
    const body = `<div class="stats-period-picker"><div class="stats-period-picker-label">Быстрый выбор</div><div class="stats-period-options">${presetMarkup}</div><div class="stats-period-picker-divider"><span>Или задай даты вручную</span></div><div class="stats-period-range-fields"><div class="field"><label for="stats-range-start">Начало периода</label><input id="stats-range-start" type="date" max="${today}" value="${draft.start}"></div><div class="field"><label for="stats-range-end">Конец периода</label><input id="stats-range-end" type="date" max="${today}" value="${draft.end}"></div></div><div class="stats-period-picker-hint" id="stats-period-picker-hint">Выбери готовый интервал или укажи любые даты. Будущие даты недоступны.</div></div>`;
    openModal('Период статистики', body, '<button type="button" class="btn" id="stats-period-cancel">Отмена</button><button type="button" class="btn-primary" id="stats-period-apply">Применить</button>');
    document.querySelector('.modal').classList.add('stats-period-modal');
    const startInput = document.getElementById('stats-range-start');
    const endInput = document.getElementById('stats-range-end');
    const updateButtons = () => document.querySelectorAll('[data-stats-preset]').forEach((button) => {
      const active = button.dataset.statsPreset === draft.preset;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    document.querySelectorAll('[data-stats-preset]').forEach((button) => {
      button.addEventListener('click', () => {
        const preset = STATISTICS_PERIODS.find((item) => item.key === button.dataset.statsPreset);
        if (!preset) return;
        const end = todayLocalDate();
        const start = new Date(end);
        start.setDate(start.getDate() - preset.days + 1);
        draft.preset = preset.key;
        draft.start = dateKey(start);
        draft.end = dateKey(end);
        startInput.value = draft.start;
        endInput.value = draft.end;
        updateButtons();
      });
    });
    [startInput, endInput].forEach((input) => input.addEventListener('change', () => {
      draft.preset = 'custom';
      draft.start = startInput.value;
      draft.end = endInput.value;
      updateButtons();
    }));
    document.getElementById('stats-period-cancel').addEventListener('click', closeModal);
    document.getElementById('stats-period-apply').addEventListener('click', () => {
      const start = startInput.value;
      const end = endInput.value;
      if (!isValidDateKey(start) || !isValidDateKey(end)) {
        showToast('Укажи обе даты периода');
        return;
      }
      if (start > end) {
        showToast('Начало периода не может быть позже окончания');
        return;
      }
      if (end > today) {
        showToast('Нельзя выбрать будущие даты');
        return;
      }
      if (draft.preset === 'custom') {
        period = 'Произвольный период';
        customStart = start;
        customEnd = end;
        periodEnd = end;
      } else {
        period = draft.preset;
        periodEnd = end;
        customStart = '';
        customEnd = '';
      }
      closeModal();
      render();
    });
  }

  function shiftPeriod(direction) {
    const range = getDiaryStatisticsRange({ period, periodEnd, customStart, customEnd, today: todayLocalDate() });
    const start = new Date(range.start);
    const end = new Date(range.end);
    start.setDate(start.getDate() + direction * range.days);
    end.setDate(end.getDate() + direction * range.days);
    const today = todayLocalDate();
    if (direction > 0 && end > today) {
      end.setTime(today.getTime());
      start.setTime(today.getTime());
      start.setDate(start.getDate() - range.days + 1);
    }
    if (direction > 0 && range.endKey >= dateKey(today)) return;
    if (period === 'Произвольный период') {
      customStart = dateKey(start);
      customEnd = dateKey(end);
      periodEnd = customEnd;
    } else {
      periodEnd = dateKey(end);
    }
    render();
  }

  function render() {
    let stats;
    try {
      stats = getDiaryStatistics(makeRequest());
    } catch (error) {
      console.error('Не удалось рассчитать статистику дневника', error);
      pageError();
      return;
    }
    currentStats = stats;
    const periodLabel = periodCaption(period);
    const canMoveForward = stats.endKey < dateKey(todayLocalDate());
    const foodRange = `${readableDate(stats.startKey)} — ${readableDate(stats.endKey)}`;
    const plan = data.plan;
    const macroMarkup = [
      ['Белки', 'p'],
      ['Жиры', 'f'],
      ['Углеводы', 'c']
    ].map(([label, key]) => statsProgressRow(
      label,
      `${averageText(stats.averages[key])}${stats.averages[key] === null ? '' : ' г'}`,
      stats.averages[key] !== null && Number(plan[key]) > 0 ? stats.averages[key] / plan[key] * 100 : 0,
      stats.averages[key] === null ? 'Нет полных данных' : `Цель ${formatNumber(plan[key])} г / день`
    )).join('');
    const calorieGoal = Number(plan.kcal) || 0;
    const calorieGoalText = calorieGoal
      ? `${percentText(stats.averages.kcal / calorieGoal * 100)} от цели ${formatNumber(calorieGoal)} ккал`
      : 'Цель не задана';
    const waterTotalLitres = stats.waterTotalMl / 1000;
    const waterAverageLitres = stats.waterAverageMl / 1000;
    const varietyMarkup = stats.groupStats.map((item) => `<div class="stats-variety-item"><div><span>${escapeHtml(item.group.label)}</span><b>${item.entries} / ${item.targetEntries}</b></div><div class="stats-progress-track"><i style="width:${Math.min(100, Math.max(0, item.frequencyPercent))}%"></i></div><small class="muted">${item.itemCount} разных · ${item.dayCount} дн.</small></div>`).join('');
    const microPreview = stats.micronutrients.slice(0, 6).map((item) => {
      const value = item.percent === null ? `${formatNumber(item.dailyAmount)} ${item.unit}` : `${item.percent}%`;
      return `<div class="stats-micro-item"><span>${escapeHtml(item.name)}</span><b class="${item.percent !== null && item.percent < 75 ? 'is-low-text' : ''}">${escapeHtml(value)}</b></div>`;
    }).join('');
    const microSummary = stats.averageCoverage === null ? '—' : `${stats.averageCoverage}%`;
    const microSummaryLabel = stats.micronutrients.length
      ? stats.averageCoverage === null ? 'нет сопоставимых норм' : 'среднее покрытие RDA / AI'
      : 'нет данных в составе';
    const latestMeasure = stats.body.latestMeasure;
    const measureCards = latestMeasure
      ? MEASUREMENT_NAMES.map((name) => {
        const value = measurementValue(name, latestMeasure.values);
        return `<div class="stats-measure-mini"><span>${escapeHtml(name)}</span><b>${value === null ? '—' : `${formatNumber(value)} см`}</b><small>${escapeHtml(measurementDelta(name, latestMeasure, stats.body.previousMeasure))}</small></div>`;
      }).join('')
      : '<div class="muted-box">Нет замеров за выбранный период.</div>';
    const weightTarget = Number(plan.targetWeight);
    const weightTargetText = Number.isFinite(weightTarget) && weightTarget > 0
      ? `Целевой ориентир ${formatNumber(weightTarget)} кг`
      : 'Целевой ориентир не задан';
    const weightChangeText = stats.body.weightChange === null
      ? stats.body.weights.length ? 'Одно измерение за период' : 'Нет измерений за период'
      : `Изменение за период: ${formatSigned(stats.body.weightChange, ' кг')}`;
    const weightLatest = stats.body.latestWeight;
    const coverageMarkup = `<section class="card stats-coverage-card"><div class="stats-coverage-head"><b>Покрытие аналитики</b><small>Сколько дней выбранного периода содержит данные для каждого показателя</small></div><div class="stats-coverage-grid">${statsCoverageMetric('Калории', stats.loggedFoodDays, stats.days, `${stats.noRecordDays} дн. без записей. Среднее калорий делится на все ${stats.days} календарных дней.`)}${statsCoverageMetric('БЖУ', stats.macroKnownDays, stats.days, `Исключено ${stats.macroIncompleteDays} дн. с неполным составом и ${stats.noRecordDays} дн. без записей.`)}${statsCoverageMetric('Витамины и минералы', stats.microKnownDays, stats.days, `Нет данных ещё за ${stats.microMissingOnKnownMacroDays} дн. с известными БЖУ, ${stats.macroIncompleteDays} неполных дн. и ${stats.noRecordDays} дн. без записей.`)}${statsCoverageMetric('Полнота и разнообразие', stats.varietyKnownDays, stats.days, 'Калорийные записи и дни без записей не учитываются.')}</div><div class="stats-coverage-status"><b>Состояние дней:</b> данные о БЖУ — ${stats.macroKnownDays}; только калории — ${stats.onlyCalorieDays}; смешанные записи — ${stats.mixedCalorieDays}; без записей — ${stats.noRecordDays}.</div></section>`;
    const calorieCard = `<section class="card stats-overview-card" role="button" tabindex="0" data-stats-detail="calories" aria-label="Подробнее: калории"><div class="stats-card-head"><div class="stats-card-title"><span class="stats-card-icon stats-icon-calories">♨</span><div><b>Калории</b><small>Среднее потребление на календарный день</small></div></div><span class="tag">ккал</span></div><div class="stats-card-main"><strong>${formatNumber(stats.averages.kcal)} <small>ккал / день</small></strong><span>${escapeHtml(calorieGoalText)}</span></div>${statsBars(makeBuckets(stats, 'kcal', period))}<div class="stats-card-foot"><span>${stats.foodEntries.length ? `Всего ${formatNumber(stats.totals.kcal)} ккал · ${stats.loggedFoodDays} дн. с записями` : 'Нет записей за период'}</span><b>Подробнее ↗</b></div></section>`;
    const macroCard = `<section class="card stats-overview-card" role="button" tabindex="0" data-stats-detail="macros" aria-label="Подробнее: БЖУ"><div class="stats-card-head"><div class="stats-card-title"><span class="stats-card-icon stats-icon-macros">∑</span><div><b>БЖУ</b><small>Среднее по дням с известным составом</small></div></div><span class="tag">г / день с данными</span></div><div class="stats-macro-overview">${macroMarkup}</div><div class="stats-card-foot"><span>${stats.macroKnownDays} из ${stats.days} дн. участвуют в среднем БЖУ${stats.macroIncompleteDays ? ` · ${stats.macroIncompleteDays} с неполными данными исключено` : ''}</span><b>Подробнее ↗</b></div></section>`;
    const waterCard = `<section class="card stats-overview-card" role="button" tabindex="0" data-stats-detail="water" aria-label="Подробнее: вода"><div class="stats-card-head"><div class="stats-card-title"><span class="stats-card-icon stats-icon-water">◉</span><div><b>Вода</b><small>Среднее потребление на календарный день</small></div></div><span class="tag">л</span></div><div class="stats-card-main"><strong>${formatNumber(waterAverageLitres)} <small>л / день</small></strong><span>${formatNumber(waterTotalLitres)} л всего · ${stats.loggedWaterDays} дн. с записями</span></div>${statsBars(makeBuckets(stats, 'water', period).map((item) => ({ ...item, value: item.value / 1000 })), ' л')}<div class="stats-card-foot"><span>Учитывается обычная вода из дневника</span><b>Подробнее ↗</b></div></section>`;
    const varietyCard = `<section class="card stats-overview-card" role="button" tabindex="0" data-stats-detail="variety" aria-label="Подробнее: полнота и разнообразие"><div class="stats-card-head"><div class="stats-card-title"><span class="stats-card-icon stats-icon-variety">✿</span><div><b>Полнота и разнообразие</b><small>Фактически съеденные продукты по группам</small></div></div><span class="tag">Категории</span></div><div class="stats-variety-grid">${varietyMarkup}</div><div class="stats-card-foot"><span>${stats.allFoodItemCount} уникальных продуктов · ${stats.groupStats.filter((item) => item.entries >= item.targetEntries).length} групп достигли ориентира</span><b>Подробнее ↗</b></div></section>`;
    const microCard = `<section class="card stats-overview-card" role="button" tabindex="0" data-stats-detail="micros" aria-label="Подробнее: витамины и минералы"><div class="stats-card-head"><div class="stats-card-title"><span class="stats-card-icon stats-icon-micros">✣</span><div><b>Витамины и минералы</b><small>По составу съеденных продуктов и рецептов</small></div></div><span class="tag">RDA / AI</span></div><div class="stats-micro-summary"><strong>${microSummary}</strong><span>${escapeHtml(microSummaryLabel)}</span></div><div class="stats-micro-grid">${microPreview || '<div class="muted-box">В записях за период пока нет данных о микронутриентах.</div>'}</div><div class="stats-card-foot"><span>${stats.micronutrients.length ? `${stats.micronutrients.length} компонентов · ${stats.microKnownDays} дн. с данными` : 'Нет данных состава'}</span><b>Подробнее ↗</b></div></section>`;
    const weightCard = `<section class="card stats-overview-card" role="button" tabindex="0" data-stats-detail="weight" aria-label="Подробнее: вес"><div class="stats-card-head"><div class="stats-card-title"><span class="stats-card-icon stats-icon-weight">◎</span><div><b>Вес</b><small>Динамика массы тела · ${escapeHtml(foodRange)}</small></div></div><span class="tag">кг</span></div><div class="stats-card-main"><strong>${weightLatest ? `${formatNumber(weightLatest.weight)} <small>кг</small>` : '— <small>кг</small>'}</strong><span>${weightLatest ? `${weightTargetText} · ${readableDate(weightLatest.date)}` : 'Добавь фактическое измерение веса'}</span></div>${stats.body.weights.length ? statsLine(stats.body.weights.map((item) => ({ label: dateFromKey(item.date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }), value: Number(item.weight) }))) : '<div class="history-empty">Нет данных о весе за выбранный период.</div>'}<div class="stats-card-foot"><span>${escapeHtml(weightChangeText)}</span><b>Подробнее ↗</b></div></section>`;
    const measuresCard = `<section class="card stats-overview-card" role="button" tabindex="0" data-stats-detail="measures" aria-label="Подробнее: замеры тела"><div class="stats-card-head"><div class="stats-card-title"><span class="stats-card-icon stats-icon-measures">↔</span><div><b>Замеры тела</b><small>Окружности и динамика параметров</small></div></div><span class="tag">см</span></div><div class="stats-measures-grid">${measureCards}</div><div class="stats-card-foot"><span>${latestMeasure ? `Последнее измерение · ${readableDate(latestMeasure.date)}` : 'Замеры пока не добавлены за период'}</span><b>Подробнее ↗</b></div></section>`;
    const periodDateRange = `${dateFromKey(stats.startKey).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })} — ${dateFromKey(stats.endKey).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })}`;
    page.innerHTML = ui.renderStatisticsScreen({
      periodLabel,
      periodRangeLabel: periodDateRange,
      canMoveForward,
      foodRange,
      coverageMarkup,
      calorieCard,
      macroCard,
      waterCard,
      varietyCard,
      microCard,
      weightCard,
      measuresCard,
      footerNote: 'Калории и вода усредняются по всем календарным дням периода. БЖУ усредняются только по дням с известным составом питания; дни с неполными данными и дни без записей исключаются. Микронутриенты усредняются только по дням, где компонент указан.'
    });
    document.getElementById('stats-period-trigger').addEventListener('click', openPeriodPicker);
    document.getElementById('stats-period-prev').addEventListener('click', () => shiftPeriod(-1));
    document.getElementById('stats-period-next').addEventListener('click', () => shiftPeriod(1));
    document.querySelectorAll('[data-stats-detail]').forEach((card) => {
      card.addEventListener('click', () => openDetail(card.dataset.statsDetail));
      card.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          openDetail(card.dataset.statsDetail);
        }
      });
    });
  }

  function pageError() {
    currentStats = null;
    page.innerHTML = '<section class="card"><h2>Не удалось загрузить статистику</h2><p class="muted">Проверь данные дневника и повтори попытку.</p></section>';
    showToast('Не удалось рассчитать статистику дневника');
  }

  return { render };
}
