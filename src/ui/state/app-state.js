(function registerAppState(root) {
  const ui = root.NutriMealUI || {};

  ui.createAppState = function createAppState(initialPage = 'diary') {
    const allowedPages = new Set(['diary', 'recipes', 'planning', 'stats', 'profile', 'settings']);
    let activePage = allowedPages.has(initialPage) ? initialPage : 'diary';
    const listeners = new Set();

    return {
      get activePage() {
        return activePage;
      },
      setPage(page) {
        if (!allowedPages.has(page)) throw new RangeError(`Unknown application page: ${page}`);
        if (activePage === page) return false;
        activePage = page;
        listeners.forEach((listener) => listener(activePage));
        return true;
      },
      subscribe(listener) {
        if (typeof listener !== 'function') throw new TypeError('State listener must be a function.');
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
      getAllowedPages() {
        return [...allowedPages];
      }
    };
  };

  root.NutriMealUI = ui;
})(globalThis);
