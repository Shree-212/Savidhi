'use client';

import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, MapPin, Loader2 } from 'lucide-react';
import { ExpandableSection } from '@/components/shared/ExpandableSection';
import { ImageSlider } from '@/components/shared/ImageSlider';
import { VideoPlayer } from '@/components/shared/VideoPlayer';
import { templeService } from '@/lib/services';
import { mapTemple } from '@/lib/mappers';
import type { Temple } from '@/data/models';
import { normaliseMediaUrl } from '@/lib/utils';

export default function TempleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [temple, setTemple] = useState<Temple | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    templeService.getById(id)
      .then((res) => {
        const raw = res.data?.data ?? res.data;
        if (raw) setTemple(mapTemple(raw));
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

  if (!temple) {
    return (
      <div className="section-container py-20 text-center text-text-secondary">
        Temple not found. <Link href="/temples" className="text-primary-500 underline">Go back</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-warm">
      <div className="section-container max-w-6xl pt-4 sm:pt-6 pb-6 sm:pb-8">
        <div className="flex items-center justify-between mb-5">
          <Link
            href="/temples"
            className="inline-flex items-center gap-2 text-sm font-medium text-text-secondary hover:text-primary-500 transition group"
          >
            <span className="w-8 h-8 rounded-full bg-white border border-border-DEFAULT flex items-center justify-center group-hover:border-primary-300 group-hover:bg-primary-50 transition">
              <ArrowLeft className="w-4 h-4" />
            </span>
            <span className="hidden sm:inline">Back to Temples</span>
          </Link>
        </div>

        <div className="grid lg:grid-cols-[5fr_7fr] gap-6 lg:gap-10 lg:items-start">
          {/* LEFT — gallery + stats card */}
          <div className="lg:sticky lg:top-4 space-y-5">
            <ImageSlider images={temple.images} alt={temple.name} />

            {Number(temple.pujaCount) > 0 && (
              <div className="hidden lg:block rounded-2xl border border-orange-100 bg-gradient-to-br from-orange-50 to-amber-50/50 p-6 shadow-sm">
                <p className="text-4xl font-bold text-primary-500 italic tracking-tight leading-none">
                  {temple.pujaCount}+
                </p>
                <p className="font-bold text-text-primary mt-2">Puja Done</p>
                <p className="text-xs text-text-secondary mt-0.5">At {temple.name} By Savidhi</p>
              </div>
            )}
          </div>

          {/* RIGHT — content */}
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-[2rem] font-bold text-text-primary leading-tight mb-3">
              {temple.name}
            </h1>
            <div className="flex items-center gap-1.5 text-sm text-text-secondary mb-6">
              <MapPin className="w-4 h-4 text-green-500 flex-shrink-0" />
              <span>{temple.location}{temple.pincode ? `, ${temple.pincode}` : ''}</span>
            </div>

            <div className="space-y-3">
              {temple.about && (
                <ExpandableSection title="About Temple" initiallyExpanded>
                  <p>{temple.about}</p>
                </ExpandableSection>
              )}

              {temple.history && (
                <ExpandableSection title="History & Significance">
                  <p>{temple.history}</p>
                </ExpandableSection>
              )}
            </div>

            {temple.videoThumbnail && (
              <div className="mt-6">
                <h3 className="font-semibold text-text-primary text-sm sm:text-[15px] mb-2.5">Our Past Puja Video Here</h3>
                <VideoPlayer src={temple.videoThumbnail} />
              </div>
            )}

            {/* Mobile-only stats card (desktop has it on the left) */}
            {Number(temple.pujaCount) > 0 && (
              <div className="lg:hidden mt-6 rounded-2xl border border-orange-100 bg-gradient-to-br from-orange-50 to-amber-50/50 p-6 shadow-sm text-center">
                <p className="text-4xl font-bold text-primary-500 italic tracking-tight leading-none">
                  {temple.pujaCount}+
                </p>
                <p className="font-bold text-text-primary mt-2">Puja Done</p>
                <p className="text-xs text-text-secondary mt-0.5">At {temple.name} By Savidhi</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
