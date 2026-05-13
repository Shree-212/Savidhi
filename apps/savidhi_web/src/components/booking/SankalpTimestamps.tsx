'use client';

import { SkipForward } from 'lucide-react';

export interface SankalpTimestamp {
  name: string;
  gotra?: string;
  minute: number;
  second: number;
}

interface Props {
  timestamps: SankalpTimestamp[];
  onSeek: (seconds: number) => void;
}

export function SankalpTimestamps({ timestamps, onSeek }: Props) {
  return (
    <div className="mt-3 space-y-1.5">
      <p className="text-[10px] uppercase tracking-wider text-text-muted font-semibold">Skip to devotee</p>
      <div className="flex flex-wrap gap-2">
        {timestamps.map((t, i) => {
          const seconds = Math.max(0, Math.floor(t.minute) * 60 + Math.floor(t.second));
          const label = t.gotra ? `${t.name} · ${t.gotra}` : t.name;
          return (
            <button
              key={`${i}-${t.name}`}
              type="button"
              onClick={() => onSeek(seconds)}
              className="inline-flex items-center gap-1.5 text-xs border border-primary-200 text-primary-700 bg-primary-50 hover:bg-primary-100 rounded-full px-2.5 py-1 transition"
            >
              <SkipForward className="w-3 h-3" />
              {label}
              <span className="text-[10px] text-text-muted tabular-nums">
                {String(t.minute).padStart(2, '0')}:{String(t.second).padStart(2, '0')}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
