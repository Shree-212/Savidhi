'use client';

import { use } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, MapPin, Play, User } from 'lucide-react';
import { ExpandableSection } from '@/components/shared/ExpandableSection';
import { MOCK_TEMPLES } from '@/data';

export default function TempleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const temple = MOCK_TEMPLES.find((t) => t.id === id) || MOCK_TEMPLES[0];

  return (
    <div className="min-h-screen bg-surface-warm">
      {/* Hero */}
      <div className="relative h-72 sm:h-96 w-full">
        <Image src={temple.images?.[0] || '/images/placeholder.jpg'} alt={temple.name} fill className="object-cover" sizes="100vw" priority />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        <Link href="/temples" className="absolute top-4 left-4 w-9 h-9 bg-black/40 rounded-full flex items-center justify-center">
          <ArrowLeft className="w-5 h-5 text-white" />
        </Link>
      </div>

      <div className="section-container py-6 max-w-3xl">
        <h1 className="text-2xl font-bold text-text-primary mb-2">{temple.name}</h1>
        <div className="flex items-center gap-1.5 text-sm text-text-secondary mb-6">
          <MapPin className="w-4 h-4 text-green-500" />
          {temple.location}, {temple.pincode}
        </div>

        {/* Pujaris */}
        <ExpandableSection title="Registered Pujari Here" initiallyExpanded>
          <div className="flex gap-4 flex-wrap">
            {temple.pujaris.map((p) => (
              <div key={p.id} className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-border-light flex items-center justify-center mb-1">
                  <User className="w-5 h-5 text-text-muted" />
                </div>
                <span className="text-xs font-medium text-text-primary">{p.name}</span>
                <span className="text-[10px] text-primary-500">{p.role}</span>
              </div>
            ))}
          </div>
        </ExpandableSection>

        <ExpandableSection title="About Temple" initiallyExpanded>
          <p>{temple.about}</p>
        </ExpandableSection>

        <ExpandableSection title="History & Significance">
          <p>{temple.history}</p>
        </ExpandableSection>

        {/* Video */}
        <h3 className="font-semibold text-text-primary text-sm mb-2 mt-4">Our Past Puja Video Here</h3>
        <div className="relative h-48 rounded-xl overflow-hidden mb-6">
          <Image src={temple.videoThumbnail} alt="Temple puja video" fill className="object-cover" sizes="100vw" />
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
            <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center">
              <Play className="w-6 h-6 text-primary-500 fill-primary-500" />
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="text-center py-8 border border-border-DEFAULT rounded-xl bg-white">
          <p className="text-4xl font-bold text-primary-500 italic">{temple.pujaCount}+</p>
          <p className="font-semibold text-text-primary mt-1">Puja Done</p>
          <p className="text-xs text-text-secondary">At {temple.name} By Savidhi</p>
        </div>
      </div>
    </div>
  );
}
