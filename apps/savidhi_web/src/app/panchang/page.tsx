'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Sun, Moon, Loader2 } from 'lucide-react';
import { ChipToggle } from '@/components/shared/ChipToggle';
import { panchangService } from '@/lib/services';
import { PanchangData, CalendarEvent } from '@/data/models';
import { MOCK_CALENDAR_EVENTS } from '@/data';

const TABS = ['Panchang', 'Calendar'];

/** Format a JS Date → "YYYY-MM-DD" in local time */
function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Format "YYYY-MM-DD" → "21 Mar 2026" */
function labelFromStr(str: string): string {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

export default function PanchangPage() {
  const [tab, setTab] = useState('Panchang');
  const [dateStr, setDateStr] = useState<string>(toDateStr(new Date()));
  const [panchang, setPanchang] = useState<PanchangData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPanchang = useCallback(async (date: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await panchangService.get({ date });
      if (res.data?.success && res.data?.data) {
        setPanchang(res.data.data as PanchangData);
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load panchang');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPanchang(dateStr);
  }, [dateStr, fetchPanchang]);

  function changeDate(delta: number) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const next = new Date(y, m - 1, d + delta);
    setDateStr(toDateStr(next));
  }

  const isToday = dateStr === toDateStr(new Date());

  return (
    <div className="section-container py-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Panchang</h1>
        <ChipToggle options={TABS} selected={tab} onSelect={setTab} />
      </div>

      {tab === 'Panchang' ? (
        <>
          {/* Date navigation */}
          <div className="flex items-center justify-center gap-6 mb-6">
            <button
              onClick={() => changeDate(-1)}
              className="text-primary-500 hover:bg-primary-50 rounded-full p-1 transition"
              aria-label="Previous day"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 bg-primary-50 rounded-lg px-4 py-2">
              <Calendar className="w-4 h-4 text-primary-500" />
              <span className="text-sm font-semibold text-primary-600">
                {isToday ? 'Today — ' : ''}{labelFromStr(dateStr)}
              </span>
            </div>
            <button
              onClick={() => changeDate(1)}
              className="text-primary-500 hover:bg-primary-50 rounded-full p-1 transition"
              aria-label="Next day"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-primary-500">
              <Loader2 className="w-8 h-8 animate-spin" />
              <p className="text-sm text-text-secondary">Loading panchang…</p>
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div className="border border-red-200 bg-red-50 rounded-xl p-6 text-center">
              <p className="text-red-600 text-sm mb-3">{error}</p>
              <button
                onClick={() => fetchPanchang(dateStr)}
                className="text-sm text-primary-600 underline"
              >
                Retry
              </button>
            </div>
          )}

          {/* Panchang data */}
          {!loading && !error && panchang && (
            <>
              {/* Header */}
              <div className="flex items-center flex-wrap gap-x-4 gap-y-1 mb-6 text-sm">
                <span className="font-semibold text-text-primary">{panchang.date}</span>
                <span className="text-text-secondary">{panchang.day}</span>
                <span className="font-medium text-text-primary">{panchang.tithi}</span>
                {panchang.nakshatra && (
                  <span className="text-text-secondary">Nakshatra: {panchang.nakshatra}</span>
                )}
                <span className="text-green-500 text-xs">📍 {panchang.location}</span>
              </div>

              {/* Festival */}
              {panchang.festivals.length > 0 && (
                <div className="border border-border-DEFAULT rounded-xl p-4 mb-3">
                  <h3 className="font-semibold text-text-primary text-sm mb-2">Festival</h3>
                  {panchang.festivals.map((f, i) => (
                    <p key={i} className="text-sm text-text-secondary">• {f}</p>
                  ))}
                </div>
              )}

              {/* Auspicious */}
              <div className="border border-green-200 rounded-xl p-4 mb-3 bg-green-50/30">
                <h3 className="font-semibold text-text-primary text-sm mb-2">Auspicious Time</h3>
                {panchang.auspiciousTimes.map((t, i) => (
                  <div key={i} className="flex justify-between text-sm mb-1">
                    <span className="text-green-600 font-medium">{t.name}</span>
                    <span className="text-text-secondary">{t.time}</span>
                  </div>
                ))}
              </div>

              {/* Inauspicious */}
              <div className="border border-red-200 rounded-xl p-4 mb-3 bg-red-50/30">
                <h3 className="font-semibold text-text-primary text-sm mb-2">Inauspicious Time</h3>
                {panchang.inauspiciousTimes.map((t, i) => (
                  <div key={i} className="flex justify-between text-sm mb-1">
                    <span className="text-red-500 font-medium">{t.name}</span>
                    <span className="text-text-secondary">{t.time}</span>
                  </div>
                ))}
              </div>

              {/* Sun & Moon */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="border border-border-DEFAULT rounded-xl p-4 text-center">
                  <Sun className="w-7 h-7 text-primary-500 mx-auto mb-2" />
                  <p className="text-xs text-text-secondary">Rise: {panchang.sunrise}</p>
                  <p className="text-xs text-text-secondary">Set: {panchang.sunset}</p>
                </div>
                <div className="border border-border-DEFAULT rounded-xl p-4 text-center">
                  <Moon className="w-7 h-7 text-primary-500 mx-auto mb-2" />
                  <p className="text-xs text-text-secondary">Rise: {panchang.moonrise}</p>
                  <p className="text-xs text-text-secondary">Set: {panchang.moonset}</p>
                </div>
              </div>

              {/* Karna */}
              {panchang.karna.length > 0 && (
                <div className="border border-border-DEFAULT rounded-xl p-4 mb-3">
                  <h3 className="font-semibold text-text-primary text-sm mb-2">Karana</h3>
                  {panchang.karna.map((k, i) => (
                    <div key={i} className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-text-primary">{k.name}</span>
                      <span className="text-text-secondary">{k.time}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Yoga */}
              {panchang.yoga.length > 0 && (
                <div className="border border-border-DEFAULT rounded-xl p-4">
                  <h3 className="font-semibold text-text-primary text-sm mb-2">Yoga</h3>
                  {panchang.yoga.map((y, i) => (
                    <div key={i} className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-text-primary">{y.name}</span>
                      <span className="text-text-secondary">{y.time}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      ) : (
        /* Calendar Tab */
        <div>
          <h2 className="font-semibold text-text-primary mb-4">Upcoming Events</h2>
          {MOCK_CALENDAR_EVENTS.map((event: CalendarEvent) => (
            <div key={event.date + event.title} className="border border-border-DEFAULT rounded-xl p-4 mb-3 bg-white">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center shrink-0">
                  <Calendar className="w-5 h-5 text-primary-500" />
                </div>
                <div>
                  <p className="font-semibold text-text-primary text-sm">{event.title}</p>
                  <p className="text-xs text-text-secondary mt-0.5">{event.date}</p>
                  <p className="text-xs text-text-muted mt-1">{event.tithi}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
