'use client';

import { use } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, MapPin, Calendar, Share2, Play } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ExpandableSection } from '@/components/shared/ExpandableSection';
import { MOCK_PUJAS } from '@/data';

export default function PujaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const puja = MOCK_PUJAS.find((p) => p.id === id) || MOCK_PUJAS[0];

  return (
    <div className="min-h-screen bg-surface-warm">
      {/* Hero */}
      <div className="relative h-72 sm:h-96 w-full">
        <Image src={puja.imageUrl} alt={puja.name} fill className="object-cover" sizes="100vw" priority />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute top-4 left-4 right-4 flex justify-between">
          <Link href="/puja" className="w-9 h-9 bg-black/40 rounded-full flex items-center justify-center hover:bg-black/60 transition">
            <ArrowLeft className="w-5 h-5 text-white" />
          </Link>
          <button className="w-9 h-9 bg-black/40 rounded-full flex items-center justify-center hover:bg-black/60 transition">
            <Share2 className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      <div className="section-container py-6 max-w-3xl">
        <h1 className="text-2xl font-bold text-text-primary mb-2">{puja.name}</h1>
        <div className="flex items-center gap-1.5 text-sm text-text-secondary mb-1">
          <MapPin className="w-4 h-4 text-green-500" />
          {puja.templeName}, {puja.templeLocation}
        </div>
        <div className="flex items-center gap-4 text-sm text-text-secondary mb-6">
          <span className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4" />
            {puja.date}
          </span>
          <span className="bg-primary-50 text-primary-600 px-2 py-0.5 rounded-md text-xs font-medium">
            {puja.countdown}
          </span>
        </div>

        <ExpandableSection title="Benefits Of Puja" initiallyExpanded>
          {puja.benefits.map((b, i) => <p key={i}>• {b}</p>)}
        </ExpandableSection>

        <ExpandableSection title="Rituals Included">
          {puja.ritualsIncluded.map((r, i) => <p key={i}>• {r}</p>)}
        </ExpandableSection>

        <ExpandableSection title="How To Do Puja">
          {puja.howToDo.map((h, i) => <p key={i}>{i + 1}. {h}</p>)}
        </ExpandableSection>

        {/* Video */}
        <h3 className="font-semibold text-text-primary text-sm mb-2 mt-4">Video You Will Receive</h3>
        <div className="relative h-48 rounded-xl overflow-hidden mb-6">
          <Image src={puja.videoThumbnail} alt="Puja video" fill className="object-cover" sizes="100vw" />
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
            <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center">
              <Play className="w-6 h-6 text-primary-500 fill-primary-500" />
            </div>
          </div>
        </div>

        <ExpandableSection title="What's Inside Your Parcel">
          {puja.parcelContents.map((p, i) => <p key={i}>• {p}</p>)}
        </ExpandableSection>

        {/* Temple link */}
        <Link
          href={`/temples/${puja.templeId}`}
          className="flex items-center justify-between border border-border-DEFAULT rounded-xl px-4 py-3 mb-6 hover:bg-primary-50 transition"
        >
          <span className="text-sm font-medium text-text-primary">Importance Of {puja.templeName}</span>
          <span className="text-primary-500 text-sm">→</span>
        </Link>

        {/* CTA */}
        <div className="sticky bottom-0 bg-white border-t border-border-light py-4 -mx-4 px-4 sm:-mx-0 sm:px-0 sm:border-0 sm:bg-transparent sm:static">
          <Link href={`/puja/${puja.id}/book`}>
            <Button className="w-full" size="lg">
              Select Puja · ₹{puja.pricePerDevotee}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
