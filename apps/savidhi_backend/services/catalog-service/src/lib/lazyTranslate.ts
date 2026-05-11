// Lazy back-fill of `_hi` columns on read.
//
// Migration 013 added `_hi` columns to pujas/chadhavas, but it did NOT
// back-fill them — only POST/PATCH (`translateAndUpdatePuja|Chadhava`) auto-
// translates. Existing seed rows therefore still serve English to Hindi
// readers (the COALESCE in `applyLocale` falls back to the English value).
//
// Strategy: every GET fires-and-forgets a translation for any row that has
// English content but a NULL `_hi`. The endpoint returns immediately with
// whatever's currently in the row; the next read of the same row gets the
// Hindi value. Idempotent — concurrent backfills update with
// `COALESCE(field_hi, $N)`, so the second writer is a no-op.

import pool from './db';
import { translateToHindi, translateArrayToHindi } from './translate';

type BackfillTable = 'pujas' | 'chadhavas';

interface BackfillFieldConfig {
  scalars: readonly string[];
  arrays: readonly string[];
}

// Per-replica de-dupe: a row id with an in-flight backfill is skipped on
// subsequent reads until the translation completes. Cross-replica idempotency
// is handled by the COALESCE in the UPDATE itself.
const inflight = new Set<string>();

// Bounded concurrency so a single list request that returns 50 rows missing
// `_hi` doesn't stampede the Translation API.
const MAX_CONCURRENCY = 6;
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
 * Inspect `rows` and asynchronously back-fill any missing `_hi` values.
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
      const en = row[f];
      const hi = row[`${f}_hi`];
      if (typeof en === 'string' && en.trim() !== '' && isEmpty(hi)) {
        scalarsNeeded.push(f);
      }
    }
    for (const f of config.arrays) {
      const en = row[f];
      const hi = row[`${f}_hi`];
      if (Array.isArray(en) && en.length > 0 && isEmptyArray(hi)) {
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
  englishRow: Record<string, unknown>,
): Promise<void> {
  const updates: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (scalarsNeeded.length > 0) {
    const scalarResults = await Promise.all(
      scalarsNeeded.map((f) => translateToHindi(englishRow[f] as string)),
    );
    scalarsNeeded.forEach((f, i) => {
      if (scalarResults[i]) {
        updates.push(`${f}_hi = COALESCE(NULLIF(${f}_hi, ''), $${idx})`);
        values.push(scalarResults[i]);
        idx++;
      }
    });
  }

  if (arraysNeeded.length > 0) {
    const arrayResults = await Promise.all(
      arraysNeeded.map((f) => translateArrayToHindi(englishRow[f] as string[])),
    );
    arraysNeeded.forEach((f, i) => {
      if (arrayResults[i].length > 0) {
        updates.push(`${f}_hi = CASE WHEN ${f}_hi IS NULL OR array_length(${f}_hi, 1) IS NULL THEN $${idx} ELSE ${f}_hi END`);
        values.push(arrayResults[i]);
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
