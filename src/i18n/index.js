// PositionIQ — i18n loader
// Central access point for translations. Swap/add languages here.
// Usage:  import { t } from "./i18n";  t("fields.entryPrice")

import en from "./en.js";

const languages = {
  en,
  // fa: () => import("./fa.js"),  // future: add more languages here
};

let current = "en";
let strings = languages[current];

/**
 * Set the active language by code (e.g. "en", "fa").
 * Falls back to English if the code is unknown.
 */
export function setLanguage(code) {
  if (languages[code]) {
    current = code;
    strings = languages[code];
  }
  return current;
}

/** Get the active language code. */
export function getLanguage() {
  return current;
}

/** List available language codes. */
export function availableLanguages() {
  return Object.keys(languages);
}

/**
 * Translate a dot-path key (e.g. "results.closingPnl").
 * Returns the key itself if not found, so missing strings are obvious.
 */
export function t(key) {
  if (!key) return "";
  const parts = key.split(".");
  let node = strings;
  for (const p of parts) {
    if (node && typeof node === "object" && p in node) node = node[p];
    else return key; // missing → show the key so it's caught in testing
  }
  return typeof node === "string" ? node : key;
}
