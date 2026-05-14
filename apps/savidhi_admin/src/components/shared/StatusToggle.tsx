'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

interface StatusToggleProps {
  active: boolean;
  onChange: (next: boolean) => Promise<void> | void;
  size?: 'sm' | 'md';
  disabled?: boolean;
}

export function StatusToggle({ active, onChange, size = 'sm', disabled }: StatusToggleProps) {
  const [busy, setBusy] = useState(false);
  const handle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (busy || disabled) return;
    try {
      setBusy(true);
      await onChange(!active);
    } finally {
      setBusy(false);
    }
  };
  const w = size === 'md' ? 'w-10 h-5' : 'w-8 h-4';
  const dot = size === 'md' ? 'w-3.5 h-3.5' : 'w-3 h-3';
  return (
    <button
      type="button"
      onClick={handle}
      disabled={busy || disabled}
      aria-label={active ? 'Set inactive' : 'Set active'}
      className={cn(
        'inline-flex items-center rounded-full p-0.5 transition-colors',
        w,
        active ? 'bg-primary' : 'bg-border',
        (busy || disabled) && 'opacity-50 cursor-not-allowed',
      )}
    >
      <span
        className={cn(
          'rounded-full bg-white transition-transform',
          dot,
          active ? (size === 'md' ? 'translate-x-5' : 'translate-x-4') : 'translate-x-0',
        )}
      />
    </button>
  );
}
