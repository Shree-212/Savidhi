'use client';

import { cn } from '@/lib/utils';

interface TabToggleProps {
  tabs: string[];
  active: string;
  onChange: (tab: string) => void;
}

export function TabToggle({ tabs, active, onChange }: TabToggleProps) {
  return (
    <div className="flex items-center bg-accent rounded-lg p-0.5">
      {tabs.map((tab) => (
        <button
          key={tab}
          onClick={() => onChange(tab)}
          className={cn(
            'px-4 py-1.5 text-xs font-medium rounded-md transition-colors',
            active === tab
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}
