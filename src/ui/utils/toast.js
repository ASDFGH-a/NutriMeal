/**
 * Всплывающие уведомления — UI-компонент toast из PWA v60.
 * Заменяет alert на ненавязчивые сообщения в нижней части экрана.
 */
let _toastTimer = null;
let _toastEl = null;

/**
 * Показать toast-уведомление.
 * @param {string} msg — Текст сообщения
 * @param {string|null} actionLabel — Метка кнопки действия (необязательно)
 * @param {Function|null} action — Функция при клике на действие (необязательно)
 */
export function toast(msg, actionLabel = null, action = null) {
  if (!_toastEl) {
    try {
      _toastEl = document.getElementById('toast');
    } catch {
      return; // Нет DOM — молча игнорируем
    }
  }
  if (!_toastEl) return;

  _toastEl.textContent = '';
  const text = document.createElement('span');
  text.textContent = msg;
  _toastEl.appendChild(text);

  if (actionLabel && typeof action === 'function') {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'toast-action';
    button.textContent = actionLabel;
    button.onclick = () => {
      clearTimeout(_toastTimer);
      _toastEl.classList.remove('show');
      action();
    };
    _toastEl.appendChild(button);
  }

  _toastEl.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => _toastEl.classList.remove('show'), 4200);
}

/**
 * Сбросить ссылку на DOM-элемент (для изоляции тестов).
 */
export function resetToastElement() {
  _toastEl = null;
}
