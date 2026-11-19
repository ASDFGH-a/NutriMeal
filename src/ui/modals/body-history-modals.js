(function registerBodyHistoryModals(root) {
  const ui = root.NutriMealUI || {};

  function escapeValue(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  ui.renderWeightModalBody = function renderWeightModalBody({
    editing,
    record,
    history,
    today
  }) {
    if (editing) {
      return `<div class="form-grid"><div class="field"><label for="weight-value">Вес, кг</label><input id="weight-value" type="number" min="1" max="500" step="0.1" value="${record.weight}"></div><div class="field"><label for="weight-date">Дата измерения</label><input id="weight-date" type="date" max="${today}" value="${record.date}"></div></div><div class="field-help" style="margin-top:12px">Изменение обновит только эту запись истории.</div>`;
    }
    return `<div class="form-grid"><div class="field"><label for="weight-value">Текущий вес, кг</label><input id="weight-value" type="number" min="1" max="500" step="0.1" value="${history.length ? history[0].weight : ''}"></div><div class="field"><label for="weight-date">Дата измерения</label><input id="weight-date" type="date" max="${today}" value="${today}"></div></div><div class="field-help" style="margin-top:12px">Здесь фиксируется фактический вес. Цель и целевой вес задаются в разделе «Планирование».</div>`;
  };

  ui.renderWeightHistoryBody = function renderWeightHistoryBody({
    history,
    readableDate
  }) {
    if (!history.length) return '<div class="history-empty">История пока пуста</div>';
    return `<div class="history-list">${history.map((record, index) => `<div class="history-row"><div><strong>${readableDate(record.date)}</strong><small>${index === 0 ? 'Последняя запись' : 'Измерение'}</small></div><div class="history-row-actions"><div class="history-value">${Number(record.weight).toFixed(1).replace('.', ',')} кг</div><button class="entry-action" data-edit-weight="${record.date}" aria-label="Изменить вес за ${escapeValue(readableDate(record.date))}" title="Изменить">✎</button><button class="entry-action" data-delete-weight="${record.date}" aria-label="Удалить вес за ${escapeValue(readableDate(record.date))}" title="Удалить" ${history.length === 1 ? 'disabled' : ''}>×</button></div></div>`).join('')}</div>`;
  };

  ui.renderMeasurementHistoryBody = function renderMeasurementHistoryBody({
    history,
    readableDate
  }) {
    if (!history.length) return '<div class="history-empty">История пока пуста</div>';
    return `<div class="history-list">${history.map((record, index) => `<div class="history-row"><div><strong>${readableDate(record.date)}</strong><small>${Object.values(record.values || {}).filter((value) => Number(value) > 0).length} показателей · ${index === 0 ? 'Последняя запись' : 'Измерение'}</small></div><div class="history-row-actions"><button class="btn-quiet" data-edit-measure-date="${record.date}">Открыть</button><button class="entry-action" data-delete-measure-date="${record.date}" aria-label="Удалить замер за ${escapeValue(readableDate(record.date))}" title="Удалить">×</button></div></div>`).join('')}</div>`;
  };

  ui.renderMeasurementModalBody = function renderMeasurementModalBody({
    today,
    date,
    profileHeight,
    values,
    measurements,
    ratioMarkup
  }) {
    function inputMarkup(measurement, index) {
      return `<input class="measurement-value-input" id="measure-input-${index}" type="number" min="0" max="300" step="0.1" inputmode="decimal" aria-label="${escapeValue(measurement.name)}" placeholder="—" data-measure-name="${escapeValue(measurement.name)}" value="${values[measurement.name] ?? ''}">`;
    }
    function groupMarkup(group) {
      const items = measurements.filter((measurement) => measurement.group === group);
      if (group === 'Руки' || group === 'Ноги') {
        const labels = group === 'Руки' ? ['Бицепс', 'Предплечье'] : ['Бедро', 'Икра'];
        const side = group === 'Руки' ? 'рука' : 'нога';
        return `<div class="measurement-table"><div class="measurement-table-row measurement-table-head"><span></span><span>Левая</span><span>Правая</span></div>${labels.map((label) => {
          const left = items.find((measurement) => measurement.name === `${label} — левая ${side}`);
          const right = items.find((measurement) => measurement.name === `${label} — правая ${side}`);
          if (!left || !right) return '';
          return `<div class="measurement-table-row"><div class="measurement-table-name">${label}</div>${inputMarkup(left, measurements.indexOf(left))}${inputMarkup(right, measurements.indexOf(right))}</div>`;
        }).join('')}</div>`;
      }
      return `<div class="measurement-table">${items.map((measurement) => `<div class="measurement-table-row"><div class="measurement-table-name">${escapeValue(measurement.name)}</div>${inputMarkup(measurement, measurements.indexOf(measurement))}<span></span></div>`).join('')}</div>`;
    }
    const groups = ['Верхняя часть тела', 'Талия и таз', 'Руки', 'Ноги'];
    return `<div class="measurement-form-wrap"><div class="field measurement-date-field"><label for="measure-date">Дата измерения</label><input id="measure-date" type="date" max="${today}" value="${date}"></div><div class="field measurement-height-field"><label for="measure-height">Рост, см</label><input class="measurement-value-input" id="measure-height" type="number" min="80" max="250" step="0.1" inputmode="decimal" value="${values.height ?? profileHeight}"></div><div class="measurement-unit-note">Все остальные значения в см</div>${groups.map((group) => `<section class="detail-section measurement-section"><div class="detail-section-head"><div class="detail-section-title">${group.toUpperCase()}</div></div>${groupMarkup(group)}</section>`).join('')}</div><section class="detail-section"><div class="detail-section-head"><div class="detail-section-title">Соотношения</div><div class="detail-section-note">Рассчитываются автоматически</div></div><div class="ratio-grid" id="measure-ratios">${ratioMarkup}</div></section><div class="field-help" style="margin-top:12px">Показываются только показатели, для которых заполнены необходимые замеры. Проценты описывают пропорции и динамику, а не являются диагнозом.</div>`;
  };

  root.NutriMealUI = ui;
})(globalThis);
