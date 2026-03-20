'use client';

import { cn } from '@/lib/utils';

interface ChipToggleProps {
  options: string[];
  selected: string;
  onSelect: (option: string) => void;
}

export function ChipToggle({ options, selected, onSelect }: ChipToggleProps) {
  return (
    <div className="flex gap-2 flex-wrap">
      {options.map((option) => (
        <button
          key={option}
          onClick={() => onSelect(option)}
          className={cn(
            'px-4 py-2 rounded-full text-sm font-medium transition-colors',
            selected === option
              ? 'bg-primary-500 text-white'
              : 'bg-white text-text-secondary border border-border hover:border-primary-300'
          )}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
