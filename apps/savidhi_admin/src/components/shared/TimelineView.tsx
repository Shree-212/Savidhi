'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TimelineEvent } from '@/types';

const HOURS = Array.from({ length: 13 }, (_, i) => i + 8); // 8AM to 8PM
const COLOR_MAP: Record<string, string> = {
  orange: 'bg-orange-600/80 border-orange-500',
  teal: 'bg-teal-600/80 border-teal-500',
  green: 'bg-green-600/80 border-green-500',
  red: 'bg-red-700/80 border-red-500',
  blue: 'bg-blue-600/80 border-blue-500',
};

interface TimelineViewProps {
  events: TimelineEvent[];
  onEventClick?: (event: TimelineEvent) => void;
}

export function TimelineView({ events, onEventClick }: TimelineViewProps) {
  const [weekStart, setWeekStart] = useState(22);
  const days = Array.from({ length: 7 }, (_, i) => weekStart + i);
  const selectedDay = weekStart + 3; // center day

  return (
    <div>
      {/* Week header */}
      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => setWeekStart(w => w - 7)} className="text-muted-foreground hover:text-foreground">
          <ChevronLeft size={16} />
        </button>
        {days.map((d) => (
          <div
            key={d}
            className={cn(
              'flex-1 text-center py-2 text-xs',
              d === selectedDay
                ? 'bg-primary/20 rounded-lg border border-primary text-primary font-bold'
                : 'text-muted-foreground'
            )}
          >
            <div className="font-semibold">{d}</div>
            <div className="text-[10px]">Jan</div>
          </div>
        ))}
        <button onClick={() => setWeekStart(w => w + 7)} className="text-muted-foreground hover:text-foreground">
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Grid */}
      <div className="relative">
        {/* Hour labels */}
        <div className="flex border-b border-border/50 mb-1">
          {HOURS.map((h) => (
            <div key={h} className="flex-1 text-[10px] text-muted-foreground text-center py-1">
              {h > 12 ? `${h - 12} PM` : h === 12 ? '12 PM' : `${h} AM`}
            </div>
          ))}
        </div>

        {/* Events */}
        <div className="relative min-h-[300px]">
          {events.map((event) => {
            const dayIndex = days.indexOf(event.day);
            if (dayIndex === -1) return null;
            const leftPct = ((event.startHour - 8) / 12) * 100;
            const widthPct = (event.durationHours / 12) * 100;
            const top = dayIndex * 44 + 4;

            return (
              <div
                key={event.id}
                className={cn(
                  'absolute h-[36px] rounded-md px-2 py-1 cursor-pointer border-l-2 overflow-hidden',
                  COLOR_MAP[event.color] || COLOR_MAP.orange
                )}
                style={{ left: `${leftPct}%`, width: `${widthPct}%`, top: `${top}px` }}
                onClick={() => onEventClick?.(event)}
              >
                <p className="text-[10px] font-semibold text-white truncate leading-tight">{event.title}</p>
                <p className="text-[9px] text-white/70 truncate leading-tight">{event.subtitle}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
