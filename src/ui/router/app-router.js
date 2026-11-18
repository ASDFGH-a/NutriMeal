(function registerAppRouter(root) {
  const ui = root.NutriMealUI || {};

  ui.createAppRouter = function createAppRouter({
    state,
    onNavigate
  }) {
    if (!state || typeof state.setPage !== 'function') {
      throw new TypeError('Router requires an application state.');
    }
    if (typeof onNavigate !== 'function') {
      throw new TypeError('Router requires a navigation callback.');
    }

    return {
      get activePage() {
        return state.activePage;
      },
      navigate(page) {
        const changed = state.setPage(page);
        onNavigate(page);
        return changed;
      },
      bindNavigation(container) {
        if (!container || typeof container.addEventListener !== 'function') {
          throw new TypeError('Navigation container is required.');
        }
        container.addEventListener('click', (event) => {
          const button = event.target.closest('[data-page]');
          if (!button) return;
          this.navigate(button.dataset.page);
        });
      }
    };
  };

  root.NutriMealUI = ui;
})(globalThis);
