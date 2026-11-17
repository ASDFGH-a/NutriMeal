function requireEscape(escapeHtml) {
  if (typeof escapeHtml !== 'function') {
    throw new TypeError('profile token markup requires escapeHtml(value)');
  }
  return escapeHtml;
}

function asValues(values) {
  return Array.isArray(values) ? values : [];
}

export function profileTokenChipMarkup(values, type, escapeHtml) {
  const escape = requireEscape(escapeHtml);
  const items = asValues(values);
  if (!items.length) return '<span class="profile-no-data">Не указано</span>';

  const safeType = escape(type);
  return items.map((value, index) => {
    const safeValue = escape(value);
    return `<span class="profile-token-chip"><span>${safeValue}</span><button type="button" aria-label="Удалить ${safeValue}" data-profile-token-remove="${safeType}" data-index="${index}">×</button></span>`;
  }).join('');
}

export function profileTokenDisplayMarkup(values, escapeHtml) {
  const escape = requireEscape(escapeHtml);
  const items = asValues(values);
  return items.length
    ? items.map(value => `<span class="profile-token-chip"><span>${escape(value)}</span></span>`).join('')
    : '<span class="profile-no-data">Не указано</span>';
}

export function profileTokenEditorMarkup(type, label, placeholder, help = '', escapeHtml) {
  const escape = requireEscape(escapeHtml);
  const safeType = escape(type);
  const safeLabel = escape(label);
  const safePlaceholder = escape(placeholder);
  const safeHelp = escape(help);
  return `<div class="field full"><label for="profile-${safeType}-input">${safeLabel}</label><div class="profile-token-editor"><div class="profile-token-input"><input id="profile-${safeType}-input" type="text" autocomplete="off" placeholder="${safePlaceholder}"><button type="button" class="btn" id="profile-${safeType}-add">Добавить</button></div><div class="profile-token-suggestions" id="profile-${safeType}-suggestions"></div><div class="profile-token-list" id="profile-${safeType}-selected"></div></div>${safeHelp ? `<div class="field-help">${safeHelp}</div>` : ''}</div>`;
}
