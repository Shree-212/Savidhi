'use client';

import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Phone, Share2, Play, Loader2, Users } from 'lucide-react';
import { pujaBookingService } from '@/lib/services';
import { normaliseMediaUrl } from '@/lib/utils';
import { VideoPlayer } from '@/components/shared/VideoPlayer';
import type { PujaStatusDetail, PujaStatusStep } from '@/data/models';

const STAGE_ORDER = ['YET_TO_START', 'LIVE_ADDED', 'SHORT_VIDEO_ADDED', 'SANKALP_VIDEO_ADDED', 'TO_BE_SHIPPED', 'SHIPPED'];

function buildSteps(booking: any): PujaStatusStep[] {
  const stageIdx = STAGE_ORDER.indexOf(booking.stage ?? 'YET_TO_START');
  return [
    {
      label: 'Booking Confirmed',
      subtitle: booking.created_at ? `Booked on ${new Date(booking.created_at).toLocaleDateString('en-IN')}` : undefined,
      completed: true,
    },
    {
      label: 'Live Puja Stream',
      subtitle: booking.live_link ? `Watch live: ${booking.live_link}` : 'Live link will be shared before puja',
      completed: stageIdx >= STAGE_ORDER.indexOf('LIVE_ADDED'),
      videoThumbnail: booking.live_thumbnail ?? '',
    },
    {
      label: 'Puja Video',
      subtitle: booking.short_video_url ? 'Short puja video available' : 'Video will be shared after puja',
      completed: stageIdx >= STAGE_ORDER.indexOf('SHORT_VIDEO_ADDED'),
      videoSrc: booking.short_video_url ?? '',
    },
    {
      label: 'Sankalp Video',
      subtitle: booking.sankalp_video_url ? 'Your sankalp video is ready' : 'Personalized sankalp video',
      completed: stageIdx >= STAGE_ORDER.indexOf('SANKALP_VIDEO_ADDED'),
      videoSrc: booking.sankalp_video_url ?? '',
    },
    {
      label: 'Prasad Dispatched',
      subtitle: booking.tracking_id ? `Tracking: ${booking.tracking_id}` : undefined,
      completed: stageIdx >= STAGE_ORDER.indexOf('TO_BE_SHIPPED'),
    },
    {
      label: 'Delivered',
      completed: stageIdx >= STAGE_ORDER.indexOf('SHIPPED'),
    },
  ];
}

export default function PujaStatusPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [status, setStatus] = useState<PujaStatusDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    pujaBookingService.getById(id)
      .then((res) => {
        const b = res.data?.data ?? res.data;
        if (b) {
          setStatus({
            bookingId: b.id,
            pujaName: b.puja_name ?? 'Puja',
            templeName: b.temple_name ?? '',
            pujaId: b.puja_event_id ?? '',
            devotees: Array.isArray(b.devotees)
              ? b.devotees.map((d: any) => ({ name: d.name, gotra: d.gotra, relation: d.relation }))
              : [],
            steps: buildSteps(b),
          });
        }
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

  if (!status) {
    return (
      <div className="section-container py-20 text-center text-text-secondary">
        Booking not found. <Link href="/bookings/puja" className="text-primary-500 underline">Go back</Link>
      </div>
    );
  }

  return (
    <div className="section-container py-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/bookings/puja">
          <ArrowLeft className="w-5 h-5 text-text-primary" />
        </Link>
        <h1 className="text-xl font-bold text-text-primary">Puja Status</h1>
      </div>

      <div className="card p-4 mb-6">
        <h2 className="font-bold text-text-primary">{status.pujaName}</h2>
        <p className="text-sm text-text-secondary mt-1">{status.templeName}</p>
        <p className="text-xs text-text-muted mt-2">Booking ID: {status.bookingId.slice(0, 8)}</p>
      </div>

      {status.devotees && status.devotees.length > 0 && (
        <div className="bg-white border border-orange-100 rounded-xl p-4 mb-6 shadow-sm">
          <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" />
            Devotees ({status.devotees.length})
          </h3>
          <div className="space-y-1.5">
            {status.devotees.map((d, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-text-primary">
                  {d.name}
                  {d.relation && <span className="text-xs text-text-muted ml-2">({d.relation})</span>}
                </span>
                {d.gotra && <span className="text-xs text-text-muted">Gotra: {d.gotra}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="relative pl-8">
        {status.steps.map((step, idx) => {
          const isLast = idx === status.steps.length - 1;
          return (
            <div key={idx} className="relative pb-8 last:pb-0">
              {!isLast && (
                <div className={`absolute left-[-20px] top-3 w-0.5 h-full ${step.completed ? 'bg-primary-500' : 'bg-border-DEFAULT'}`} />
              )}
              <div className={`absolute left-[-24px] top-1 w-2.5 h-2.5 rounded-full border-2 ${step.completed ? 'bg-primary-500 border-primary-500' : 'bg-white border-border-DEFAULT'}`} />
              <div>
                <p className={`font-semibold text-sm ${step.completed ? 'text-text-primary' : 'text-text-muted'}`}>{step.label}</p>
                {step.subtitle && <p className="text-xs text-text-secondary mt-1 whitespace-pre-line">{step.subtitle}</p>}
                {step.details && step.details.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {step.details.map((d, i) => (
                      <p key={i} className="text-xs text-text-secondary whitespace-pre-line bg-surface-warm p-2 rounded">{d}</p>
                    ))}
                  </div>
                )}
                {step.videoSrc ? (
                  <div className="mt-2 w-48 sm:w-64">
                    <VideoPlayer
                      src={normaliseMediaUrl(step.videoSrc)}
                      className="relative h-28 sm:h-36 rounded-lg overflow-hidden bg-black ring-1 ring-black/10"
                    />
                  </div>
                ) : step.videoThumbnail && (
                  <div className="mt-2 relative w-48 h-28 rounded-lg overflow-hidden group cursor-pointer">
                    <Image src={normaliseMediaUrl(step.videoThumbnail)} alt="Video" fill className="object-cover" unoptimized />
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
