// PositionIQ — Browser-local storage for drafts and presets
// Pure-ish wrapper around localStorage with safe JSON + error handling.
// Two namespaces:
//   drafts  — full position configurations (reload an exact trade)
//   presets — reusable risk/money-management rule sets
//
// NOTE: data is stored per-browser, per-device. No cloud sync in v2.

const KEYS = {
  drafts: "positioniq:drafts",
  presets: "positioniq:presets",
};

function readAll(kind) {
  try {
    const raw = localStorage.getItem(KEYS[kind]);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(kind, list) {
  try {
    localStorage.setItem(KEYS[kind], JSON.stringify(list));
    return true;
  } catch {
    return false;
  }
}

/** List saved items of a kind ("drafts" | "presets"). */
export function listItems(kind) {
  if (!KEYS[kind]) return [];
  return readAll(kind);
}

/**
 * Save an item. Returns the saved item (with id + savedAt) or null on failure.
 * If an item with the same name exists, it is overwritten.
 */
export function saveItem(kind, name, data) {
  if (!KEYS[kind]) return null;
  const cleanName = (name || "").trim();
  if (!cleanName) return null;

  const list = readAll(kind);
  const item = {
    id: `${kind}_${Date.now()}`,
    name: cleanName,
    data: data || {},
    savedAt: new Date().toISOString(),
  };
  const idx = list.findIndex((x) => x.name.toLowerCase() === cleanName.toLowerCase());
  if (idx >= 0) {
    item.id = list[idx].id; // keep original id on overwrite
    list[idx] = item;
  } else {
    list.push(item);
  }
  return writeAll(kind, list) ? item : null;
}

/** Delete an item by id. Returns true if removed. */
export function deleteItem(kind, id) {
  if (!KEYS[kind]) return false;
  const list = readAll(kind);
  const next = list.filter((x) => x.id !== id);
  if (next.length === list.length) return false;
  return writeAll(kind, next);
}

/** Get a single item by id, or null. */
export function getItem(kind, id) {
  if (!KEYS[kind]) return null;
  return readAll(kind).find((x) => x.id === id) || null;
}
