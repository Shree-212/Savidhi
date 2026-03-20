'use client';

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
}: PageHeaderProps) {
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
        {showFilters && (
          <button className="h-8 px-3 bg-accent border border-border rounded-md text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5">
            <SlidersHorizontal size={13} />
            Filters
          </button>
        )}
        {showDateNav && (
          <div className="flex items-center gap-1">
            <button className="h-8 w-8 bg-accent border border-border rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground">
              <ChevronLeft size={14} />
            </button>
            <button className="h-8 px-3 bg-accent border border-border rounded-md flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
              <Calendar size={13} />
              Today
            </button>
            <button className="h-8 w-8 bg-accent border border-border rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground">
              <ChevronRight size={14} />
            </button>
          </div>
        )}
        {showExport && (
          <button className="h-8 w-8 bg-accent border border-border rounded-md flex items-center justify-center text-primary hover:bg-primary/10">
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
