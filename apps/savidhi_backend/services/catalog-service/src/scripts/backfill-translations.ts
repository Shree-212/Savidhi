// One-shot backfill: translate every English text field on existing pujas,
// chadhavas, chadhava_offerings, temples, and deities into Hindi (`_hi`
// columns). Idempotent — skips rows that already have a populated
// `<field>_hi`.
//
// Run inside a catalog-service pod (so ADC + DB access work):
//
//   kubectl -n savidhi exec -it deploy/catalog-service -- \
//     node dist/scripts/backfill-translations.js
//
// Cost guard: a typical full backfill of seed data runs ~$0.001 in Cloud
// Translate spend. Re-running is safe.

import pool from '../lib/db';
import { translateToHindi, translateArrayToHindi } from '../lib/translate';

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
];

function isEmpty(v: unknown): boolean {
  if (v === null || v === undefined) return true;
  if (typeof v === 'string' && v.trim() === '') return true;
  if (Array.isArray(v) && v.length === 0) return true;
  return false;
}

async function backfillTable(spec: TableSpec): Promise<{ table: string; updated: number; skipped: number }> {
  const cols = spec.columns.flatMap((c) => [c.name, `${c.name}_hi`]).join(', ');
  const where = spec.where ? `WHERE ${spec.where}` : '';
  const rows = await pool.query(`SELECT ${spec.idCol}, ${cols} FROM ${spec.table} ${where}`);

  let updated = 0;
  let skipped = 0;

  for (const row of rows.rows) {
    const updates: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    for (const col of spec.columns) {
      const enVal = row[col.name];
      const hiVal = row[`${col.name}_hi`];
      if (isEmpty(enVal)) continue;          // nothing to translate
      if (!isEmpty(hiVal)) continue;         // already translated — skip

      const translated = col.isArray
        ? await translateArrayToHindi(enVal as string[])
        : await translateToHindi(enVal as string);

      // For arrays, store empty array (not NULL) to preserve schema default.
      if (col.isArray && (!translated || (translated as string[]).length === 0)) continue;
      if (!col.isArray && (translated === null || translated === '')) continue;

      updates.push(`${col.name}_hi = $${idx}`);
      values.push(translated);
      idx++;
    }

    if (updates.length === 0) { skipped++; continue; }
    values.push(row[spec.idCol]);
    await pool.query(`UPDATE ${spec.table} SET ${updates.join(', ')} WHERE ${spec.idCol} = $${idx}`, values);
    updated++;
    console.log(`  ${spec.table}#${String(row[spec.idCol]).slice(0, 8)}: translated ${updates.length} field(s)`);
  }

  return { table: spec.table, updated, skipped };
}

async function main() {
  console.log('Backfill translations: starting…');
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
