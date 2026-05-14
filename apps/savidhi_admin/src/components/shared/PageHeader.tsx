'use client';

import { useEffect, useRef, useState } from 'react';
import { Plus, Calendar, ChevronLeft, ChevronRight, SlidersHorizontal, Download } from 'lucide-react';
import { SearchBar } from './SearchBar';
import { TabToggle } from './TabToggle';

interface PageHeaderProps {
  tabs?: string[];
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  search?: string;
  onSearchChange?: (value: string) => void;
  onAdd?: () => void;
  showDateNav?: boolean;
  showFilters?: boolean;
  showExport?: boolean;
  dropdownLabel?: string;
  onDropdownChange?: (value: string) => void;
  dropdownOptions?: string[];

  // Date-range nav: from/to are ISO yyyy-mm-dd strings or empty for "all".
  fromDate?: string;
  toDate?: string;
  onDateChange?: (range: { from: string; to: string }) => void;

  // Filter chips: opaque k/v pairs the parent interprets.
  filters?: { key: string; label: string; options: { value: string; label: string }[] }[];
  filterValues?: Record<string, string>;
  onFilterChange?: (key: string, value: string) => void;

  // Export the whole report (top-right download icon).
  onExport?: () => void;
}

function todayIso() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

function shiftIso(iso: string, days: number) {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function PageHeader({
  tabs,
  activeTab,
  onTabChange,
  search,
  onSearchChange,
  onAdd,
  showDateNav,
  showFilters,
  showExport,
  dropdownLabel,
  dropdownOptions,
  onDropdownChange,
  fromDate,
  toDate,
  onDateChange,
  filters,
  filterValues,
  onFilterChange,
  onExport,
}: PageHeaderProps) {
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const dateBoxRef = useRef<HTMLDivElement>(null);
  const filterBoxRef = useRef<HTMLDivElement>(null);

  // Close on outside click.
  useEffect(() => {
    if (!datePickerOpen && !filterOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (datePickerOpen && dateBoxRef.current && !dateBoxRef.current.contains(e.target as Node)) {
        setDatePickerOpen(false);
      }
      if (filterOpen && filterBoxRef.current && !filterBoxRef.current.contains(e.target as Node)) {
        setFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [datePickerOpen, filterOpen]);

  const effectiveFrom = fromDate ?? '';
  const effectiveTo = toDate ?? '';

  const dateLabel = (() => {
    if (!effectiveFrom && !effectiveTo) return 'All time';
    if (effectiveFrom && effectiveFrom === effectiveTo) {
      return effectiveFrom === todayIso() ? 'Today' : effectiveFrom;
    }
    return `${effectiveFrom || '…'} → ${effectiveTo || '…'}`;
  })();

  const shiftRange = (days: number) => {
    if (!onDateChange) return;
    const from = effectiveFrom ? shiftIso(effectiveFrom, days) : '';
    const to   = effectiveTo   ? shiftIso(effectiveTo,   days) : '';
    onDateChange({ from, to });
  };

  return (
    <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
      <div className="flex items-center gap-3">
        {tabs && activeTab && onTabChange && (
          <TabToggle tabs={tabs} active={activeTab} onChange={onTabChange} />
        )}
        {dropdownLabel && dropdownOptions && (
          <select
            className="h-8 bg-accent border border-border rounded-md px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            value={dropdownLabel}
            onChange={(e) => onDropdownChange?.(e.target.value)}
          >
            {dropdownOptions.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        )}
      </div>

      <div className="flex items-center gap-2">
        {search !== undefined && onSearchChange && (
          <SearchBar value={search} onChange={onSearchChange} />
        )}
        {showFilters && filters && filters.length > 0 && (
          <div ref={filterBoxRef} className="relative">
            <button
              onClick={() => setFilterOpen((v) => !v)}
              className="h-8 px-3 bg-accent border border-border rounded-md text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5"
            >
              <SlidersHorizontal size={13} />
              Filters
            </button>
            {filterOpen && (
              <div className="absolute right-0 top-9 z-20 w-64 bg-background border border-border rounded-md p-3 shadow-lg space-y-3">
                {filters.map((f) => (
                  <div key={f.key}>
                    <label className="block text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{f.label}</label>
                    <select
                      value={filterValues?.[f.key] ?? ''}
                      onChange={(e) => onFilterChange?.(f.key, e.target.value)}
                      className="w-full h-8 bg-accent border border-border rounded-md px-2 text-xs text-foreground"
                    >
                      <option value="">All</option>
                      {f.options.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {showDateNav && onDateChange && (
          <div ref={dateBoxRef} className="relative flex items-center gap-1">
            <button onClick={() => shiftRange(-1)} className="h-8 w-8 bg-accent border border-border rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground">
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={() => setDatePickerOpen((v) => !v)}
              className="h-8 px-3 bg-accent border border-border rounded-md flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <Calendar size={13} />
              {dateLabel}
            </button>
            <button onClick={() => shiftRange(1)} className="h-8 w-8 bg-accent border border-border rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground">
              <ChevronRight size={14} />
            </button>
            {datePickerOpen && (
              <div className="absolute right-0 top-9 z-20 w-72 bg-background border border-border rounded-md p-3 shadow-lg space-y-2">
                <div>
                  <label className="block text-[10px] text-muted-foreground uppercase tracking-wider mb-1">From</label>
                  <input
                    type="date"
                    value={effectiveFrom}
                    onChange={(e) => onDateChange({ from: e.target.value, to: effectiveTo })}
                    className="w-full h-8 bg-accent border border-border rounded-md px-2 text-xs text-foreground"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-muted-foreground uppercase tracking-wider mb-1">To</label>
                  <input
                    type="date"
                    value={effectiveTo}
                    onChange={(e) => onDateChange({ from: effectiveFrom, to: e.target.value })}
                    className="w-full h-8 bg-accent border border-border rounded-md px-2 text-xs text-foreground"
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => onDateChange({ from: todayIso(), to: todayIso() })}
                    className="flex-1 h-7 bg-accent border border-border rounded-md text-[11px] text-muted-foreground hover:text-foreground"
                  >Today</button>
                  <button
                    onClick={() => onDateChange({ from: '', to: '' })}
                    className="flex-1 h-7 bg-accent border border-border rounded-md text-[11px] text-muted-foreground hover:text-foreground"
                  >Clear</button>
                </div>
              </div>
            )}
          </div>
        )}
        {showExport && (
          <button
            onClick={onExport}
            disabled={!onExport}
            className="h-8 w-8 bg-accent border border-border rounded-md flex items-center justify-center text-primary hover:bg-primary/10 disabled:opacity-40 disabled:hover:bg-accent"
            title="Export to Excel"
          >
            <Download size={14} />
          </button>
        )}
        {onAdd && (
          <button
            onClick={onAdd}
            className="h-8 w-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground hover:opacity-90"
          >
            <Plus size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
