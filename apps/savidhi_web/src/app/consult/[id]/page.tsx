'use client';

import { use } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, Calendar, Globe } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ExpandableSection } from '@/components/shared/ExpandableSection';
import { MOCK_ASTROLOGERS } from '@/data';

export default function AstrologerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const astro = MOCK_ASTROLOGERS.find((a) => a.id === id) || MOCK_ASTROLOGERS[0];

  return (
    <div className="min-h-screen bg-surface-warm">
      {/* Hero */}
      <div className="relative h-72 sm:h-96 w-full">
        <Image src={astro.images[0]} alt={astro.name} fill className="object-cover" sizes="100vw" priority />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        <Link href="/consult" className="absolute top-4 left-4 w-9 h-9 bg-black/40 rounded-full flex items-center justify-center">
          <ArrowLeft className="w-5 h-5 text-white" />
        </Link>
      </div>

      <div className="section-container py-6 max-w-3xl">
        <h1 className="text-2xl font-bold text-text-primary mb-1">{astro.name}</h1>
        <p className="text-sm text-text-secondary mb-3">{astro.specialty} With {astro.experience}</p>
        <div className="flex flex-col gap-1.5 text-sm text-text-secondary mb-6">
          <span className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            {astro.appointmentsBooked} Appointments Booked
          </span>
          <span className="flex items-center gap-2">
            <Globe className="w-4 h-4" />
            {astro.languages.join(', ')}
          </span>
        </div>

        <ExpandableSection title="Expertise" initiallyExpanded>
          {astro.expertise.map((e, i) => <p key={i}>• {e}</p>)}
        </ExpandableSection>

        <ExpandableSection title="About" initiallyExpanded>
          <p>{astro.about}</p>
        </ExpandableSection>

        {/* CTA */}
        <div className="sticky bottom-0 bg-white border-t border-border-light py-4 -mx-4 px-4 sm:-mx-0 sm:px-0 sm:border-0 sm:bg-transparent sm:static mt-6">
          <Link href={`/consult/${astro.id}/book`}>
            <Button className="w-full" size="lg">Book Appointment</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
