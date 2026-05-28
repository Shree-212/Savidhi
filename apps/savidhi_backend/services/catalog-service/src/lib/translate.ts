// Wrapper around Google Cloud Translation v2 (en→hi) + a hand-rolled
// Devanagari → Hinglish transliterator (hi→roman) for the reverse direction.
//
// Auth: uses Application Default Credentials (ADC). In GKE this comes from
// Workload Identity binding the pod's k8s ServiceAccount (savidhi-eso) to a
// GCP SA that holds roles/cloudtranslate.user.
//
// Bidirectional (v28+): the catalog admin may type either English OR Hindi
// into the canonical column. On write we detect the source language and
// populate BOTH `_en` and `_hi` siblings so the web client can render the
// right one regardless of which way the admin typed.
//
// Direction-specific behavior (v29+, the user's actual ask):
//   - canonical is English (Latin script)
//       _en := canonical
//       _hi := Google Translate en→hi  ("Maa Durga Puja" → "माँ दुर्गा पूजा")
//   - canonical is Hindi (Devanagari)
//       _hi := canonical
//       _en := PHONETIC TRANSLITERATION (NOT a meaning translation)
//              "सुखमय दाम्पत्य जीवन प्राप्ति पूजा"
//                → "Sukhmay Dampatya Jeevan Prapti Pooja"
//              Proper nouns / ritual names lose meaning when literally
//              translated, so Hinglish is the right read-aloud form.
//
// Silent fallback throughout: if Google's API errors, we still return the
// canonical so applyLocale's COALESCE shows that to the user — never blanks.

import { v2 } from '@google-cloud/translate';
import { transliterateDevanagariToHinglish, hasDevanagari } from './transliterate';

export type Locale = 'en' | 'hi';

let _client: v2.Translate | null = null;
function client(): v2.Translate {
  if (!_client) _client = new v2.Translate();
  return _client;
}

/**
 * Returns 'hi' if the text contains any Devanagari character, else 'en'.
 * Cheap heuristic that avoids a Cloud Translation `detect` round-trip for
 * the common case (puja names are either pure English or pure Devanagari).
 */
export function detectLocale(text: string | null | undefined): Locale {
  if (!text) return 'en';
  return hasDevanagari(text) ? 'hi' : 'en';
}

async function googleTranslateEnToHi(text: string): Promise<string | null> {
  const trimmed = text.trim();
  if (!trimmed) return null;
  try {
    const [out] = await client().translate(trimmed, { from: 'en', to: 'hi', format: 'text' });
    return out;
  } catch (err) {
    console.error('[translate] en→hi failed:', (err as Error).message);
    return null;
  }
}

async function googleTranslateArrayEnToHi(arr: string[]): Promise<string[]> {
  const items = arr.map((s) => (s ?? '').trim()).filter(Boolean);
  if (!items.length) return [];
  try {
    const [out] = await client().translate(items, { from: 'en', to: 'hi', format: 'text' });
    return Array.isArray(out) ? out : [out];
  } catch (err) {
    console.error('[translate] array en→hi failed:', (err as Error).message);
    return [];
  }
}

/**
 * For a single canonical scalar value, returns the pair { en, hi }:
 *   - English canonical → en = canonical, hi = en-to-hi translation
 *   - Hindi canonical   → hi = canonical, en = Hinglish transliteration
 * Returns null for an empty input.
 */
export async function translateScalarBoth(
  text: string | null | undefined,
): Promise<{ en: string | null; hi: string | null } | null> {
  const trimmed = (text ?? '').trim();
  if (!trimmed) return null;
  const source = detectLocale(trimmed);
  if (source === 'en') {
    const hi = await googleTranslateEnToHi(trimmed);
    return { en: trimmed, hi };
  } else {
    // Hindi canonical → produce Hinglish for the En locale (no Google call needed).
    const en = transliterateDevanagariToHinglish(trimmed);
    return { en, hi: trimmed };
  }
}

/**
 * Array variant. Detects source from the first non-empty element; mixed-
 * language arrays use that element's language as the source for the whole list.
 */
export async function translateArrayBoth(
  arr: string[] | null | undefined,
): Promise<{ en: string[]; hi: string[] }> {
  const items = (arr ?? []).map((s) => (s ?? '').trim()).filter(Boolean);
  if (!items.length) return { en: [], hi: [] };
  const source = detectLocale(items[0]);
  if (source === 'en') {
    const hi = await googleTranslateArrayEnToHi(items);
    return { en: items, hi };
  } else {
    const en = items
      .map((s) => transliterateDevanagariToHinglish(s) ?? s)
      .filter(Boolean);
    return { en, hi: items };
  }
}

// ─── Legacy helpers kept for back-compat ────────────────────────────────────
// Older callers used these single-direction helpers (assumed canonical was
// English). They still work and are now thin wrappers — but new code should
// prefer translateScalarBoth / translateArrayBoth so both siblings are filled.

/** @deprecated use translateScalarBoth */
export async function translateToHindi(text: string | null | undefined): Promise<string | null> {
  const trimmed = (text ?? '').trim();
  if (!trimmed) return null;
  if (detectLocale(trimmed) === 'hi') return trimmed; // already Hindi
  return googleTranslateEnToHi(trimmed);
}

/** @deprecated use translateArrayBoth */
export async function translateArrayToHindi(arr: string[] | null | undefined): Promise<string[]> {
  const items = (arr ?? []).map((s) => (s ?? '').trim()).filter(Boolean);
  if (!items.length) return [];
  if (detectLocale(items[0]) === 'hi') return items;
  return googleTranslateArrayEnToHi(items);
}

/** @deprecated use translateScalarBoth / translateArrayBoth */
export async function translateFields<T extends Record<string, unknown>>(
  fields: T,
  arrayKeys: ReadonlyArray<keyof T> = [],
): Promise<{ [K in keyof T]: T[K] extends string[] ? string[] : string | null }> {
  const result: Record<string, unknown> = {};
  await Promise.all(
    Object.entries(fields).map(async ([k, v]) => {
      if (arrayKeys.includes(k as keyof T)) {
        result[k] = await translateArrayToHindi(v as string[] | null | undefined);
      } else {
        result[k] = await translateToHindi(v as string | null | undefined);
      }
    }),
  );
  return result as { [K in keyof T]: T[K] extends string[] ? string[] : string | null };
}
