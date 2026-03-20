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
    <div className="border border-border-DEFAULT rounded-xl mb-3 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-gray-50 transition"
      >
        <span className="font-semibold text-sm text-text-primary">{title}</span>
        <ChevronDown className={`w-4 h-4 text-text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="px-4 pb-4 text-sm text-text-secondary space-y-1">{children}</div>}
    </div>
  );
}
