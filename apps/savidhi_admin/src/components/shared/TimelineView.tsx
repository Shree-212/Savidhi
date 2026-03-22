'use client';

import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TimelineEvent } from '@/types';

const HOURS = Array.from({ length: 13 }, (_, i) => i + 8); // 8 AM – 8 PM
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const COLOR_MAP: Record<string, string> = {
  orange: 'bg-orange-600/80 border-orange-500',
  teal:   'bg-teal-600/80 border-teal-500',
  green:  'bg-green-600/80 border-green-500',
  red:    'bg-red-700/80 border-red-500',
  blue:   'bg-blue-600/80 border-blue-500',
};

function startOfWeek(d: Date): Date {
  const clone = new Date(d);
  const day = clone.getDay(); // 0=Sun
  const offset = day === 0 ? -6 : 1 - day; // shift to Monday
  clone.setDate(clone.getDate() + offset);
  clone.setHours(0, 0, 0, 0);
  return clone;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

interface TimelineViewProps {
  events: TimelineEvent[];
  onEventClick?: (event: TimelineEvent) => void;
}

export function TimelineView({ events, onEventClick }: TimelineViewProps) {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );
  const today = new Date();

  // Current displayed range label  e.g. "16–22 Mar"
  const rangeLabel = useMemo(() => {
    const s = days[0];
    const e = days[6];
    if (s.getMonth() === e.getMonth()) {
      return `${s.getDate()}–${e.getDate()} ${MONTH_SHORT[s.getMonth()]}`;
    }
    return `${s.getDate()} ${MONTH_SHORT[s.getMonth()]} – ${e.getDate()} ${MONTH_SHORT[e.getMonth()]}`;
  }, [days]);

  // Group events by day column
  const eventsByDay = useMemo(() => {
    const map = new Map<number, TimelineEvent[]>();
    for (const evt of events) {
      const evtDate = evt.date ? new Date(evt.date) : null;
      if (!evtDate) continue;
      const dayIdx = days.findIndex(d => isSameDay(d, evtDate));
      if (dayIdx === -1) continue;
      if (!map.has(dayIdx)) map.set(dayIdx, []);
      map.get(dayIdx)!.push(evt);
    }
    return map;
  }, [events, days]);

  const ROW_H = 44;
  const maxRows = Math.max(1, ...Array.from(eventsByDay.values()).map(v => v.length));

  return (
    <div>
      {/* ── Week navigation ── */}
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => setWeekStart(d => addDays(d, -7))}
          className="h-8 w-8 bg-accent border border-border rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft size={14} />
        </button>

        {/* Day cells */}
        {days.map((d, i) => (
          <div
            key={i}
            className={cn(
              'flex-1 text-center py-1.5 rounded-lg text-xs select-none',
              isSameDay(d, today)
                ? 'bg-primary/20 border border-primary text-primary font-bold'
                : 'text-muted-foreground',
            )}
          >
            <div className="font-semibold leading-tight">{d.getDate()}</div>
            <div className="text-[10px] leading-tight">{MONTH_SHORT[d.getMonth()]}</div>
          </div>
        ))}

        <button
          onClick={() => setWeekStart(d => addDays(d, 7))}
          className="h-8 w-8 bg-accent border border-border rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground"
        >
          <ChevronRight size={14} />
        </button>

        <button
          onClick={() => setWeekStart(startOfWeek(new Date()))}
          className="flex items-center gap-1 h-8 px-3 bg-accent border border-border rounded-md text-[10px] text-muted-foreground hover:text-foreground whitespace-nowrap"
        >
          <Calendar size={12} />
          {rangeLabel}
        </button>
      </div>

      {/* ── Hour labels ── */}
      <div className="flex border-b border-border/50 mb-1">
        {HOURS.map(h => (
          <div key={h} className="flex-1 text-[10px] text-muted-foreground text-center py-1">
            {h > 12 ? `${h - 12} PM` : h === 12 ? '12 PM' : `${h} AM`}
          </div>
        ))}
      </div>

      {/* ── Event grid ── */}
      <div style={{ minHeight: `${maxRows * ROW_H + 20}px` }} className="relative">
        {days.map((_, dayIdx) => {
          const dayEvents = eventsByDay.get(dayIdx) ?? [];
          return dayEvents.map((event, slotIdx) => {
            const leftPct  = ((event.startHour - 8) / 12) * 100;
            const widthPct = Math.max((event.durationHours / 12) * 100, 10);
            const top      = dayIdx * ROW_H + slotIdx * ROW_H + 4;

            return (
              <div
                key={event.id}
                className={cn(
                  'absolute h-[36px] rounded-md px-2 py-1 cursor-pointer border-l-2 overflow-hidden transition-opacity hover:opacity-90',
                  COLOR_MAP[event.color] || COLOR_MAP.orange,
                )}
                style={{ left: `${leftPct}%`, width: `${widthPct}%`, top: `${top}px` }}
                onClick={() => onEventClick?.(event)}
              >
                <p className="text-[10px] font-semibold text-white truncate leading-tight">{event.title}</p>
                <p className="text-[9px] text-white/70 truncate leading-tight">{event.subtitle}</p>
              </div>
            );
          });
        })}

        {events.length === 0 && (
          <div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground">
            No events scheduled for this week
          </div>
        )}
      </div>
    </div>
  );
}
