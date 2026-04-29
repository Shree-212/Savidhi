'use client';

import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, MapPin, Calendar, Share2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ExpandableSection } from '@/components/shared/ExpandableSection';
import { ImageSlider } from '@/components/shared/ImageSlider';
import { VideoPlayer } from '@/components/shared/VideoPlayer';
import { pujaService } from '@/lib/services';
import { mapPuja } from '@/lib/mappers';
import type { Puja } from '@/data/models';

export default function PujaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [puja, setPuja] = useState<Puja | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    pujaService.getById(id)
      .then((res) => {
        const raw = res.data?.data ?? res.data;
        if (raw) setPuja(mapPuja(raw));
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

  if (!puja) {
    return (
      <div className="section-container py-20 text-center text-text-secondary">
        Puja not found. <Link href="/puja" className="text-primary-500 underline">Go back</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-warm">
      <div className="section-container max-w-6xl pt-3 sm:pt-6 pb-6 sm:pb-8">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-3 sm:mb-5">
          <Link
            href="/puja"
            className="inline-flex items-center gap-2 text-sm font-medium text-text-secondary hover:text-primary-500 transition group"
          >
            <span className="w-8 h-8 rounded-full bg-white border border-border-DEFAULT flex items-center justify-center group-hover:border-primary-300 group-hover:bg-primary-50 transition">
              <ArrowLeft className="w-4 h-4" />
            </span>
            <span className="hidden sm:inline">Back to Pujas</span>
          </Link>
          <button
            className="w-9 h-9 rounded-full bg-white border border-border-DEFAULT flex items-center justify-center text-text-secondary hover:border-primary-300 hover:bg-primary-50 hover:text-primary-500 transition"
            aria-label="Share"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>

        {/* Two-column layout (lg+): gallery+CTA left (sticky), content right */}
        <div className="grid lg:grid-cols-[5fr_7fr] gap-4 sm:gap-6 lg:gap-10 lg:items-start">
          {/* LEFT — gallery + action card */}
          <div className="min-w-0 lg:sticky lg:top-4 space-y-5">
            <ImageSlider
              images={puja.sliderImages ?? (puja.imageUrl ? [puja.imageUrl] : [])}
              alt={puja.name}
            />

            {/* Action card — desktop only */}
            <div className="hidden lg:block bg-white border border-orange-100 rounded-2xl p-5 shadow-[0_1px_2px_rgba(232,129,58,0.04)]">
              {puja.countdown && (
                <span className="inline-flex items-center bg-primary-100 text-primary-700 px-2.5 py-0.5 rounded-full text-xs font-semibold mb-3">
                  {puja.countdown}
                </span>
              )}
              {puja.pricePerDevotee && (
                <div className="mb-4">
                  <span className="text-[11px] text-text-muted uppercase tracking-wider font-semibold">Starting from</span>
                  <p className="text-3xl font-bold text-primary-600 leading-none mt-0.5">
                    ₹{puja.pricePerDevotee}
                    <span className="text-sm text-text-muted font-medium ml-1.5">per devotee</span>
                  </p>
                </div>
              )}
              <Link href={`/puja/${puja.slug || puja.id}/book`}>
                <Button className="w-full" size="lg">
                  Select Puja
                </Button>
              </Link>
            </div>
          </div>

          {/* RIGHT — content (min-w-0 lets the grid track shrink to the
              column allotment instead of stretching past viewport on mobile) */}
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl lg:text-[2rem] font-bold text-text-primary leading-tight mb-3">
              {puja.name}
            </h1>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mb-6">
              {puja.templeName && (
                <span className="inline-flex items-center gap-1.5 text-sm text-text-secondary">
                  <MapPin className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span>{puja.templeName}{puja.templeLocation ? `, ${puja.templeLocation}` : ''}</span>
                </span>
              )}
              {puja.date && (
                <span className="inline-flex items-center gap-1.5 text-sm text-text-secondary">
                  <Calendar className="w-4 h-4 text-primary-500 flex-shrink-0" />
                  <span>{puja.date}{puja.time ? `, ${puja.time}` : ''}</span>
                </span>
              )}
              <span className="inline-flex lg:hidden items-center bg-primary-100 text-primary-700 px-2.5 py-0.5 rounded-full text-xs font-semibold">
                {puja.countdown}
              </span>
            </div>

            <div className="space-y-3">
              {puja.benefits.length > 0 && (
                <ExpandableSection title="Benefits Of Puja" initiallyExpanded>
                  {puja.benefits.map((b, i) => <p key={i}>• {b}</p>)}
                </ExpandableSection>
              )}

              {puja.ritualsIncluded.length > 0 && (
                <ExpandableSection title="Rituals Included">
                  {puja.ritualsIncluded.map((r, i) => <p key={i}>• {r}</p>)}
                </ExpandableSection>
              )}

              {puja.howToDo.length > 0 && (
                <ExpandableSection title="How To Do Puja">
                  {puja.howToDo.map((h, i) => <p key={i}>{i + 1}. {h}</p>)}
                </ExpandableSection>
              )}

              {puja.parcelContents.length > 0 && (
                <ExpandableSection title="What's Inside Your Parcel">
                  {puja.parcelContents.map((p, i) => <p key={i}>• {p}</p>)}
                </ExpandableSection>
              )}
            </div>

            {puja.videoThumbnail && (
              <div className="mt-6">
                <h3 className="font-semibold text-text-primary text-sm sm:text-[15px] mb-2.5">Video You Will Receive</h3>
                <VideoPlayer src={puja.videoThumbnail} />
              </div>
            )}

            {puja.templeId && (
              <Link
                href={`/temples/${puja.templeId}`}
                className="flex items-center justify-between gap-3 bg-white border border-orange-100 rounded-xl px-4 sm:px-5 py-3.5 mt-6 hover:border-primary-300 hover:bg-orange-50/50 transition-all shadow-[0_1px_2px_rgba(232,129,58,0.04)] hover:shadow-md"
              >
                <span className="flex-1 min-w-0 text-sm sm:text-[15px] font-semibold text-text-primary leading-snug break-words">
                  Importance Of {puja.templeName}
                </span>
                <span className="text-primary-500 text-lg leading-none flex-shrink-0">→</span>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Mobile sticky CTA */}
      <div className="lg:hidden sticky bottom-0 bg-white border-t border-orange-100 shadow-[0_-2px_12px_rgba(232,129,58,0.08)] z-20">
        <div className="section-container max-w-2xl flex items-center gap-3 py-3">
          {puja.pricePerDevotee && (
            <div className="flex flex-col leading-tight flex-shrink-0">
              <span className="text-[10px] text-text-muted uppercase font-semibold tracking-wider">From</span>
              <span className="text-xl font-bold text-primary-600 leading-none mt-0.5 tabular-nums">
                ₹{puja.pricePerDevotee.toLocaleString()}
              </span>
            </div>
          )}
          <Link href={`/puja/${puja.slug || puja.id}/book`} className="flex-1">
            <Button className="w-full" size="lg">Select Puja</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
