'use client';

// Backward-compatibility wrapper. The chadhava booking flow normally opens as
// an in-page sheet from `/chadhava/[id]`. This route still exists so links
// pointing directly at /book continue to work — it just renders the same
// component in `fullPage` mode and pre-seeds offerings from the legacy
// `?offerings=id:qty,id:qty` query string.

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { ChadhavaBookingSheet } from '@/components/shared/ChadhavaBookingSheet';
import { chadhavaService } from '@/lib/services';
import { mapChadhava } from '@/lib/mappers';

export default function ChadhavaBookingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();

  const [chadhava, setChadhava] = useState<{ mapped: { name: string; slug?: string }; raw: Record<string, unknown> } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError('');
        const res = await chadhavaService.getById(id);
        if (cancelled) return;
        const raw = res.data?.data ?? res.data;
        if (raw) setChadhava({ mapped: mapChadhava(raw), raw });
      } catch (err) {
        const e = err as { response?: { data?: { message?: string } }; message?: string };
        if (!cancelled) setError(e.response?.data?.message || e.message || 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  // Seed offering quantities from the `?offerings=id:qty,id:qty` query string.
  const seededOfferings: Record<string, number> = (() => {
    const param = searchParams.get('offerings');
    if (!param) return {};
    const seeded: Record<string, number> = {};
    for (const pair of param.split(',')) {
      const [oid, qty] = pair.split(':');
      const n = Number(qty);
      if (oid && Number.isFinite(n) && n > 0) seeded[oid] = n;
    }
    return seeded;
  })();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  if (error || !chadhava) {
    return (
      <div className="section-container py-20 text-center text-text-secondary">
        {error || 'Chadhava not found.'} <Link href="/chadhava" className="text-primary-500 underline">Go back</Link>
      </div>
    );
  }

  return (
    <ChadhavaBookingSheet
      chadhavaId={id}
      chadhavaName={chadhava.mapped.name}
      chadhavaRaw={chadhava.raw as Parameters<typeof ChadhavaBookingSheet>[0]['chadhavaRaw']}
      initialOfferings={seededOfferings}
      open
      onClose={() => router.back()}
      fullPage
    />
  );
}
