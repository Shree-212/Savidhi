// Lazy back-fill of `_en` / `_hi` columns on read.
//
// Migrations 013 + 027 added `_hi` and `_en` sibling columns to translatable
// catalog tables, but they did NOT back-fill them — only POST/PATCH and the
// one-shot backfill script auto-translate. Existing seed rows therefore still
// serve the canonical English/Hindi to the other-locale readers.
//
// Strategy: every GET fires-and-forgets a translation for any row that has a
// canonical value but a NULL/empty sibling for either locale. The endpoint
// returns immediately with whatever's currently in the row; the next read of
// the same row gets the right sibling. Idempotent — concurrent backfills
// update with `COALESCE(field_<loc>, $N)`, so the second writer is a no-op.

import pool from './db';
import {
  detectLocale,
  translateScalarBoth,
  translateArrayBoth,
} from './translate';

type BackfillTable = 'pujas' | 'chadhavas' | 'temples' | 'pujaris' | 'astrologers' | 'hampers' | 'deities' | 'chadhava_offerings';

interface BackfillFieldConfig {
  scalars: readonly string[];
  arrays: readonly string[];
}

// Per-replica de-dupe: a row id with an in-flight backfill is skipped on
// subsequent reads until the translation completes. Cross-replica idempotency
// is handled by the COALESCE in the UPDATE itself.
const inflight = new Set<string>();

// Bounded concurrency so a single list request that returns 50 rows missing
// siblings doesn't stampede the Translation API. Google Cloud Translation
// quota is 600k characters / 100 sec; we're nowhere near that even at 16.
const MAX_CONCURRENCY = 16;
let active = 0;
const waiters: Array<() => void> = [];

function acquire(): Promise<void> {
  if (active < MAX_CONCURRENCY) {
    active++;
    return Promise.resolve();
  }
  return new Promise((resolve) => waiters.push(() => { active++; resolve(); }));
}

function release(): void {
  active--;
  const next = waiters.shift();
  if (next) next();
}

/**
 * Inspect `rows` and asynchronously back-fill any missing `_en`/`_hi` values.
 * Returns immediately; the actual translation + UPDATE happens in background.
 */
export function scheduleBackfill(
  table: BackfillTable,
  rows: Array<Record<string, unknown>>,
  config: BackfillFieldConfig,
): void {
  for (const row of rows) {
    const id = row?.id as string | undefined;
    if (!id) continue;
    const key = `${table}:${id}`;
    if (inflight.has(key)) continue;

    const scalarsNeeded: string[] = [];
    const arraysNeeded: string[] = [];

    for (const f of config.scalars) {
      const canonical = row[f];
      const en = row[`${f}_en`];
      const hi = row[`${f}_hi`];
      if (typeof canonical === 'string' && canonical.trim() !== '' && (isEmpty(en) || isEmpty(hi))) {
        scalarsNeeded.push(f);
      }
    }
    for (const f of config.arrays) {
      const canonical = row[f];
      const en = row[`${f}_en`];
      const hi = row[`${f}_hi`];
      if (Array.isArray(canonical) && canonical.length > 0 && (isEmptyArray(en) || isEmptyArray(hi))) {
        arraysNeeded.push(f);
      }
    }

    if (scalarsNeeded.length === 0 && arraysNeeded.length === 0) continue;

    inflight.add(key);
    void (async () => {
      try {
        await acquire();
        await translateRowAndUpdate(table, id, scalarsNeeded, arraysNeeded, row);
      } catch (err) {
        console.error(`[lazyTranslate] backfill failed for ${key}:`, (err as Error).message);
      } finally {
        release();
        inflight.delete(key);
      }
    })();
  }
}

function isEmpty(v: unknown): boolean {
  return v == null || (typeof v === 'string' && v.trim() === '');
}

function isEmptyArray(v: unknown): boolean {
  return v == null || (Array.isArray(v) && v.length === 0);
}

async function translateRowAndUpdate(
  table: BackfillTable,
  rowId: string,
  scalarsNeeded: string[],
  arraysNeeded: string[],
  row: Record<string, unknown>,
): Promise<void> {
  const updates: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (scalarsNeeded.length > 0) {
    const results = await Promise.all(
      scalarsNeeded.map((f) => translateScalarBoth(row[f] as string)),
    );
    scalarsNeeded.forEach((f, i) => {
      const r = results[i];
      if (!r) return;
      if (r.en) {
        updates.push(`${f}_en = COALESCE(NULLIF(${f}_en, ''), $${idx})`);
        values.push(r.en);
        idx++;
      }
      if (r.hi) {
        updates.push(`${f}_hi = COALESCE(NULLIF(${f}_hi, ''), $${idx})`);
        values.push(r.hi);
        idx++;
      }
    });
  }

  if (arraysNeeded.length > 0) {
    const results = await Promise.all(
      arraysNeeded.map((f) => translateArrayBoth(row[f] as string[])),
    );
    arraysNeeded.forEach((f, i) => {
      const r = results[i];
      if (r.en.length > 0) {
        updates.push(`${f}_en = CASE WHEN ${f}_en IS NULL OR array_length(${f}_en, 1) IS NULL THEN $${idx} ELSE ${f}_en END`);
        values.push(r.en);
        idx++;
      }
      if (r.hi.length > 0) {
        updates.push(`${f}_hi = CASE WHEN ${f}_hi IS NULL OR array_length(${f}_hi, 1) IS NULL THEN $${idx} ELSE ${f}_hi END`);
        values.push(r.hi);
        idx++;
      }
    });
  }

  if (updates.length === 0) return;
  values.push(rowId);
  await pool.query(
    `UPDATE ${table} SET ${updates.join(', ')} WHERE id = $${idx}`,
    values,
  );
}

/**
 * Synchronous "fill both siblings" used by route POST/PATCH handlers — runs
 * detectLocale + translateScalarBoth on each touched field and writes
 * `${field}_en` and `${field}_hi` in one UPDATE. Failures are swallowed so a
 * Translation API blip doesn't roll back the user's write.
 */
export async function writeBothSiblings(
  table: BackfillTable,
  id: string,
  body: Record<string, unknown>,
  config: BackfillFieldConfig,
): Promise<void> {
  const updates: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  for (const f of config.scalars) {
    if (body[f] === undefined) continue;
    const r = await translateScalarBoth(body[f] as string | null);
    if (!r) continue;
    updates.push(`${f}_en = $${idx}`);
    values.push(r.en);
    idx++;
    updates.push(`${f}_hi = $${idx}`);
    values.push(r.hi);
    idx++;
  }
  for (const f of config.arrays) {
    if (body[f] === undefined) continue;
    const r = await translateArrayBoth(body[f] as string[] | null);
    updates.push(`${f}_en = $${idx}`);
    values.push(r.en);
    idx++;
    updates.push(`${f}_hi = $${idx}`);
    values.push(r.hi);
    idx++;
  }

  if (updates.length === 0) return;
  values.push(id);
  await pool.query(`UPDATE ${table} SET ${updates.join(', ')} WHERE id = $${idx}`, values);
}

// Re-export for callers that previously imported from this file.
export { detectLocale };
