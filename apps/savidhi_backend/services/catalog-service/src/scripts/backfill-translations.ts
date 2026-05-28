// One-shot backfill: for every translatable catalog table, populate the
// `_en` and `_hi` sibling columns. Detects the source language of the
// canonical column and translates to the other side. Idempotent — skips
// rows that already have both siblings populated.
//
// Run inside a catalog-service pod (so ADC + DB access work):
//
//   kubectl -n savidhi exec -it deploy/catalog-service -- \
//     node dist/src/scripts/backfill-translations.js
//
// Cost guard: a typical full backfill of seed data runs ~$0.002 in Cloud
// Translate spend (both directions). Re-running is safe.

import pool from '../lib/db';
import { translateScalarBoth, translateArrayBoth } from '../lib/translate';

interface ColumnSpec {
  name: string;
  isArray?: boolean;
}

interface TableSpec {
  table: string;
  idCol: string;
  columns: ColumnSpec[];
  where?: string;
}

const TABLES: TableSpec[] = [
  {
    table: 'pujas',
    idCol: 'id',
    where: 'is_active = true',
    columns: [
      { name: 'name' },
      { name: 'description' },
      { name: 'benefits' },
      { name: 'rituals_included' },
      { name: 'shlok' },
      { name: 'items_used', isArray: true },
      { name: 'how_will_it_happen', isArray: true },
    ],
  },
  {
    table: 'chadhavas',
    idCol: 'id',
    where: 'is_active = true',
    columns: [
      { name: 'name' },
      { name: 'description' },
      { name: 'benefits' },
      { name: 'rituals_included' },
      { name: 'shlok' },
      { name: 'items_used', isArray: true },
      { name: 'how_will_it_happen', isArray: true },
    ],
  },
  {
    table: 'chadhava_offerings',
    idCol: 'id',
    columns: [
      { name: 'item_name' },
      { name: 'benefit' },
    ],
  },
  {
    table: 'temples',
    idCol: 'id',
    columns: [
      { name: 'name' },
      { name: 'address' },
      { name: 'about' },
      { name: 'history_and_significance' },
    ],
  },
  {
    table: 'deities',
    idCol: 'id',
    columns: [
      { name: 'name' },
    ],
  },
  {
    table: 'pujaris',
    idCol: 'id',
    where: 'is_active = true',
    columns: [
      { name: 'name' },
      { name: 'designation' },
    ],
  },
  {
    table: 'astrologers',
    idCol: 'id',
    where: 'is_active = true',
    columns: [
      { name: 'name' },
      { name: 'designation' },
      { name: 'expertise' },
      { name: 'about' },
    ],
  },
  {
    table: 'hampers',
    idCol: 'id',
    columns: [
      { name: 'name' },
      { name: 'content_description' },
    ],
  },
];

function isEmptyScalar(v: unknown): boolean {
  if (v === null || v === undefined) return true;
  if (typeof v === 'string' && v.trim() === '') return true;
  return false;
}

function isEmptyArray(v: unknown): boolean {
  if (v === null || v === undefined) return true;
  if (Array.isArray(v) && v.length === 0) return true;
  return false;
}

async function backfillTable(spec: TableSpec): Promise<{ table: string; updated: number; skipped: number }> {
  const selectCols = [spec.idCol, ...spec.columns.flatMap((c) => [c.name, `${c.name}_en`, `${c.name}_hi`])].join(', ');
  const where = spec.where ? `WHERE ${spec.where}` : '';
  const rows = await pool.query(`SELECT ${selectCols} FROM ${spec.table} ${where}`);

  let updated = 0;
  let skipped = 0;

  for (const row of rows.rows) {
    const updates: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    for (const col of spec.columns) {
      const canonical = row[col.name];
      const enVal = row[`${col.name}_en`];
      const hiVal = row[`${col.name}_hi`];

      const isEmptyFn = col.isArray ? isEmptyArray : isEmptyScalar;
      if (isEmptyFn(canonical)) continue;          // nothing to translate
      if (!isEmptyFn(enVal) && !isEmptyFn(hiVal)) continue; // both already filled

      const result = col.isArray
        ? await translateArrayBoth(canonical as string[])
        : await translateScalarBoth(canonical as string);

      if (!result) continue;
      if (col.isArray) {
        const r = result as { en: string[]; hi: string[] };
        if (isEmptyFn(enVal) && r.en.length > 0) {
          updates.push(`${col.name}_en = $${idx}`); values.push(r.en); idx++;
        }
        if (isEmptyFn(hiVal) && r.hi.length > 0) {
          updates.push(`${col.name}_hi = $${idx}`); values.push(r.hi); idx++;
        }
      } else {
        const r = result as { en: string | null; hi: string | null };
        if (isEmptyFn(enVal) && r.en) {
          updates.push(`${col.name}_en = $${idx}`); values.push(r.en); idx++;
        }
        if (isEmptyFn(hiVal) && r.hi) {
          updates.push(`${col.name}_hi = $${idx}`); values.push(r.hi); idx++;
        }
      }
    }

    if (updates.length === 0) { skipped++; continue; }
    values.push(row[spec.idCol]);
    await pool.query(`UPDATE ${spec.table} SET ${updates.join(', ')} WHERE ${spec.idCol} = $${idx}`, values);
    updated++;
    console.log(`  ${spec.table}#${String(row[spec.idCol]).slice(0, 8)}: filled ${updates.length} sibling(s)`);
  }

  return { table: spec.table, updated, skipped };
}

async function main() {
  console.log('Backfill translations (bidirectional): starting…');
  const results: Awaited<ReturnType<typeof backfillTable>>[] = [];
  for (const spec of TABLES) {
    console.log(`\n>> ${spec.table}`);
    const r = await backfillTable(spec);
    results.push(r);
  }
  console.log('\n=== Summary ===');
  for (const r of results) {
    console.log(`  ${r.table.padEnd(20)} updated=${r.updated} skipped=${r.skipped}`);
  }
  await pool.end();
  console.log('\nDone.');
}

main().catch((e) => {
  console.error('Backfill failed:', e);
  process.exit(1);
});
