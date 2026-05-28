'use client';

// Thin wrapper around ConsultBookingSheet. The consult section is currently
// disabled at the listing level (see src/app/consult/page.tsx) but this route
// remains functional in case it's hit directly (e.g. an email link).

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { ConsultBookingSheet } from '@/components/shared/ConsultBookingSheet';
import { astrologerService } from '@/lib/services';
import type { AppointmentDuration, DurationOption } from '@/data/models';

const DURATION_LABELS: Array<{ key: AppointmentDuration; label: string; priceField: string }> = [
  { key: '15min', label: '15 Min', priceField: 'price_15min' },
  { key: '30min', label: '30 Min', priceField: 'price_30min' },
  { key: '1hour', label: '1 Hour', priceField: 'price_1hour' },
  { key: '2hour', label: '2 Hour', priceField: 'price_2hour' },
];

export default function BookAppointmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [astro, setAstro] = useState<{ id: string; slug: string; name: string } | null>(null);
  const [durations, setDurations] = useState<DurationOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    astrologerService.getById(id)
      .then((res) => {
        const raw = res.data?.data ?? res.data;
        if (!raw) return;
        setAstro({ id: raw.id, slug: raw.slug ?? raw.id, name: raw.name });
        setDurations(
          DURATION_LABELS.map((d) => ({
            key: d.key,
            label: d.label,
            price: Number(raw[d.priceField] ?? 0),
          })),
        );
      })
      .catch((err) => {
        const e = err as { response?: { data?: { message?: string } } };
        setError(e.response?.data?.message ?? 'Failed to load');
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  if (error || !astro) {
    return (
      <div className="section-container py-20 text-center text-text-secondary">
        {error || 'Astrologer not found.'} <Link href="/consult" className="text-primary-500 underline">Go back</Link>
      </div>
    );
  }

  return (
    <ConsultBookingSheet
      astrologerId={astro.id}
      astrologerSlug={astro.slug}
      astrologerName={astro.name}
      durations={durations}
      open
      onClose={() => router.back()}
      fullPage
    />
  );
}
