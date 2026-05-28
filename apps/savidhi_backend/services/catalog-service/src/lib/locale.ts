// Helper for locale-aware response shaping.
//
// When a request comes in with `?locale=en|hi`, GET routes use these helpers
// to swap each translatable field with its `<field>_<locale>` sibling.
// The shape of the JSON payload doesn't change — `name` is still `name`,
// just in the user's language. The `_en` and `_hi` sibling keys are stripped
// from the response so clients never see them.
//
// Fallback chain (v28+, bidirectional):
//   <field>_<locale>   — preferred (auto-translated or canonical match)
//   <field>            — canonical (whatever language admin originally typed)
// Empty/null sibling falls through to the canonical so untranslated rows
// still render rather than going blank.

type Row = Record<string, unknown>;

export type SupportedLocale = 'en' | 'hi';

export function parseLocale(raw: unknown): SupportedLocale {
  return raw === 'hi' ? 'hi' : 'en';
}

/** Strip all locale-sibling keys (`_en`, `_hi`) from the response. */
function stripLocaleKeys(row: Row): Row {
  const out: Row = {};
  for (const [k, v] of Object.entries(row)) {
    if (!k.endsWith('_hi') && !k.endsWith('_en')) out[k] = v;
  }
  return out;
}

function isNonEmpty(v: unknown): boolean {
  if (v === null || v === undefined) return false;
  if (typeof v === 'string') return v.trim() !== '';
  if (Array.isArray(v)) return v.length > 0;
  return false;
}

/**
 * Apply the active locale to a single row.
 * - For each `field`, prefer `field_<locale>` when non-empty.
 * - Always strip `_en` and `_hi` siblings from the output.
 *
 * Works regardless of whether the canonical column holds English or Hindi —
 * the sibling for the requested locale is the source of truth.
 */
export function applyLocale(row: Row | null | undefined, locale: SupportedLocale, fields: string[]): Row | null {
  if (!row) return null;
  const out: Row = { ...row };
  const siblingSuffix = `_${locale}`;
  for (const f of fields) {
    const siblingVal = row[`${f}${siblingSuffix}`];
    if (isNonEmpty(siblingVal)) out[f] = siblingVal;
  }
  return stripLocaleKeys(out);
}

/** Map applyLocale across an array of rows. */
export function applyLocaleArray(rows: Row[] | null | undefined, locale: SupportedLocale, fields: string[]): Row[] {
  if (!rows) return [];
  return rows.map((r) => applyLocale(r, locale, fields) as Row);
}
