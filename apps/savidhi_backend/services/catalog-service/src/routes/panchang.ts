import { Router, Request, Response, NextFunction } from 'express';

export const panchangRouter = Router();

const TOKEN_URL = 'https://api.prokerala.com/token';
const PANCHANG_URL = 'https://api.prokerala.com/v2/astrology/panchang';

const CLIENT_ID = process.env.PROKERALA_CLIENT_ID ?? '';
const CLIENT_SECRET = process.env.PROKERALA_CLIENT_SECRET ?? '';

// ── Token cache ───────────────────────────────────────────────────────────────
let _token: string | null = null;
let _tokenExpiry = 0;

async function getToken(): Promise<string> {
  if (_token && Date.now() < _tokenExpiry) return _token;
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
  const data = await res.json() as { access_token: string; expires_in: number };
  _token = data.access_token;
  _tokenExpiry = Date.now() + (data.expires_in - 120) * 1000; // 2 min buffer
  return _token;
}

// ── Panchang response cache (keyed by date+lat+lng, 24 h TTL) ────────────────
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

    if (!CLIENT_ID || !CLIENT_SECRET) {
      res.status(503).json({ success: false, message: 'Panchang API credentials not configured' });
      return;
    }

    const token = await getToken();

    // Build Prokerala request
    const url = new URL(PANCHANG_URL);
    url.searchParams.set('ayanamsa', '1');           // Lahiri
    url.searchParams.set('coordinates', `${lat},${lng}`);
    url.searchParams.set('datetime', `${date}T00:00:00+05:30`);

    const apiRes = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!apiRes.ok) {
      const errText = await apiRes.text();
      throw new Error(`Prokerala panchang ${apiRes.status}: ${errText}`);
    }

    const apiJson = await apiRes.json() as { status: string; data: Record<string, unknown> };
    const d = apiJson.data;

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
