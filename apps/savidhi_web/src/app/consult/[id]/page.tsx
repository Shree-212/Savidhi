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
      {/* Hero slider — profile_pic + slider_images */}
      <div className="relative h-72 sm:h-96 w-full">
        <ImageSlider
          images={astro.images?.length > 0 ? astro.images : (astro.imageUrl ? [astro.imageUrl] : [])}
          alt={astro.name}
          className="h-72 sm:h-96 w-full"
        />
        <div className="absolute top-4 left-4 z-10">
          <Link href="/consult" className="w-9 h-9 bg-black/40 rounded-full flex items-center justify-center">
            <ArrowLeft className="w-5 h-5 text-white" />
          </Link>
        </div>
      </div>

      <div className="section-container py-6 max-w-3xl">
        <h1 className="text-2xl font-bold text-text-primary mb-1">{astro.name}</h1>
        <p className="text-sm text-text-secondary mb-3">{astro.specialty}{astro.experience ? ` · ${astro.experience}` : ''}</p>
        <div className="flex flex-col gap-1.5 text-sm text-text-secondary mb-6">
          {astro.appointmentsBooked > 0 && (
            <span className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {astro.appointmentsBooked} Appointments Booked
            </span>
          )}
          {astro.languages?.length > 0 && (
            <span className="flex items-center gap-2">
              <Globe className="w-4 h-4" />
              {astro.languages.join(', ')}
            </span>
          )}
        </div>

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

        <div className="sticky bottom-0 bg-white border-t border-border-light py-4 -mx-4 px-4 sm:-mx-0 sm:px-0 sm:border-0 sm:bg-transparent sm:static mt-6">
          <Link href={`/consult/${astro.id}/book`}>
            <Button className="w-full" size="lg">Book Appointment</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
