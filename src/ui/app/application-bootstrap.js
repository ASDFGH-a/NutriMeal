(function registerApplicationBootstrap(root) {
  const ui = root.NutriMealUI || {};

  ui.bootstrapApplication = function bootstrapApplication({
    document,
    initialPage = 'diary',
    title,
    subtitle
  } = {}) {
    if (!document || !document.getElementById) {
      throw new TypeError('Application document is required.');
    }
    if (typeof ui.renderAppShell !== 'function'
      || typeof ui.renderOverlayHost !== 'function'
      || typeof ui.createAppState !== 'function') {
      throw new TypeError('Application UI components are not loaded.');
    }

    const appShell = document.getElementById('app-shell');
    const overlayHost = document.getElementById('overlay-host');
    if (!appShell || !overlayHost) {
      throw new TypeError('Application mount points are required.');
    }

    appShell.innerHTML = ui.renderAppShell({ activePage: initialPage, title, subtitle });
    overlayHost.innerHTML = ui.renderOverlayHost();
    const state = ui.createAppState(initialPage);

    return {
      state,
      shellElement: appShell,
      overlayElement: overlayHost,
      navigate(page, onNavigate) {
        const changed = state.setPage(page);
        if (typeof onNavigate === 'function') onNavigate(page);
        return changed;
      }
    };
  };

  root.NutriMealUI = ui;
})(globalThis);
