/**
 * Applies translations reversibly to the current DOM tree. Original strings
 * are held in WeakMaps and restored before a subsequent locale pass.
 */
export function createLocaleApplier({ translateText, documentRef = globalThis.document }) {
  const originalText = new WeakMap();
  const originalAttributes = new WeakMap();
  const translatedAttributes = ['title', 'aria-label', 'placeholder'];

  function restore(root) {
    const walker = documentRef.createTreeWalker(root, 4 /* SHOW_TEXT */);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (originalText.has(node)) node.nodeValue = originalText.get(node);
    }
    root.querySelectorAll?.('[title],[aria-label],[placeholder]').forEach(element => {
      const originals = originalAttributes.get(element);
      if (!originals) return;
      for (const [name, value] of Object.entries(originals)) {
        if (value === null) element.removeAttribute(name);
        else element.setAttribute(name, value);
      }
    });
  }

  function apply(locale, root = documentRef.body) {
    if (!root) return;
    restore(root);
    if (locale === 'ru') {
      documentRef.documentElement.lang = 'ru';
      return;
    }

    const walker = documentRef.createTreeWalker(root, 4 /* SHOW_TEXT */);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const node of nodes) {
      const source = node.nodeValue;
      if (!source || !/[А-Яа-яЁё]/.test(source)) continue;
      if (!originalText.has(node)) originalText.set(node, source);
      const trimmed = source.trim();
      if (!trimmed) continue;
      const translated = translateText(trimmed);
      if (translated !== trimmed) node.nodeValue = source.replace(trimmed, translated);
    }

    root.querySelectorAll?.('[title],[aria-label],[placeholder]').forEach(element => {
      if (!originalAttributes.has(element)) {
        const snapshot = {};
        for (const name of translatedAttributes) {
          snapshot[name] = element.hasAttribute(name) ? element.getAttribute(name) : null;
        }
        originalAttributes.set(element, snapshot);
      }
      for (const name of translatedAttributes) {
        if (!element.hasAttribute(name)) continue;
        const source = element.getAttribute(name);
        if (source && /[А-Яа-яЁё]/.test(source)) element.setAttribute(name, translateText(source));
      }
    });
    documentRef.documentElement.lang = locale;
  }

  return { apply, restore };
}
