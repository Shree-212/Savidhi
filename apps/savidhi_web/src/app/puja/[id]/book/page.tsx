'use client';

// Backward-compatibility wrapper. The booking experience lives in the
// `BookingSheet` component and is normally opened as an in-page sheet from
// `/puja/[id]`. This route still exists so existing CTAs / emails / external
// links continue to work — it just renders the same component in `fullPage`
// mode and closes by navigating back.

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { BookingSheet } from '@/components/shared/BookingSheet';
import { pujaService } from '@/lib/services';
import { mapPuja } from '@/lib/mappers';

export default function PujaBookingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [puja, setPuja] = useState<{ mapped: { name: string; slug?: string }; raw: Record<string, unknown> } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError('');
        const res = await pujaService.getById(id);
        if (cancelled) return;
        const raw = res.data?.data ?? res.data;
        if (raw) setPuja({ mapped: mapPuja(raw), raw });
      } catch (err) {
        const e = err as { response?: { data?: { message?: string } }; message?: string };
        if (!cancelled) setError(e.response?.data?.message || e.message || 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  if (error || !puja) {
    return (
      <div className="section-container py-20 text-center text-text-secondary">
        {error || 'Puja not found.'} <Link href="/puja" className="text-primary-500 underline">Go back</Link>
      </div>
    );
  }

  return (
    <BookingSheet
      pujaId={id}
      pujaName={puja.mapped.name}
      // Cast: BookingSheet only reads the booking-mode / pricing fields we forward here.
      pujaRaw={puja.raw as Parameters<typeof BookingSheet>[0]['pujaRaw']}
      open
      onClose={() => router.back()}
      fullPage
    />
  );
}
