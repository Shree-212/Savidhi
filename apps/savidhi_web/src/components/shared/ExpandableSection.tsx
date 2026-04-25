'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface ExpandableSectionProps {
  title: string;
  initiallyExpanded?: boolean;
  children: React.ReactNode;
}

export function ExpandableSection({ title, initiallyExpanded = false, children }: ExpandableSectionProps) {
  const [open, setOpen] = useState(initiallyExpanded);

  return (
    <div className="border border-orange-100 bg-white rounded-xl mb-3 overflow-hidden shadow-[0_1px_2px_rgba(232,129,58,0.04)]">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 sm:px-5 py-3.5 hover:bg-orange-50/50 transition-colors"
        aria-expanded={open}
      >
        <span className="font-semibold text-sm sm:text-[15px] text-text-primary tracking-tight">{title}</span>
        <span className={`w-7 h-7 rounded-full bg-primary-50 flex items-center justify-center transition-transform ${open ? 'rotate-180' : ''}`}>
          <ChevronDown className="w-4 h-4 text-primary-500" />
        </span>
      </button>
      {open && (
        <div className="px-4 sm:px-5 pb-4 pt-2 border-t border-orange-50 text-sm text-text-secondary leading-relaxed space-y-1.5">
          {children}
        </div>
      )}
    </div>
  );
}
