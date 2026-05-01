// Wrapper around Google Cloud Translation v2.
//
// Auth: uses Application Default Credentials (ADC). In GKE this comes from
// Workload Identity binding the pod's k8s ServiceAccount (savidhi-eso) to a
// GCP SA that holds roles/cloudtranslate.user.
//
// Behaviour: silent fallback. If the API errors (network, quota, missing
// IAM, etc.) the caller still gets back the original English text. The
// catalog routes COALESCE on `_hi` columns so a NULL/empty translation
// just shows the English value to the user — no empty cells.

import { v2 } from '@google-cloud/translate';

const HI = 'hi';
const SRC = 'en';

let _client: v2.Translate | null = null;
function client(): v2.Translate {
  if (!_client) _client = new v2.Translate();
  return _client;
}

/** Translate a single text blob to Hindi. Returns null if input is empty. */
export async function translateToHindi(text: string | null | undefined): Promise<string | null> {
  const trimmed = (text ?? '').trim();
  if (!trimmed) return null;
  try {
    const [out] = await client().translate(trimmed, { from: SRC, to: HI, format: 'text' });
    return out;
  } catch (err) {
    console.error('[translate] single failed:', (err as Error).message);
    return null;
  }
}

/**
 * Translate every non-empty entry of a string array to Hindi. Empty/null
 * entries are dropped (we don't preserve empty positions — the array is
 * a list of items, not a fixed-position tuple).
 */
export async function translateArrayToHindi(arr: string[] | null | undefined): Promise<string[]> {
  const items = (arr ?? []).map((s) => (s ?? '').trim()).filter(Boolean);
  if (!items.length) return [];
  try {
    const [out] = await client().translate(items, { from: SRC, to: HI, format: 'text' });
    return Array.isArray(out) ? out : [out];
  } catch (err) {
    console.error('[translate] array failed:', (err as Error).message);
    return [];
  }
}

/**
 * Translate many fields in parallel. Returns the same shape with translated
 * values. Pass `arrayKeys` to mark which keys are string[] vs string.
 */
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
