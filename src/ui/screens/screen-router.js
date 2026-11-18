(function registerScreenRouter(root) {
  const ui = root.NutriMealUI || {};

  ui.createScreenRouter = function createScreenRouter({
    screens,
    beforeRender,
    afterRender
  }) {
    if (!screens || typeof screens !== 'object' || Array.isArray(screens)) {
      throw new TypeError('Screen registry is required.');
    }
    if (typeof beforeRender !== 'undefined' && typeof beforeRender !== 'function') {
      throw new TypeError('beforeRender must be a function.');
    }
    if (typeof afterRender !== 'undefined' && typeof afterRender !== 'function') {
      throw new TypeError('afterRender must be a function.');
    }

    return {
      getPages() {
        return Object.keys(screens);
      },
      render(page) {
        if (!Object.prototype.hasOwnProperty.call(screens, page)) {
          throw new RangeError(`Unknown application screen: ${page}`);
        }
        if (typeof screens[page] !== 'function') {
          throw new TypeError(`Screen "${page}" must provide a render function.`);
        }
        if (beforeRender) beforeRender();
        screens[page]();
        if (afterRender) afterRender();
        return true;
      }
    };
  };

  root.NutriMealUI = ui;
})(globalThis);
