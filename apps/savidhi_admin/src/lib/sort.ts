import type { SortDir } from '@/components/shared/DataTable';
export type { SortDir };

/**
 * Sort a list of plain rows by a key in ascending or descending order. Numbers
 * are compared numerically, parseable date strings by their timestamp, and
 * everything else as case-insensitive strings. Null/undefined/empty values sink
 * to the end regardless of direction.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function sortRows<T extends Record<string, any>>(rows: T[], key: string | null, dir: SortDir): T[] {
  if (!key) return rows;
  const out = [...rows];
  out.sort((a, b) => {
    const va = a?.[key];
    const vb = b?.[key];
    const aMissing = va === null || va === undefined || va === '';
    const bMissing = vb === null || vb === undefined || vb === '';
    if (aMissing && bMissing) return 0;
    if (aMissing) return 1;
    if (bMissing) return -1;

    if (typeof va === 'number' && typeof vb === 'number') {
      return dir === 'asc' ? va - vb : vb - va;
    }
    // Try date comparison if both look like parseable dates (contain - / or :).
    const da = Date.parse(String(va));
    const db = Date.parse(String(vb));
    if (!Number.isNaN(da) && !Number.isNaN(db) && /[-/:]/.test(String(va))) {
      return dir === 'asc' ? da - db : db - da;
    }
    const sa = String(va).toLowerCase();
    const sb = String(vb).toLowerCase();
    if (sa < sb) return dir === 'asc' ? -1 : 1;
    if (sa > sb) return dir === 'asc' ? 1 : -1;
    return 0;
  });
  return out;
}

/**
 * Hook-style sort state — return value, derived rows, and a toggle handler.
 * Useful when pages don't need to share state with anything else.
 */
export interface SortState {
  sortKey: string | null;
  sortDir: SortDir;
}

export function nextSort(state: SortState, key: string): SortState {
  if (state.sortKey === key) {
    return { sortKey: key, sortDir: state.sortDir === 'asc' ? 'desc' : 'asc' };
  }
  return { sortKey: key, sortDir: 'asc' };
}
