// Feature: urbanfit-jobs-frontend
// Pure i18n string resolution (Req 1.9 / Property 17).
//
// resolveText resolves a translation key against a Thai-first string table.
// The resolved value is ALWAYS a non-empty string and NEVER the raw key:
//   1. If table[key].th has non-whitespace content -> return table[key].th.
//   2. Else if table[key].default is non-empty        -> return table[key].default.
//   3. Otherwise (key absent, or both th and default blank) -> DEFAULT_FALLBACK_TEXT.

import type { I18nTable } from "./types";
import { DEFAULT_FALLBACK_TEXT } from "../i18n/strings";

/**
 * Resolve a UI string for `key` from `table` following the Thai-first
 * fallback contract (Property 17 / Req 1.9).
 *
 * @param key   The translation key to resolve.
 * @param table The Thai-first string table.
 * @returns A non-empty string; never the raw key.
 */
export function resolveText(key: string, table: I18nTable): string {
  const entry = table[key];

  if (entry === undefined) {
    if (import.meta.env?.DEV) {
      // eslint-disable-next-line no-console
      console.warn(`[i18n] Missing key: "${key}"`);
    }
    return DEFAULT_FALLBACK_TEXT;
  }

  if (entry.th.trim().length > 0) {
    return entry.th;
  }

  if (entry.default.length > 0) {
    return entry.default;
  }

  return DEFAULT_FALLBACK_TEXT;
}
