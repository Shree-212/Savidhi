'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Sun, Moon, Loader2, MapPin } from 'lucide-react';
import { ChipToggle } from '@/components/shared/ChipToggle';
import { panchangService } from '@/lib/services';
import { PanchangData, CalendarEvent } from '@/data/models';

const TABS = ['Panchang', 'Calendar'];

// Alphabetised list of all 28 state capitals + major UT capitals + major metros
// + the most-visited Hindu pilgrimage cities. Lat/lng accurate to the city
// centre; Prokerala uses these for sunrise/sunset and inauspicious-period
// calculations. Add a city by inserting it in alphabetical order.
const LOCATIONS: { label: string; lat: number; lng: number }[] = [
  { label: 'Agartala',            lat: 23.8315, lng: 91.2868 },
  { label: 'Ahmedabad',           lat: 23.0225, lng: 72.5714 },
  { label: 'Aizawl',              lat: 23.7271, lng: 92.7176 },
  { label: 'Amaravati',           lat: 16.5417, lng: 80.5151 },
  { label: 'Amritsar',            lat: 31.6340, lng: 74.8723 },
  { label: 'Ayodhya',             lat: 26.7922, lng: 82.1998 },
  { label: 'Bengaluru',           lat: 12.9716, lng: 77.5946 },
  { label: 'Bhopal',              lat: 23.2599, lng: 77.4126 },
  { label: 'Bhubaneswar',         lat: 20.2961, lng: 85.8245 },
  { label: 'Chandigarh',          lat: 30.7333, lng: 76.7794 },
  { label: 'Chennai',             lat: 13.0827, lng: 80.2707 },
  { label: 'Coimbatore',          lat: 11.0168, lng: 76.9558 },
  { label: 'Dehradun',            lat: 30.3165, lng: 78.0322 },
  { label: 'Delhi',               lat: 28.6139, lng: 77.2090 },
  { label: 'Dwarka',              lat: 22.2400, lng: 68.9678 },
  { label: 'Gandhinagar',         lat: 23.2156, lng: 72.6369 },
  { label: 'Gangtok',             lat: 27.3389, lng: 88.6065 },
  { label: 'Guwahati',            lat: 26.1445, lng: 91.7362 },
  { label: 'Haridwar',            lat: 29.9457, lng: 78.1642 },
  { label: 'Hyderabad',           lat: 17.3850, lng: 78.4867 },
  { label: 'Imphal',              lat: 24.8170, lng: 93.9368 },
  { label: 'Indore',              lat: 22.7196, lng: 75.8577 },
  { label: 'Itanagar',            lat: 27.0844, lng: 93.6053 },
  { label: 'Jaipur',              lat: 26.9124, lng: 75.7873 },
  { label: 'Jammu',               lat: 32.7266, lng: 74.8570 },
  { label: 'Kanpur',              lat: 26.4499, lng: 80.3319 },
  { label: 'Kohima',              lat: 25.6747, lng: 94.1086 },
  { label: 'Kolkata',             lat: 22.5726, lng: 88.3639 },
  { label: 'Leh',                 lat: 34.1526, lng: 77.5771 },
  { label: 'Lucknow',             lat: 26.8467, lng: 80.9462 },
  { label: 'Madurai',             lat: 9.9252,  lng: 78.1198 },
  { label: 'Mathura',             lat: 27.4924, lng: 77.6737 },
  { label: 'Mumbai',              lat: 19.0760, lng: 72.8777 },
  { label: 'Nagpur',              lat: 21.1458, lng: 79.0882 },
  { label: 'Nashik',              lat: 19.9975, lng: 73.7898 },
  { label: 'Panaji',              lat: 15.4909, lng: 73.8278 },
  { label: 'Patna',               lat: 25.5941, lng: 85.1376 },
  { label: 'Port Blair',          lat: 11.6234, lng: 92.7265 },
  { label: 'Prayagraj',           lat: 25.4358, lng: 81.8463 },
  { label: 'Puducherry',          lat: 11.9416, lng: 79.8083 },
  { label: 'Pune',                lat: 18.5204, lng: 73.8567 },
  { label: 'Puri',                lat: 19.8135, lng: 85.8312 },
  { label: 'Raipur',              lat: 21.2514, lng: 81.6296 },
  { label: 'Rameswaram',          lat: 9.2876,  lng: 79.3129 },
  { label: 'Ranchi',              lat: 23.3441, lng: 85.3096 },
  { label: 'Rishikesh',           lat: 30.0869, lng: 78.2676 },
  { label: 'Shillong',            lat: 25.5788, lng: 91.8933 },
  { label: 'Shimla',              lat: 31.1048, lng: 77.1734 },
  { label: 'Srinagar',            lat: 34.0837, lng: 74.7973 },
  { label: 'Surat',               lat: 21.1702, lng: 72.8311 },
  { label: 'Thiruvananthapuram',  lat: 8.5241,  lng: 76.9366 },
  { label: 'Tirupati',            lat: 13.6288, lng: 79.4192 },
  { label: 'Ujjain',              lat: 23.1765, lng: 75.7885 },
  { label: 'Vadodara',            lat: 22.3072, lng: 73.1812 },
  { label: 'Varanasi',            lat: 25.3176, lng: 82.9739 },
  { label: 'Vijayawada',          lat: 16.5062, lng: 80.6480 },
  { label: 'Visakhapatnam',       lat: 17.6868, lng: 83.2185 },
];

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
  const [location, setLocation] = useState(() => LOCATIONS.find((l) => l.label === 'Delhi') ?? LOCATIONS[0]);
  const [panchang, setPanchang] = useState<PanchangData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [eventsWarming, setEventsWarming] = useState<{ daysReady: number; daysTotal: number } | null>(null);

  const fetchPanchang = useCallback(async (date: string, loc: typeof LOCATIONS[number]) => {
    setLoading(true);
    setError(null);
    try {
      const res = await panchangService.get({ date, location: loc.label, lat: loc.lat, lng: loc.lng });
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
    fetchPanchang(dateStr, location);
  }, [dateStr, location, fetchPanchang]);

  useEffect(() => {
    if (tab !== 'Calendar') return;
    const now = new Date();
    setEventsLoading(true);
    setEventsError(null);
    panchangService.getEvents({
      month: now.getMonth() + 1,
      year: now.getFullYear(),
      location: location.label,
      lat: location.lat,
      lng: location.lng,
    })
      .then((res) => {
        const raw = res.data?.data ?? [];
        setEvents(raw as CalendarEvent[]);
        const meta = res.data?.meta;
        if (meta?.warming) {
          setEventsWarming({ daysReady: meta.daysReady ?? 0, daysTotal: meta.daysTotal ?? 0 });
        } else {
          setEventsWarming(null);
        }
      })
      .catch((e: unknown) => setEventsError(e instanceof Error ? e.message : 'Failed to load events'))
      .finally(() => setEventsLoading(false));
  }, [tab, location]);

  // Auto-refresh the calendar every 60s while the backend is still warming
  // its month cache (Prokerala is rate-limited to ~5 req/min, so a full month
  // takes ~6–8 min to populate). When complete, the polling stops.
  useEffect(() => {
    if (tab !== 'Calendar' || !eventsWarming) return;
    const id = setInterval(() => {
      const now = new Date();
      panchangService.getEvents({
        month: now.getMonth() + 1,
        year: now.getFullYear(),
        location: location.label,
        lat: location.lat,
        lng: location.lng,
      })
        .then((res) => {
          setEvents((res.data?.data ?? []) as CalendarEvent[]);
          const meta = res.data?.meta;
          if (meta?.warming) {
            setEventsWarming({ daysReady: meta.daysReady ?? 0, daysTotal: meta.daysTotal ?? 0 });
          } else {
            setEventsWarming(null);
          }
        })
        .catch(() => { /* swallow polling errors; the next tick retries */ });
    }, 60_000);
    return () => clearInterval(id);
  }, [tab, location, eventsWarming]);

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

      {/* Location picker */}
      <div className="flex items-center gap-2 mb-4">
        <MapPin className="w-4 h-4 text-primary-500 flex-shrink-0" />
        <label className="text-xs text-text-secondary">Location:</label>
        <select
          value={location.label}
          onChange={(e) => {
            const next = LOCATIONS.find((l) => l.label === e.target.value);
            if (next) setLocation(next);
          }}
          className="border border-border-DEFAULT rounded-lg px-2 py-1 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400"
        >
          {LOCATIONS.map((l) => (
            <option key={l.label} value={l.label}>{l.label}</option>
          ))}
        </select>
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
                onClick={() => fetchPanchang(dateStr, location)}
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
          {eventsLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-primary-500 animate-spin" />
            </div>
          )}
          {!eventsLoading && eventsError && (
            <p className="text-center text-red-500 py-8 text-sm">{eventsError}</p>
          )}
          {!eventsLoading && !eventsError && events.length === 0 && eventsWarming && (
            <div className="border border-orange-100 bg-orange-50/40 rounded-xl p-6 text-center">
              <Loader2 className="w-5 h-5 text-primary-500 animate-spin mx-auto mb-2" />
              <p className="text-sm text-text-primary font-medium">Building this month&apos;s calendar…</p>
              <p className="text-xs text-text-muted mt-1">
                {eventsWarming.daysReady}/{eventsWarming.daysTotal} days ready. Festivals appear here as they&apos;re fetched
                from our panchang provider (rate-limited to a few requests per minute). This page auto-refreshes every minute.
              </p>
            </div>
          )}
          {!eventsLoading && !eventsError && events.length === 0 && !eventsWarming && (
            <p className="text-center text-text-muted py-8 text-sm">No festivals this month</p>
          )}
          {!eventsLoading && !eventsError && events.map((event: CalendarEvent) => (
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
