// Helper for locale-aware response shaping.
//
// When a request comes in with `?locale=hi`, GET routes use these helpers to
// swap English fields with their `<field>_hi` siblings. The shape of the JSON
// payload doesn't change — `name` is still `name`, just translated. The `_hi`
// columns are stripped from the response so clients never see them.
//
// COALESCE-style fallback: an empty/null `_hi` value falls back to the
// English value, so untranslated rows still render rather than going blank.

type Row = Record<string, unknown>;

export type SupportedLocale = 'en' | 'hi';

export function parseLocale(raw: unknown): SupportedLocale {
  return raw === 'hi' ? 'hi' : 'en';
}

/** Strip _hi sibling keys from the response (clients only need the active one). */
function stripHiKeys(row: Row): Row {
  const out: Row = {};
  for (const [k, v] of Object.entries(row)) {
    if (!k.endsWith('_hi')) out[k] = v;
  }
  return out;
}

/**
 * Apply a translatable locale to a single row.
 * - For each `field` in `fields`, if the row has both `field` and `field_hi`
 *   and locale === 'hi', overwrite `field` with `field_hi` (when non-empty).
 * - Always strip `_hi` keys from the output.
 */
export function applyLocale(row: Row | null | undefined, locale: SupportedLocale, fields: string[]): Row | null {
  if (!row) return null;
  if (locale !== 'hi') return stripHiKeys(row);

  const out: Row = { ...row };
  for (const f of fields) {
    const hiKey = `${f}_hi`;
    const hiVal = row[hiKey];
    if (hiVal === undefined) continue;
    if (Array.isArray(hiVal)) {
      // Array fields: use Hindi array when non-empty, otherwise keep English.
      if (hiVal.length > 0) out[f] = hiVal;
    } else if (typeof hiVal === 'string') {
      // Scalar: use Hindi when non-empty/non-null.
      if (hiVal.trim() !== '') out[f] = hiVal;
    }
  }
  return stripHiKeys(out);
}

/** Map applyLocale across an array of rows. */
export function applyLocaleArray(rows: Row[] | null | undefined, locale: SupportedLocale, fields: string[]): Row[] {
  if (!rows) return [];
  return rows.map((r) => applyLocale(r, locale, fields) as Row);
}
