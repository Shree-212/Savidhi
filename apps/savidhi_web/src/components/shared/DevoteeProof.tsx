'use client';

/**
 * Social-proof strip shown on the puja & chadhava details page. Renders a
 * stack of avatar circles plus a "10 Lakh+ Devotees have offered Puja" line,
 * matching the redesign Figma. Counts can be passed in; defaults are a high
 * static number used until we have a real per-puja tally.
 */
interface DevoteeProofProps {
  count?: number;
  label?: string;
  rating?: { value: number; total: string };
  avatarUrls?: string[];
}

function fmtCount(n: number): string {
  if (n >= 100_000) return `${Math.floor(n / 100_000)} Lakh+`;
  if (n >= 1_000)   return `${Math.floor(n / 1_000)}k+`;
  return String(n);
}

// Real human portraits replace the prior dicebear cartoons — the LP needs to
// feel like real devotees, not avatars. Marketing will swap these for CDN
// URLs once we have authentic photography rights.
const FALLBACK_AVATARS = [
  'https://images.pexels.com/photos/1681010/pexels-photo-1681010.jpeg?auto=compress&w=200&h=200&fit=crop',
  'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&w=200&h=200&fit=crop',
  'https://images.pexels.com/photos/733872/pexels-photo-733872.jpeg?auto=compress&w=200&h=200&fit=crop',
  'https://images.pexels.com/photos/1239288/pexels-photo-1239288.jpeg?auto=compress&w=200&h=200&fit=crop',
];

export function DevoteeProof({
  count = 1_000_000,
  label = 'Devotees have offered Puja',
  rating,
  avatarUrls,
}: DevoteeProofProps) {
  const avatars = (avatarUrls && avatarUrls.length > 0 ? avatarUrls : FALLBACK_AVATARS).slice(0, 4);
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="flex -space-x-2.5">
        {avatars.map((src, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={i}
            src={src}
            alt=""
            className="w-9 h-9 rounded-full ring-2 ring-white object-cover bg-primary-50"
            onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_AVATARS[i % FALLBACK_AVATARS.length]; }}
          />
        ))}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-primary-600 leading-tight">{fmtCount(count)} Devotees</p>
        <p className="text-[11px] text-text-secondary leading-tight">{label}</p>
      </div>
      {rating && (
        <div className="bg-white border border-orange-100 rounded-md px-2.5 py-1 text-xs font-semibold text-text-primary flex items-center gap-1 shadow-sm">
          <span className="text-yellow-500">★</span>
          <span className="tabular-nums">{rating.value.toFixed(1)}</span>
          <span className="text-text-muted">|</span>
          <span className="text-text-muted">{rating.total}</span>
        </div>
      )}
    </div>
  );
}
