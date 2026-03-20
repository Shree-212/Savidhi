'use client';

import { use, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, MapPin, Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ExpandableSection } from '@/components/shared/ExpandableSection';
import { MOCK_CHADHAVAS } from '@/data';

export default function ChadhavaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const chadhava = MOCK_CHADHAVAS.find((c) => c.id === id) || MOCK_CHADHAVAS[0];
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const total = chadhava.offerings.reduce((sum, off) => sum + (quantities[off.id] || 0) * off.price, 0);

  const updateQty = (offId: string, delta: number) => {
    setQuantities((prev) => ({ ...prev, [offId]: Math.max(0, (prev[offId] || 0) + delta) }));
  };

  return (
    <div className="min-h-screen bg-surface-warm">
      {/* Hero */}
      <div className="relative h-64 sm:h-80 w-full">
        <Image src={chadhava.imageUrl} alt={chadhava.name} fill className="object-cover" sizes="100vw" priority />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        <Link href="/chadhava" className="absolute top-4 left-4 w-9 h-9 bg-black/40 rounded-full flex items-center justify-center">
          <ArrowLeft className="w-5 h-5 text-white" />
        </Link>
      </div>

      <div className="section-container py-6 max-w-3xl">
        <h1 className="text-2xl font-bold text-text-primary mb-2">{chadhava.name}</h1>
        <div className="flex items-center gap-1.5 text-sm text-text-secondary mb-6">
          <MapPin className="w-4 h-4 text-green-500" />
          {chadhava.templeName}, {chadhava.templeLocation}
        </div>

        <ExpandableSection title="Benefits Of Chadhava" initiallyExpanded>
          {chadhava.benefits.map((b, i) => <p key={i}>• {b}</p>)}
        </ExpandableSection>

        <ExpandableSection title="Rituals Included">
          {chadhava.ritualsIncluded.map((r, i) => <p key={i}>• {r}</p>)}
        </ExpandableSection>

        {/* Offerings */}
        <h3 className="font-semibold text-text-primary text-sm mb-3 mt-4">Select Offerings For Chadhava</h3>
        <div className="space-y-3 mb-6">
          {chadhava.offerings.map((off) => (
            <div key={off.id} className="flex items-center border border-border-DEFAULT rounded-xl px-4 py-3 bg-white">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-text-primary text-sm">{off.name}</p>
                <p className="text-xs text-text-secondary truncate">{off.description}</p>
              </div>
              <div className="flex flex-col items-center ml-4 shrink-0">
                <span className="text-sm font-bold text-primary-600 mb-1">₹{off.price}</span>
                {(quantities[off.id] || 0) > 0 ? (
                  <div className="flex items-center gap-2">
                    <button onClick={() => updateQty(off.id, -1)} className="w-7 h-7 rounded-full border border-primary-300 flex items-center justify-center text-primary-500 hover:bg-primary-50">
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-5 text-center text-sm font-semibold">{quantities[off.id]}</span>
                    <button onClick={() => updateQty(off.id, 1)} className="w-7 h-7 rounded-full border border-primary-300 flex items-center justify-center text-primary-500 hover:bg-primary-50">
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => updateQty(off.id, 1)}
                    className="text-xs font-semibold text-primary-500 border border-primary-400 rounded-lg px-3 py-1 hover:bg-primary-50 transition"
                  >
                    Add
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="sticky bottom-0 bg-white border-t border-border-light py-4 -mx-4 px-4 sm:-mx-0 sm:px-0 sm:border-0 sm:bg-transparent sm:static">
          <Button className="w-full" size="lg">
            Offer For ₹{total || chadhava.startingPrice}
          </Button>
        </div>
      </div>
    </div>
  );
}
