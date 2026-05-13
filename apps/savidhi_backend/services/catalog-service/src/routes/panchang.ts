import { Router, Request, Response, NextFunction } from 'express';
import { fetchPanchangRaw, peekPanchangCache } from '../lib/tithiCalendar';

export const panchangRouter = Router();

// ── Formatted-response cache (keyed by date+lat+lng, 24 h TTL) ──────────────
// Note: the raw Prokerala response is cached inside tithiCalendar.ts; this
// cache stores the formatted payload sent to the client.
const _cache = new Map<string, { data: unknown; expiry: number }>();

// ── Formatting helpers ────────────────────────────────────────────────────────

/** Parse an ISO-8601 datetime OR "HH:MM:SS" string → minutes since midnight (IST). */
function toMinutes(t: string): number {
  if (!t) return 0;
  // ISO format like "2026-03-21T06:30:00+05:30"
  if (t.includes('T')) {
    const d = new Date(t);
    if (!isNaN(d.getTime())) {
      const ist = new Date(d.getTime() + (5 * 60 + 30) * 60000);
      return ist.getUTCHours() * 60 + ist.getUTCMinutes();
    }
  }
  // "HH:MM:SS" or "HH:MM"
  const [h, m] = t.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

/** Minutes → "h:MM AM/PM" */
function minsToStr(mins: number): string {
  const m = ((mins % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  const min = Math.floor(m % 60);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${min.toString().padStart(2, '0')} ${ampm}`;
}

/** Format an ISO/time string → "h:MM AM/PM" */
function fmtTime(t: string): string {
  if (!t) return '--';
  return minsToStr(toMinutes(t));
}

/** Format two ISO/time strings as a range "h:MM AM to h:MM PM" */
function fmtRange(start: string, end: string): string {
  return `${fmtTime(start)} to ${fmtTime(end)}`;
}

/** Format two minute values as a range */
function minsRange(startM: number, endM: number): string {
  return `${minsToStr(startM)} to ${minsToStr(endM)}`;
}

// ── Computed inauspicious periods (saves 50 API credits per call) ─────────────
//   The day (sunrise→sunset) is split into 8 equal slots.
//   Each period occupies one slot based on weekday (0=Sun … 6=Sat).

const RAHU_SLOT   = [7, 1, 6, 4, 5, 3, 2]; // Rahu Kaal
const YAMA_SLOT   = [4, 3, 2, 1, 0, 6, 5]; // Yamaganda
const GULIKA_SLOT = [6, 5, 4, 3, 2, 1, 0]; // Gulika Kaal

const WEEKDAY_IDX: Record<string, number> = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
  thursday: 4, friday: 5, saturday: 6,
};

function computeInauspicious(sunriseMins: number, sunsetMins: number, weekday: string) {
  const slot = (sunsetMins - sunriseMins) / 8;
  const idx = WEEKDAY_IDX[weekday.toLowerCase()] ?? 0;
  const range = (slotIdx: number) => {
    const s = sunriseMins + slotIdx * slot;
    return minsRange(s, s + slot);
  };
  return {
    rahu: range(RAHU_SLOT[idx]),
    yama: range(YAMA_SLOT[idx]),
    gulika: range(GULIKA_SLOT[idx]),
  };
}

function computeAuspicious(sunriseMins: number, sunsetMins: number) {
  // Brahma Muhurta: 96 min before sunrise → 48 min before sunrise
  const brahmaStart = sunriseMins - 96;
  const brahmaEnd = sunriseMins - 48;

  // Abhijit Muhurta: solar noon ± 24 min (48 min window)
  const noon = (sunriseMins + sunsetMins) / 2;
  const abhijitStart = noon - 24;
  const abhijitEnd = noon + 24;

  return {
    brahma: minsRange(brahmaStart, brahmaEnd),
    abhijit: minsRange(abhijitStart, abhijitEnd),
  };
}

// ── Tithi helpers ─────────────────────────────────────────────────────────────

function tithiLabel(tithi: Record<string, string>): string {
  if (!tithi) return '';
  const paksha = (tithi.paksha ?? '').includes('Krishna') ? 'Krishna' : 'Shukla';
  return `${paksha}-${tithi.name ?? ''}`;
}

function moonEmoji(tithi: Record<string, string | number>): string {
  if (!tithi) return '🌒';
  const name = String(tithi.name ?? '').toLowerCase();
  const paksha = String(tithi.paksha ?? '').toLowerCase();
  if (name.includes('purnima') || name === 'purnama') return '🌕';
  if (name.includes('amavasya')) return '🌑';
  const id = Number(tithi.id ?? 1) % 30;
  if (paksha.includes('krishna')) {
    if (id <= 7) return '🌖';
    if (id === 8) return '🌗';
    return '🌘';
  }
  if (id <= 7) return '🌒';
  if (id === 8) return '🌓';
  return '🌔';
}

// ── Route ─────────────────────────────────────────────────────────────────────

panchangRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Params
    const date = ((req.query.date as string) || new Date().toISOString().slice(0, 10)).trim();
    const lat  = parseFloat((req.query.lat  as string) || '23.0225');
    const lng  = parseFloat((req.query.lng  as string) || '72.5714');
    const locationLabel = (req.query.location as string) || 'Ahmedabad';

    const cacheKey = `${date}_${lat}_${lng}`;
    const hit = _cache.get(cacheKey);
    if (hit && Date.now() < hit.expiry) {
      res.json({ success: true, data: hit.data });
      return;
    }

    let d: Record<string, unknown>;
    try {
      d = await fetchPanchangRaw(date, lat, lng);
    } catch (e) {
      const err = e as Error & { upstreamStatus?: number };
      const msg = err.message ?? '';
      if (msg.includes('PROKERALA_CLIENT_ID')) {
        res.status(503).json({ success: false, message: 'Panchang API credentials not configured' });
        return;
      }
      // Prokerala free-tier rate limit (5 req/60s). Surface as 503 so the
      // frontend can show a retryable message instead of a hard error, and
      // include Retry-After so the browser respects the back-off.
      if (err.upstreamStatus === 429 || msg.includes('429')) {
        res.set('Retry-After', '60').status(503).json({
          success: false,
          message: 'Panchang service is temporarily rate-limited. Please try again shortly.',
        });
        return;
      }
      throw e;
    }

    // Extract core fields
    const tithiArr  = (Array.isArray(d.tithi)    ? d.tithi    : [d.tithi])    as Record<string, string | number>[];
    const yogaArr   = (Array.isArray(d.yoga)     ? d.yoga     : [d.yoga])     as Record<string, string>[];
    const karanaArr = (Array.isArray(d.karana)   ? d.karana   : [d.karana])   as Record<string, string>[];
    const vara      = d.vara as Record<string, string> ?? {};

    const sunriseStr = d.sunrise as string ?? '';
    const sunsetStr  = d.sunset  as string ?? '';
    const moonriseStr = d.moonrise as string ?? '';
    const moonsetStr  = d.moonset  as string ?? '';

    const sunriseMins = toMinutes(sunriseStr);
    const sunsetMins  = toMinutes(sunsetStr);

    const inauspicious = computeInauspicious(sunriseMins, sunsetMins, vara.name ?? 'Sunday');
    const auspicious   = computeAuspicious(sunriseMins, sunsetMins);

    // Human-readable date label
    const [y, mo, day] = date.split('-').map(Number);
    const dateLabel = new Date(y, mo - 1, day).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short',
    });

    const result = {
      date: dateLabel,
      day: vara.name ?? '',
      tithi: tithiLabel(tithiArr[0] as Record<string, string>),
      nakshatra: (() => {
        const n = Array.isArray(d.nakshatra) ? (d.nakshatra as Record<string, string>[])[0] : d.nakshatra as Record<string, string>;
        return n?.name ?? '';
      })(),
      location: locationLabel,
      moonPhase: moonEmoji(tithiArr[0]),
      festivals: [] as string[],

      auspiciousTimes: [
        { name: 'Brahma Muhurat', time: auspicious.brahma },
        { name: 'Abhijit Muhurat', time: auspicious.abhijit },
      ],

      inauspiciousTimes: [
        { name: 'Rahu Kal',    time: inauspicious.rahu },
        { name: 'Yamaganda',   time: inauspicious.yama },
        { name: 'Gulika Kaal', time: inauspicious.gulika },
      ],

      sunrise:  fmtTime(sunriseStr),
      sunset:   fmtTime(sunsetStr),
      moonrise: fmtTime(moonriseStr),
      moonset:  fmtTime(moonsetStr),

      yoga: yogaArr.filter(Boolean).map((y) => ({
        name: y.name ?? '',
        time: fmtRange(y.start ?? '', y.end ?? ''),
      })),

      karna: karanaArr.filter(Boolean).map((k) => ({
        name: k.name ?? '',
        time: fmtRange(k.start ?? '', k.end ?? ''),
      })),
    };

    _cache.set(cacheKey, { data: result, expiry: Date.now() + 24 * 60 * 60 * 1000 });
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// ── /events – month-wide calendar of tithi + festivals ────────────────────────
//
// Prokerala's free tier rate-limits at 5 requests / 60s. Fetching all ~30 days
// of a month synchronously would (a) blow past the rate limit instantly, and
// (b) cascade 429s onto subsequent /panchang single-day calls. So this endpoint
// does NOT fetch on the request path. Instead:
//
//   1. We read whatever days are already in the panchang cache.
//   2. Assemble the partial result and return immediately.
//   3. If the cache is incomplete for this month+location, we kick off a
//      throttled background prewarm (one Prokerala call every ~13s) that fills
//      the cache. Subsequent /events calls then return more days.
//
// This means the first time a user opens the Calendar tab for a month, they
// see whatever has been pre-warmed by the daily panchang views — likely empty.
// After ~6–8 minutes of background warmup, the month is complete and stays in
// the 24h cache. Switching to a different city/month restarts the warmup for
// that combination.

type DayEvent = { date: string; title: string; tithi: string; location: string };

const _eventsCache = new Map<string, { data: DayEvent[]; expiry: number }>();
const _prewarmingMonths = new Set<string>();

function listDatesInMonth(year: number, month: number): string[] {
  const daysInMonth = new Date(year, month, 0).getDate();
  const out: string[] = [];
  const mm = String(month).padStart(2, '0');
  for (let d = 1; d <= daysInMonth; d++) {
    out.push(`${year}-${mm}-${String(d).padStart(2, '0')}`);
  }
  return out;
}

function dayToEvent(date: string, raw: Record<string, unknown>, locationLabel: string): DayEvent | null {
  const tithiArr = (Array.isArray(raw.tithi) ? raw.tithi : [raw.tithi]) as Record<string, string | number>[];
  const tithi = tithiLabel(tithiArr[0] as Record<string, string>);
  const festivals: string[] = Array.isArray(raw.festivals)
    ? (raw.festivals as unknown[]).map((f) => (typeof f === 'string' ? f : (f as { name?: string })?.name ?? '')).filter(Boolean)
    : [];
  if (festivals.length === 0) return null;
  return {
    date: new Date(date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
    title: festivals.join(', '),
    tithi,
    location: locationLabel,
  };
}

/** Throttled background prewarmer. Fetches each day at ~13s intervals so we
 *  stay under Prokerala's 5/60s limit and don't starve concurrent /panchang
 *  requests. fetchPanchangRaw is itself cached, so this is idempotent. */
async function prewarmMonth(year: number, month: number, lat: number, lng: number): Promise<void> {
  const key = `prewarm_${year}_${month}_${lat}_${lng}`;
  if (_prewarmingMonths.has(key)) return;
  _prewarmingMonths.add(key);
  try {
    for (const date of listDatesInMonth(year, month)) {
      // Skip days we already have to avoid burning rate-limit budget on no-ops.
      if (peekPanchangCache(date, lat, lng)) continue;
      try {
        await fetchPanchangRaw(date, lat, lng);
      } catch (e) {
        const err = e as Error & { upstreamStatus?: number };
        // On 429, wait a full minute before continuing — gives the limit time to
        // reset rather than burning the next 4 slots failing.
        if (err.upstreamStatus === 429) {
          await new Promise((r) => setTimeout(r, 60_000));
          continue;
        }
        // Other errors: log and keep going.
        console.warn(`[panchang prewarm] ${date}@${lat},${lng} failed:`, err.message);
      }
      // Pace ourselves: 5 requests / 60s = 1 every 12s. Round up to 13s
      // for safety against clock drift / concurrent /panchang calls.
      await new Promise((r) => setTimeout(r, 13_000));
    }
  } finally {
    _prewarmingMonths.delete(key);
  }
}

panchangRouter.get('/events', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const now = new Date();
    const month = Math.max(1, Math.min(12, parseInt((req.query.month as string) || String(now.getMonth() + 1), 10)));
    const year  = parseInt((req.query.year as string) || String(now.getFullYear()), 10) || now.getFullYear();
    const lat   = parseFloat((req.query.lat as string) || '23.0225');
    const lng   = parseFloat((req.query.lng as string) || '72.5714');
    const locationLabel = (req.query.location as string) || 'Ahmedabad';

    // Build a result from whatever's currently in the per-day panchang cache.
    const dates = listDatesInMonth(year, month);
    const results: DayEvent[] = [];
    let hits = 0;
    for (const date of dates) {
      const raw = peekPanchangCache(date, lat, lng);
      if (!raw) continue;
      hits++;
      const ev = dayToEvent(date, raw, locationLabel);
      if (ev) results.push(ev);
    }

    const complete = hits === dates.length;
    const cacheKey = `events_${year}_${month}_${lat}_${lng}`;
    // Cache complete months for 24h; partial results for 90s so we re-aggregate
    // as the prewarm fills in more days.
    const ttl = complete ? 24 * 60 * 60 * 1000 : 90 * 1000;
    _eventsCache.set(cacheKey, { data: results, expiry: Date.now() + ttl });

    // Kick off a background prewarm if we don't have the full month yet. This
    // is fire-and-forget — the response returns immediately.
    if (!complete) {
      // Returning the promise to a no-op handler so we don't get an
      // unhandled-rejection warning if the prewarm itself crashes.
      prewarmMonth(year, month, lat, lng).catch((e) => {
        console.warn('[panchang prewarm] crashed:', (e as Error).message);
      });
    }

    res.json({
      success: true,
      data: results,
      meta: complete ? undefined : { warming: true, daysReady: hits, daysTotal: dates.length },
    });
  } catch (err) {
    next(err);
  }
});
