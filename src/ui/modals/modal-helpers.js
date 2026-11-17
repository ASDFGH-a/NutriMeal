/**
 * Общие модальные окна — PWA v60 openModal / closeModal.
 * Вызывают DOM-элементы #modal-backdrop, .modal, #modal-body, #modal-actions.
 */
let _lastModalTrigger = null;

/**
 * Открыть модальное окно.
 * @param {string} title — Заголовок в h2
 * @param {string} body — HTML содержимого для #modal-body
 * @param {string} actions — HTML кнопок для #modal-actions
 */
export function openModal(title, body, actions) {
  const modal = document.querySelector('.modal');
  if (!modal) return;
  const head = document.querySelector('.modal-head');

  delete modal.dataset.nutritionSetCreateStage;
  modal.classList.remove(
    'calendar-modal', 'measurements-modal', 'profile-edit-modal',
    'meal-picker-modal', 'recipe-detail-modal', 'recipe-edit-modal',
    'stats-detail-modal', 'product-detail-modal', 'diary-entry-edit-modal',
    'filter-admin-modal', 'nutrition-set-create-modal', 'nutrition-review-modal',
    'mass-entry-modal', 'stats-period-modal'
  );
  if (head) head.classList.remove('calendar-modal-head');

  head.innerHTML = '<h2 id="modal-title"></h2><button class="modal-close" id="modal-close" aria-label="Закрыть">×</button>';
  const titleEl = document.getElementById('modal-title');
  if (titleEl) titleEl.textContent = title;
  if (titleEl) modal.setAttribute('aria-labelledby', 'modal-title');

  const closeBtn = document.getElementById('modal-close');
  if (closeBtn) closeBtn.onclick = closeModal;

  const bodyEl = document.getElementById('modal-body');
  if (bodyEl) bodyEl.innerHTML = body;
  const actionsEl = document.getElementById('modal-actions');
  if (actionsEl) actionsEl.innerHTML = actions;

  // Связываем label с input в модалке
  if (bodyEl) {
    bodyEl.querySelectorAll('.field').forEach((field, index) => {
      const label = field.querySelector('label');
      const control = field.querySelector('input,select,textarea');
      if (label && control) {
        if (!control.id) control.id = `modal-field-${index + 1}`;
        label.htmlFor = control.id;
      }
    });
  }

  const backdrop = document.getElementById('modal-backdrop');
  if (backdrop) {
    const alreadyOpen = backdrop.classList.contains('open');
    if (!alreadyOpen) {
      _lastModalTrigger = document.activeElement;
    }
    backdrop.classList.add('open');
  }

  // Фокус на первое поле или кнопку
  requestAnimationFrame(() => {
    const first = modal.querySelector('input:not([disabled]),select:not([disabled]),textarea:not([disabled])') || modal.querySelector('button:not([disabled])');
    (first || modal).focus();
  });
}

/**
 * Закрыть модальное окно.
 */
export function closeModal() {
  const backdrop = document.getElementById('modal-backdrop');
  if (!backdrop || !backdrop.classList.contains('open')) return;
  backdrop.classList.remove('open');
  if (_lastModalTrigger && typeof _lastModalTrigger.focus === 'function' && document.contains(_lastModalTrigger)) {
    _lastModalTrigger.focus();
  }
  _lastModalTrigger = null;
}
