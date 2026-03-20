'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Clock } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { MOCK_ASTROLOGERS, DURATION_OPTIONS } from '@/data';
import type { DurationOption } from '@/data';

export default function BookAppointmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const astro = MOCK_ASTROLOGERS.find((a) => a.id === id) || MOCK_ASTROLOGERS[0];
  const [selected, setSelected] = useState<DurationOption['key']>('15min');
  const price = DURATION_OPTIONS.find((d) => d.key === selected)?.price || 150;

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
          {DURATION_OPTIONS.map((dur) => (
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
