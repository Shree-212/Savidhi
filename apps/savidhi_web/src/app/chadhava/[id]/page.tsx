'use client';

import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, MapPin, Minus, Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ExpandableSection } from '@/components/shared/ExpandableSection';
import { ImageSlider } from '@/components/shared/ImageSlider';
import { chadhavaService } from '@/lib/services';
import { mapChadhava } from '@/lib/mappers';
import type { Chadhava } from '@/data/models';
import { normaliseMediaUrl } from '@/lib/utils';

export default function ChadhavaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [chadhava, setChadhava] = useState<Chadhava | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  useEffect(() => {
    chadhavaService.getById(id)
      .then((res) => {
        const raw = res.data?.data ?? res.data;
        if (raw) setChadhava(mapChadhava(raw));
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

  if (!chadhava) {
    return (
      <div className="section-container py-20 text-center text-text-secondary">
        Chadhava not found. <Link href="/chadhava" className="text-primary-500 underline">Go back</Link>
      </div>
    );
  }

  const total = chadhava.offerings.reduce((sum, off) => sum + (quantities[off.id] || 0) * off.price, 0);

  const updateQty = (offId: string, delta: number) => {
    setQuantities((prev) => ({ ...prev, [offId]: Math.max(0, (prev[offId] || 0) + delta) }));
  };

  // Pass selected offerings to the booking flow as a query param so the user
  // doesn't have to re-select on step 1. Format: "offeringId:qty,offeringId:qty"
  const selectedOfferingsParam = Object.entries(quantities)
    .filter(([, q]) => q > 0)
    .map(([id, q]) => `${id}:${q}`)
    .join(',');
  const bookHref = `/chadhava/${chadhava.slug || chadhava.id}/book${
    selectedOfferingsParam ? `?offerings=${selectedOfferingsParam}` : ''
  }`;

  return (
    <div className="min-h-screen bg-surface-warm">
      <div className="section-container max-w-6xl pt-3 sm:pt-6 pb-6 sm:pb-8">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-3 sm:mb-5">
          <Link
            href="/chadhava"
            className="inline-flex items-center gap-2 text-sm font-medium text-text-secondary hover:text-primary-500 transition group"
          >
            <span className="w-8 h-8 rounded-full bg-white border border-border-DEFAULT flex items-center justify-center group-hover:border-primary-300 group-hover:bg-primary-50 transition">
              <ArrowLeft className="w-4 h-4" />
            </span>
            <span className="hidden sm:inline">Back to Chadhava</span>
          </Link>
        </div>

        <div className="grid lg:grid-cols-[5fr_7fr] gap-4 sm:gap-6 lg:gap-10 lg:items-start">
          {/* LEFT — gallery + action card */}
          <div className="min-w-0 lg:sticky lg:top-4 space-y-5">
            <ImageSlider
              images={chadhava.sliderImages ?? (chadhava.imageUrl ? [chadhava.imageUrl] : [])}
              alt={chadhava.name}
            />

            <div className="hidden lg:block bg-white border border-orange-100 rounded-2xl p-5 shadow-[0_1px_2px_rgba(232,129,58,0.04)]">
              <div className="mb-4">
                <span className="text-[11px] text-text-muted uppercase tracking-wider font-semibold">
                  {total > 0 ? 'Your offering' : 'Starting from'}
                </span>
                <p className="text-3xl font-bold text-primary-600 leading-none mt-0.5">
                  ₹{total || chadhava.startingPrice}
                </p>
              </div>
              <Link href={bookHref}>
                <Button className="w-full" size="lg">
                  Offer For ₹{total || chadhava.startingPrice}
                </Button>
              </Link>
            </div>
          </div>

          {/* RIGHT — content (min-w-0 lets the grid track shrink to the
              column allotment instead of stretching past viewport on mobile) */}
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl lg:text-[2rem] font-bold text-text-primary leading-tight mb-2 sm:mb-3">
              {chadhava.name}
            </h1>

            {chadhava.templeName && (
              <div className="flex items-center gap-1.5 text-sm text-text-secondary mb-4 sm:mb-6">
                <MapPin className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span className="line-clamp-2">{chadhava.templeName}{chadhava.templeLocation ? `, ${chadhava.templeLocation}` : ''}</span>
              </div>
            )}

            <div className="space-y-3">
              {chadhava.benefits.length > 0 && (
                <ExpandableSection title="Benefits Of Chadhava" initiallyExpanded>
                  {chadhava.benefits.map((b, i) => <p key={i}>• {b}</p>)}
                </ExpandableSection>
              )}

              {chadhava.ritualsIncluded.length > 0 && (
                <ExpandableSection title="Rituals Included">
                  {chadhava.ritualsIncluded.map((r, i) => <p key={i}>• {r}</p>)}
                </ExpandableSection>
              )}
            </div>

            {/* Offerings */}
            {chadhava.offerings.length > 0 && (
              <>
                <h3 className="font-semibold text-text-primary text-sm sm:text-[15px] mb-3 mt-6">Select Offerings For Chadhava</h3>
                <div className="space-y-2.5">
                  {chadhava.offerings.map((off) => (
                    <div
                      key={off.id}
                      className="flex items-center bg-white border border-orange-100 rounded-xl px-3 sm:px-4 py-3 hover:border-primary-200 transition shadow-[0_1px_2px_rgba(232,129,58,0.04)]"
                    >
                      {off.imageUrl && (
                        <div className="relative w-11 h-11 rounded-lg overflow-hidden mr-3 shrink-0 ring-1 ring-orange-100">
                          <Image
                            src={normaliseMediaUrl(off.imageUrl)}
                            alt={off.name}
                            fill
                            className="object-cover"
                            unoptimized
                            sizes="44px"
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-text-primary text-sm leading-snug">{off.name}</p>
                        {off.description && (
                          <p className="text-xs text-text-muted truncate mt-0.5">{off.description}</p>
                        )}
                      </div>
                      <div className="flex flex-col items-end ml-3 shrink-0">
                        <span className="text-sm font-bold text-primary-600 mb-1.5">₹{off.price}</span>
                        {(quantities[off.id] || 0) > 0 ? (
                          <div className="flex items-center gap-1.5 bg-primary-50 rounded-full p-0.5">
                            <button
                              onClick={() => updateQty(off.id, -1)}
                              className="w-6 h-6 rounded-full bg-white border border-primary-200 flex items-center justify-center text-primary-500 hover:bg-primary-100 transition"
                              aria-label="Decrease quantity"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-5 text-center text-sm font-bold text-primary-700 tabular-nums">
                              {quantities[off.id]}
                            </span>
                            <button
                              onClick={() => updateQty(off.id, 1)}
                              className="w-6 h-6 rounded-full bg-white border border-primary-200 flex items-center justify-center text-primary-500 hover:bg-primary-100 transition"
                              aria-label="Increase quantity"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => updateQty(off.id, 1)}
                            className="text-xs font-semibold text-primary-600 border border-primary-300 rounded-lg px-3 py-1.5 hover:bg-primary-50 hover:border-primary-400 transition"
                          >
                            Add
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile sticky CTA */}
      <div className="lg:hidden sticky bottom-0 bg-white border-t border-orange-100 shadow-[0_-2px_12px_rgba(232,129,58,0.08)] z-20">
        <div className="section-container max-w-2xl flex items-center gap-3 py-3">
          <div className="flex flex-col leading-tight flex-shrink-0">
            <span className="text-[10px] text-text-muted uppercase font-semibold tracking-wider">
              {total > 0 ? 'Total' : 'From'}
            </span>
            <span className="text-xl font-bold text-primary-600 leading-none mt-0.5 tabular-nums">
              ₹{(total || chadhava.startingPrice).toLocaleString()}
            </span>
          </div>
          <Link href={bookHref} className="flex-1">
            <Button className="w-full" size="lg">Offer Now</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
