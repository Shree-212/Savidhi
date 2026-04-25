'use client';

import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Calendar, Globe, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ExpandableSection } from '@/components/shared/ExpandableSection';
import { ImageSlider } from '@/components/shared/ImageSlider';
import { astrologerService } from '@/lib/services';
import { mapAstrologer } from '@/lib/mappers';
import type { Astrologer } from '@/data/models';

export default function AstrologerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [astro, setAstro] = useState<Astrologer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    astrologerService.getById(id)
      .then((res) => {
        const raw = res.data?.data ?? res.data;
        if (raw) setAstro(mapAstrologer(raw));
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

  return (
    <div className="min-h-screen bg-surface-warm">
      <div className="section-container max-w-6xl pt-4 sm:pt-6 pb-6 sm:pb-8">
        <div className="flex items-center justify-between mb-5">
          <Link
            href="/consult"
            className="inline-flex items-center gap-2 text-sm font-medium text-text-secondary hover:text-primary-500 transition group"
          >
            <span className="w-8 h-8 rounded-full bg-white border border-border-DEFAULT flex items-center justify-center group-hover:border-primary-300 group-hover:bg-primary-50 transition">
              <ArrowLeft className="w-4 h-4" />
            </span>
            <span className="hidden sm:inline">Back to Astrologers</span>
          </Link>
        </div>

        <div className="grid lg:grid-cols-[5fr_7fr] gap-6 lg:gap-10 lg:items-start">
          {/* LEFT — gallery + book card */}
          <div className="lg:sticky lg:top-4 space-y-5">
            <ImageSlider
              images={astro.images?.length > 0 ? astro.images : (astro.imageUrl ? [astro.imageUrl] : [])}
              alt={astro.name}
            />

            <div className="hidden lg:block bg-white border border-orange-100 rounded-2xl p-5 shadow-[0_1px_2px_rgba(232,129,58,0.04)]">
              {astro.appointmentsBooked > 0 && (
                <p className="text-xs text-text-muted mb-3">
                  <span className="font-bold text-primary-600">{astro.appointmentsBooked}</span> appointments booked
                </p>
              )}
              <Link href={`/consult/${astro.slug || astro.id}/book`}>
                <Button className="w-full" size="lg">Book Appointment</Button>
              </Link>
            </div>
          </div>

          {/* RIGHT — content */}
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-[2rem] font-bold text-text-primary leading-tight mb-1.5">
              {astro.name}
            </h1>
            <p className="text-sm sm:text-[15px] text-text-secondary mb-4">
              {astro.specialty}
              {astro.experience ? <span className="text-text-muted"> · {astro.experience}</span> : null}
            </p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-text-secondary mb-6">
              {astro.appointmentsBooked > 0 && (
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-primary-500 flex-shrink-0" />
                  <span>{astro.appointmentsBooked} Appointments Booked</span>
                </span>
              )}
              {astro.languages?.length > 0 && (
                <span className="inline-flex items-center gap-1.5">
                  <Globe className="w-4 h-4 text-primary-500 flex-shrink-0" />
                  <span>{astro.languages.join(', ')}</span>
                </span>
              )}
            </div>

            <div className="space-y-3">
              {astro.expertise.length > 0 && (
                <ExpandableSection title="Expertise" initiallyExpanded>
                  {astro.expertise.map((e, i) => <p key={i}>• {e}</p>)}
                </ExpandableSection>
              )}

              {astro.about && (
                <ExpandableSection title="About" initiallyExpanded>
                  <p>{astro.about}</p>
                </ExpandableSection>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile sticky CTA */}
      <div className="lg:hidden sticky bottom-0 bg-white/95 backdrop-blur-sm border-t border-border-light py-3 px-4 z-20">
        <Link href={`/consult/${astro.slug || astro.id}/book`}>
          <Button className="w-full" size="lg">Book Appointment</Button>
        </Link>
      </div>
    </div>
  );
}
