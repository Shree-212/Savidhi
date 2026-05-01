// Shared Prokerala panchang client + tithi/event-date helpers.
// Used by panchang.ts (single-day public endpoint) and pujas/chadhavas
// generate-events endpoints (multi-day repeat resolution).

const TOKEN_URL = 'https://api.prokerala.com/token';
const PANCHANG_URL = 'https://api.prokerala.com/v2/astrology/panchang';

const CLIENT_ID = process.env.PROKERALA_CLIENT_ID ?? '';
const CLIENT_SECRET = process.env.PROKERALA_CLIENT_SECRET ?? '';

// ── Token cache ───────────────────────────────────────────────────────────────
let _token: string | null = null;
let _tokenExpiry = 0;

export async function getProkeralaToken(): Promise<string> {
  if (_token && Date.now() < _tokenExpiry) return _token;
  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error('PROKERALA_CLIENT_ID/SECRET not configured');
  }
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
  });
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  if (!res.ok) throw new Error(`Prokerala token error ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { access_token: string; expires_in: number };
  _token = data.access_token;
  _tokenExpiry = Date.now() + (data.expires_in - 120) * 1000;
  return _token;
}

// ── Per-date panchang fetch with 24-h cache (shared across endpoints) ─────────
type RawPanchang = Record<string, unknown>;
const _panchangCache = new Map<string, { data: RawPanchang; expiry: number }>();

export async function fetchPanchangRaw(date: string, lat: number, lng: number): Promise<RawPanchang> {
  const cacheKey = `${date}_${lat}_${lng}`;
  const hit = _panchangCache.get(cacheKey);
  if (hit && Date.now() < hit.expiry) return hit.data;

  const token = await getProkeralaToken();
  const url = new URL(PANCHANG_URL);
  url.searchParams.set('ayanamsa', '1');
  url.searchParams.set('coordinates', `${lat},${lng}`);
  url.searchParams.set('datetime', `${date}T00:00:00+05:30`);

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Prokerala panchang ${res.status}: ${await res.text()}`);
  const json = (await res.json()) as { status: string; data: RawPanchang };

  _panchangCache.set(cacheKey, { data: json.data, expiry: Date.now() + 24 * 60 * 60 * 1000 });
  return json.data;
}

// ── Tithi name extraction ────────────────────────────────────────────────────
// Prokerala returns tithi as either a single object or an array of overlapping
// tithis (the day starts in one tithi and may transition into another). We
// consider a date a "match" if ANY of the day's tithis matches the requested name.

export function extractTithiNames(panchangData: RawPanchang): string[] {
  const t = panchangData.tithi;
  if (!t) return [];
  const arr = (Array.isArray(t) ? t : [t]) as Array<Record<string, string>>;
  return arr.map((x) => (x?.name ?? '').toLowerCase()).filter(Boolean);
}

// ── findTithiDates: walk a date range, return the dates that match ──────────
export async function findTithiDates(
  from: Date,
  to: Date,
  tithiNames: string[],
  lat = 23.0225,
  lng = 72.5714,
): Promise<Date[]> {
  if (!tithiNames.length) return [];
  const wanted = new Set(tithiNames.map((n) => n.toLowerCase()));
  const matches: Date[] = [];

  const cur = new Date(from);
  cur.setUTCHours(0, 0, 0, 0);
  const end = new Date(to);
  end.setUTCHours(0, 0, 0, 0);

  while (cur.getTime() <= end.getTime()) {
    const isoDate = cur.toISOString().slice(0, 10);
    try {
      const data = await fetchPanchangRaw(isoDate, lat, lng);
      const names = extractTithiNames(data);
      if (names.some((n) => wanted.has(n))) {
        matches.push(new Date(cur));
      }
    } catch (e) {
      // If Prokerala is down or credentials missing, fall back silently —
      // an empty result tells the admin "no events generated; check API config".
      console.error(`[tithiCalendar] panchang lookup failed for ${isoDate}:`, (e as Error).message);
    }
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return matches;
}

// ── Weekday + month-date helpers (no API needed) ──────────────────────────────

const WEEKDAY_TOKENS: Record<string, number> = {
  SUN: 0, SUNDAY: 0,
  MON: 1, MONDAY: 1,
  TUE: 2, TUESDAY: 2,
  WED: 3, WEDNESDAY: 3,
  THU: 4, THURSDAY: 4,
  FRI: 5, FRIDAY: 5,
  SAT: 6, SATURDAY: 6,
};

function findWeekdayDates(from: Date, to: Date, weekdays: string[]): Date[] {
  const wanted = new Set(
    weekdays
      .map((d) => WEEKDAY_TOKENS[d.toUpperCase()])
      .filter((n): n is number => typeof n === 'number'),
  );
  if (!wanted.size) return [];
  const out: Date[] = [];
  const cur = new Date(from);
  cur.setUTCHours(0, 0, 0, 0);
  const end = new Date(to);
  end.setUTCHours(0, 0, 0, 0);
  while (cur.getTime() <= end.getTime()) {
    if (wanted.has(cur.getUTCDay())) out.push(new Date(cur));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return out;
}

function findMonthDateMatches(from: Date, to: Date, dates: string[]): Date[] {
  const wanted = new Set(
    dates.map((d) => Number(d)).filter((n) => Number.isFinite(n) && n >= 1 && n <= 31),
  );
  if (!wanted.size) return [];
  const out: Date[] = [];
  const cur = new Date(from);
  cur.setUTCHours(0, 0, 0, 0);
  const end = new Date(to);
  end.setUTCHours(0, 0, 0, 0);
  while (cur.getTime() <= end.getTime()) {
    if (wanted.has(cur.getUTCDate())) out.push(new Date(cur));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return out;
}

// ── nextEventDates: dispatcher for the three repeat strategies ───────────────

export type RepeatDuration = 'WEEK_DAYS' | 'MONTH_DATE' | 'LUNAR_PHASE';

export async function nextEventDates(
  repeatDuration: RepeatDuration,
  repeatsOn: string[],
  startDate: Date,
  days = 60,
  lat = 23.0225,
  lng = 72.5714,
): Promise<Date[]> {
  const from = new Date(startDate);
  from.setUTCHours(0, 0, 0, 0);
  const to = new Date(from);
  to.setUTCDate(to.getUTCDate() + days);

  switch (repeatDuration) {
    case 'WEEK_DAYS':
      return findWeekdayDates(from, to, repeatsOn);
    case 'MONTH_DATE':
      return findMonthDateMatches(from, to, repeatsOn);
    case 'LUNAR_PHASE':
      return findTithiDates(from, to, repeatsOn, lat, lng);
    default:
      return [];
  }
}

// ── Apply HH:MM time-of-day to a list of UTC-midnight dates ──────────────────
// schedule_time examples in the seed: "07:00 AM", "06:30 AM", "05:30 PM".
// We parse to IST hours/minutes and produce a TIMESTAMPTZ in IST.

export function parseTimeOfDayIST(timeStr: string | null | undefined): { h: number; m: number } {
  if (!timeStr) return { h: 9, m: 0 }; // sensible default if empty
  const trimmed = timeStr.trim().toUpperCase();
  // Accept "HH:MM AM/PM" or "HH:MM" (24h)
  const match = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/);
  if (!match) return { h: 9, m: 0 };
  let h = Number(match[1]);
  const m = Number(match[2]);
  const ampm = match[3];
  if (ampm === 'PM' && h < 12) h += 12;
  if (ampm === 'AM' && h === 12) h = 0;
  return { h: h % 24, m: m % 60 };
}

/**
 * Combine a date (UTC-midnight) with HH:MM-IST time-of-day into a real
 * TIMESTAMPTZ at IST. Returns an ISO string suitable for INSERT.
 */
export function combineDateAndISTTime(date: Date, h: number, m: number): string {
  const y = date.getUTCFullYear();
  const mo = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  const hh = String(h).padStart(2, '0');
  const mm = String(m).padStart(2, '0');
  return `${y}-${mo}-${d}T${hh}:${mm}:00+05:30`;
}
