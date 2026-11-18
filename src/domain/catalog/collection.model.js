function normalizeCollectionName(name) {
  const normalized = String(name ?? '').trim();
  if (!normalized) throw new TypeError('Collection name is required.');
  if (normalized.length > 60) throw new RangeError('Collection name cannot exceed 60 characters.');
  return normalized;
}

function normalizeItemReference(reference) {
  if (!reference || !['recipe', 'product'].includes(reference.kind) || reference.id === undefined || reference.id === null) {
    throw new TypeError('A collection item must reference a recipe or product.');
  }

  if (reference.kind === 'recipe') {
    const id = Number(reference.id);
    if (!Number.isFinite(id)) throw new TypeError('Recipe reference must have a numeric id.');
    return { kind: 'recipe', id };
  }

  return { kind: 'product', id: String(reference.id) };
}

function referenceKey(reference) {
  return `${reference.kind}:${reference.id}`;
}

export function createCollection(id, name) {
  if (id === undefined || id === null || id === '') throw new TypeError('Collection id is required.');
  return { id, name: normalizeCollectionName(name), items: [] };
}

export function renameCollection(collection, name) {
  if (!collection || !Array.isArray(collection.items)) throw new TypeError('A collection is required.');
  return { ...collection, name: normalizeCollectionName(name), items: [...collection.items] };
}

export function addCollectionItems(collection, references) {
  if (!collection || !Array.isArray(collection.items)) throw new TypeError('A collection is required.');
  if (!Array.isArray(references)) throw new TypeError('Collection item references must be an array.');

  const items = [...collection.items];
  const known = new Set(items.map(referenceKey));
  for (const reference of references) {
    const normalized = normalizeItemReference(reference);
    const key = referenceKey(normalized);
    if (!known.has(key)) {
      items.push(normalized);
      known.add(key);
    }
  }
  return { ...collection, items };
}

export function removeCollectionItem(collection, kind, id) {
  if (!collection || !Array.isArray(collection.items)) throw new TypeError('A collection is required.');
  const key = referenceKey(normalizeItemReference({ kind, id }));
  return {
    ...collection,
    items: collection.items.filter((reference) => referenceKey(reference) !== key)
  };
}

export function resolveCollectionItem(reference, recipes, products) {
  if (!reference || !['recipe', 'product'].includes(reference.kind)) return null;
  const catalog = reference.kind === 'recipe' ? recipes : products;
  return catalog.find((item) => String(item.id) === String(reference.id)) || null;
}

export function toggleFavorite(item) {
  if (!item || typeof item !== 'object') throw new TypeError('A catalog item is required.');
  return { ...item, favorite: !item.favorite };
}
