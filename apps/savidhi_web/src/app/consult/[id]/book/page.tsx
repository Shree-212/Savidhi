'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Clock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
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
  const [astro, setAstro] = useState<{ id: string; name: string } | null>(null);
  const [durations, setDurations] = useState<DurationOption[]>([]);
  const [selected, setSelected] = useState<AppointmentDuration>('15min');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    astrologerService.getById(id)
      .then((res) => {
        const raw = res.data?.data ?? res.data;
        if (!raw) return;
        setAstro({ id: raw.id, name: raw.name });
        setDurations(
          DURATION_LABELS.map((d) => ({
            key: d.key,
            label: d.label,
            price: Number(raw[d.priceField] ?? 0),
          })),
        );
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  if (!astro) {
    return (
      <div className="section-container py-20 text-center text-text-secondary">
        Astrologer not found. <Link href="/consult" className="text-primary-500 underline">Go back</Link>
      </div>
    );
  }

  const price = durations.find((d) => d.key === selected)?.price ?? 0;

  return (
    <div className="min-h-screen bg-surface-warm">
      {/* Header */}
      <div className="bg-white border-b border-border-light sticky top-0 z-10">
        <div className="section-container flex items-center gap-4 py-3">
          <Link href={`/consult/${astro.id}`}>
            <ArrowLeft className="w-5 h-5 text-text-primary" />
          </Link>
          <h1 className="font-semibold text-text-primary">{astro.name}</h1>
        </div>
      </div>

      <div className="section-container py-8 max-w-xl mx-auto">
        <h2 className="font-semibold text-text-primary mb-6">Select Time Duration</h2>
        <div className="grid grid-cols-2 gap-4 mb-8">
          {durations.map((dur) => (
            <button
              key={dur.key}
              onClick={() => setSelected(dur.key)}
              className={`border rounded-xl p-5 text-center transition ${
                selected === dur.key
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-border-DEFAULT bg-white hover:border-primary-200'
              }`}
            >
              <Clock className={`w-7 h-7 mx-auto mb-2 ${selected === dur.key ? 'text-primary-500' : 'text-text-muted'}`} />
              <p className="text-sm font-semibold text-text-primary">{dur.label}</p>
              <p className={`text-sm font-bold mt-1 ${selected === dur.key ? 'text-primary-600' : 'text-text-secondary'}`}>
                ₹ {dur.price}
              </p>
            </button>
          ))}
        </div>

        <Button className="w-full" size="lg">
          Book For ₹{price}
        </Button>
      </div>
    </div>
  );
}
