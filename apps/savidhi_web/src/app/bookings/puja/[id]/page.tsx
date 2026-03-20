'use client';

import { use } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Phone, Share2, Play } from 'lucide-react';
import { MOCK_PUJA_STATUS } from '@/data';

export default function PujaStatusPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const status = MOCK_PUJA_STATUS; // In real app, fetch by id

  return (
    <div className="section-container py-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/bookings/puja">
          <ArrowLeft className="w-5 h-5 text-text-primary" />
        </Link>
        <h1 className="text-xl font-bold text-text-primary">Puja Status</h1>
      </div>

      {/* Booking Info Card */}
      <div className="card p-4 mb-6">
        <h2 className="font-bold text-text-primary">{status.pujaName}</h2>
        <p className="text-sm text-text-secondary mt-1">{status.templeName}</p>
        <p className="text-xs text-text-muted mt-2">Booking ID: {status.bookingId}</p>
      </div>

      {/* Timeline */}
      <div className="relative pl-8">
        {status.steps.map((step, idx) => {
          const isLast = idx === status.steps.length - 1;
          return (
            <div key={idx} className="relative pb-8 last:pb-0">
              {/* Vertical Line */}
              {!isLast && (
                <div
                  className={`absolute left-[-20px] top-3 w-0.5 h-full ${
                    step.completed ? 'bg-primary-500' : 'bg-border-DEFAULT'
                  }`}
                />
              )}

              {/* Dot */}
              <div
                className={`absolute left-[-24px] top-1 w-2.5 h-2.5 rounded-full border-2 ${
                  step.completed
                    ? 'bg-primary-500 border-primary-500'
                    : 'bg-white border-border-DEFAULT'
                }`}
              />

              {/* Content */}
              <div>
                <p className={`font-semibold text-sm ${step.completed ? 'text-text-primary' : 'text-text-muted'}`}>
                  {step.label}
                </p>

                {step.subtitle && (
                  <p className="text-xs text-text-secondary mt-1 whitespace-pre-line">
                    {step.subtitle}
                  </p>
                )}

                {step.details && step.details.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {step.details.map((d, i) => (
                      <p key={i} className="text-xs text-text-secondary whitespace-pre-line bg-surface-warm p-2 rounded">
                        {d}
                      </p>
                    ))}
                  </div>
                )}

                {step.videoThumbnail && (
                  <div className="mt-2 relative w-48 h-28 rounded-lg overflow-hidden group cursor-pointer">
                    <Image
                      src={step.videoThumbnail}
                      alt="Video"
                      fill
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center group-hover:bg-black/40 transition">
                      <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                        <Play className="w-4 h-4 text-primary-500 ml-0.5" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 mt-8">
        <button className="flex-1 btn-outline flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium">
          <Phone className="w-4 h-4" />
          Call Support
        </button>
        <button className="flex-1 btn-outline flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium">
          <Share2 className="w-4 h-4" />
          Share Status
        </button>
      </div>
    </div>
  );
}
