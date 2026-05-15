'use client';

import { ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Column<T> {
  key: string;
  label: string;
  render?: (row: T, index: number) => React.ReactNode;
  className?: string;
  /** Disable sorting for this column. Defaults to false (sortable). */
  sortable?: false;
}

export type SortDir = 'asc' | 'desc';

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (row: T, index: number) => void;
  className?: string;
  /** Current sort key (the column's `key`). */
  sortKey?: string | null;
  /** Current sort direction. */
  sortDir?: SortDir;
  /** Fired when the user clicks a sortable header. */
  onSortChange?: (key: string) => void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  onRowClick,
  className,
  sortKey,
  sortDir = 'asc',
  onSortChange,
}: DataTableProps<T>) {
  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border">
            {columns.map((col) => {
              const canSort = onSortChange && col.sortable !== false && col.key !== 'action';
              const active = canSort && sortKey === col.key;
              return (
                <th
                  key={col.key}
                  onClick={canSort ? () => onSortChange!(col.key) : undefined}
                  className={cn(
                    'text-left py-3 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground',
                    canSort && 'cursor-pointer select-none hover:text-foreground',
                    col.className
                  )}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {canSort && (
                      active ? (
                        sortDir === 'asc'
                          ? <ChevronUp className="w-3 h-3" />
                          : <ChevronDown className="w-3 h-3" />
                      ) : (
                        <ChevronsUpDown className="w-3 h-3 opacity-40" />
                      )
                    )}
                  </span>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr
              key={i}
              onClick={() => onRowClick?.(row, i)}
              className={cn(
                'border-b border-border/50 transition-colors',
                onRowClick && 'cursor-pointer hover:bg-accent/50'
              )}
            >
              {columns.map((col) => (
                <td key={col.key} className={cn('py-2.5 px-3 text-foreground/80', col.className)}>
                  {col.render ? col.render(row, i) : String(row[col.key] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
