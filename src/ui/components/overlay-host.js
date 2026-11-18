(function registerOverlayHost(root) {
  const ui = root.NutriMealUI || {};

  ui.renderModalHost = function renderModalHost({ title = 'Добавить' } = {}) {
    return `<div class="modal-backdrop" id="modal-backdrop"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" tabindex="-1"><div class="modal-head"><h2 id="modal-title">${title}</h2><button class="modal-close" id="modal-close" aria-label="Закрыть">×</button></div><div id="modal-body"></div><div class="modal-actions" id="modal-actions"></div></section></div>`;
  };

  ui.renderToastHost = function renderToastHost() {
    return '<div class="toast" id="toast" role="status" aria-live="polite"></div>';
  };

  ui.renderOverlayHost = function renderOverlayHost(options) {
    return `${ui.renderModalHost(options)}${ui.renderToastHost()}`;
  };

  root.NutriMealUI = ui;
})(globalThis);
