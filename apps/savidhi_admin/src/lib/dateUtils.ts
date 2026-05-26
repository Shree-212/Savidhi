// IST-aware helpers for HTML `<input type="datetime-local">` controls.
//
// The admin UI stores event start times as UTC ISO strings (e.g.
// `2026-05-25T03:30:00Z`) but renders them in IST on the details page
// (`25 May, 09:00 am`). The naive `new Date(iso).toISOString().slice(0,16)`
// round-trip emits the UTC clock instead of IST, so the Edit Event Metadata
// form would show "03:30 AM" while the details page shows "09:00 am".
//
// `toLocalDatetimeInputIST` formats the ISO string into `YYYY-MM-DDTHH:mm` in
// Asia/Kolkata. `fromLocalDatetimeInputIST` reverses the trip: it treats the
// `<input>` value as IST wall-clock time and emits a UTC ISO string so the
// backend stores a stable, timezone-aware timestamp.
//
// Both helpers go via Intl.DateTimeFormat with timeZone:'Asia/Kolkata' so they
// are correct regardless of where the admin's browser is running.

const IST_PARTS_OPTS: Intl.DateTimeFormatOptions = {
  timeZone: 'Asia/Kolkata',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
};

function extractParts(d: Date): Record<string, string> {
  return new Intl.DateTimeFormat('en-CA', IST_PARTS_OPTS)
    .formatToParts(d)
    .reduce<Record<string, string>>((acc, p) => {
      if (p.type !== 'literal') acc[p.type] = p.value;
      return acc;
    }, {});
}

/** UTC ISO → IST-formatted `YYYY-MM-DDTHH:mm` for `<input type="datetime-local">`. */
export function toLocalDatetimeInputIST(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const p = extractParts(d);
  // Intl emits hour="24" at midnight; coerce to "00" to keep the input valid.
  const hour = p.hour === '24' ? '00' : p.hour;
  return `${p.year}-${p.month}-${p.day}T${hour}:${p.minute}`;
}

/** IST-formatted `YYYY-MM-DDTHH:mm` → UTC ISO string for backend persistence. */
export function fromLocalDatetimeInputIST(value: string): string {
  if (!value) return '';
  // value looks like "2026-05-25T09:00". Read it as IST wall time. IST is a
  // fixed +05:30 offset (no DST), so we can append the literal offset and let
  // the Date constructor convert to UTC.
  const withSeconds = value.length === 16 ? `${value}:00` : value;
  const d = new Date(`${withSeconds}+05:30`);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString();
}
