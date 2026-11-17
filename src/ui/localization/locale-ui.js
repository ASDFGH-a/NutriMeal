/** Apply a resolved locale at the UI boundary; dependencies are injected. */
export function applyLocaleToDocument(locale, { document, rerender } = {}) {
  if (!document?.documentElement) {
    throw new TypeError('applyLocaleToDocument requires a document with documentElement');
  }
  if (typeof rerender !== 'function') {
    throw new TypeError('applyLocaleToDocument requires a rerender function');
  }

  document.documentElement.lang = locale;
  rerender();
  return locale;
}
