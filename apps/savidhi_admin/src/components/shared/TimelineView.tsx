'use client';

import { useState, useMemo, useRef } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TimelineEvent } from '@/types';

function toDateInputValue(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Full 24-hour window so events at any time of day (early-morning brahma
// muhurta pujas, late-night aartis, etc.) render in the strip. Labels are
// sparse (every 2 hours) to keep the header readable at the existing width.
const HOUR_LABELS = Array.from({ length: 12 }, (_, i) => i * 2); // 0,2,4…22
const WINDOW_START_HOUR = 0;
const WINDOW_HOURS = 24;
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

function startOfDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
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
  // The user thinks of this as "I am looking at one day at a time". We keep
  // a 7-day strip for navigation but only render events that fall on the
  // selected date — clicking another date in the strip changes the visible
  // events, not just the window. The chevrons scroll a week at a time.
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [selectedDate, setSelectedDate] = useState(() => startOfDay(new Date()));
  const dateInputRef = useRef<HTMLInputElement>(null);

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

  // Only events on the selected day, ordered top-to-bottom by start_time.
  const dayEvents = useMemo(() => {
    return events
      .filter((evt) => {
        if (!evt.date) return false;
        return isSameDay(new Date(evt.date), selectedDate);
      })
      .sort((a, b) => a.startHour - b.startHour);
  }, [events, selectedDate]);

  const ROW_H = 44;
  const maxRows = Math.max(1, dayEvents.length);

  return (
    <div>
      {/* ── Date navigation ── */}
      <div className="flex items-center gap-2 mb-4">
        <button
          aria-label="Previous week"
          onClick={() => setWeekStart((d) => addDays(d, -7))}
          className="h-8 w-8 bg-accent border border-border rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft size={14} />
        </button>

        {/* Day cells — click selects that day */}
        {days.map((d, i) => {
          const isSelected = isSameDay(d, selectedDate);
          const isToday = isSameDay(d, today);
          return (
            <button
              key={i}
              type="button"
              onClick={() => setSelectedDate(startOfDay(d))}
              className={cn(
                'flex-1 text-center py-1.5 rounded-lg text-xs select-none transition-colors relative',
                isSelected
                  ? 'bg-primary text-primary-foreground font-bold shadow-sm'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground',
              )}
            >
              <div className="font-semibold leading-tight">{d.getDate()}</div>
              <div className="text-[10px] leading-tight">{MONTH_SHORT[d.getMonth()]}</div>
              {/* Subtle "today" indicator when today is not the selected date */}
              {isToday && !isSelected && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" aria-hidden />
              )}
            </button>
          );
        })}

        <button
          aria-label="Next week"
          onClick={() => setWeekStart((d) => addDays(d, 7))}
          className="h-8 w-8 bg-accent border border-border rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground"
        >
          <ChevronRight size={14} />
        </button>

        {/* Range button opens a native date picker; selecting jumps the window AND selection */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              const el = dateInputRef.current;
              if (!el) return;
              if (typeof el.showPicker === 'function') el.showPicker();
              else el.click();
            }}
            className="flex items-center gap-1 h-8 px-3 bg-accent border border-border rounded-md text-[10px] text-muted-foreground hover:text-foreground whitespace-nowrap"
          >
            <Calendar size={12} />
            {rangeLabel}
          </button>
          <input
            ref={dateInputRef}
            type="date"
            value={toDateInputValue(selectedDate)}
            onChange={(e) => {
              const v = e.target.value;
              if (!v) return;
              const [y, m, d] = v.split('-').map(Number);
              const picked = new Date(y, m - 1, d);
              picked.setHours(0, 0, 0, 0);
              setWeekStart(startOfWeek(picked));
              setSelectedDate(picked);
            }}
            className="absolute inset-0 w-full h-full opacity-0 pointer-events-none"
            aria-hidden
            tabIndex={-1}
          />
        </div>
      </div>

      {/* ── Hour labels (sparse, every 2 hours across a full 24h window) ── */}
      <div className="flex border-b border-border/50 mb-1">
        {HOUR_LABELS.map(h => (
          <div key={h} className="flex-1 text-[10px] text-muted-foreground text-center py-1">
            {h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`}
          </div>
        ))}
      </div>

      {/* ── Event grid: each event in its own row on the selected day ── */}
      <div style={{ minHeight: `${maxRows * ROW_H + 20}px` }} className="relative">
        {dayEvents.map((event, idx) => {
          // Position events on the full 24h window. Clamp so off-day artefacts
          // (e.g. a start_time stored in a wildly wrong year) at least stay
          // visible on the strip rather than disappear off-screen.
          const rawLeftPct  = ((event.startHour - WINDOW_START_HOUR) / WINDOW_HOURS) * 100;
          const leftPct     = Math.max(0, Math.min(rawLeftPct, 97));
          const widthPct    = Math.max((event.durationHours / WINDOW_HOURS) * 100, 5);
          const top      = idx * ROW_H + 4;

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
        })}

        {dayEvents.length === 0 && (
          <div className="flex items-center justify-center h-[120px] text-sm text-muted-foreground">
            No events scheduled for {selectedDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
          </div>
        )}
      </div>
    </div>
  );
}
