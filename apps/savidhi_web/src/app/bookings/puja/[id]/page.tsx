'use client';

import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import { Loader2, Users, Ban } from 'lucide-react';
import { pujaBookingService } from '@/lib/services';
import { YourVideosCard } from '@/components/booking/YourVideosCard';
import { BookingTimeline, type TimelineStep } from '@/components/booking/BookingTimeline';
import { SupportActions } from '@/components/booking/SupportActions';
import type { SankalpTimestamp } from '@/components/booking/SankalpTimestamps';

const STAGE_ORDER = ['YET_TO_START', 'LIVE_ADDED', 'SHORT_VIDEO_ADDED', 'SANKALP_VIDEO_ADDED', 'TO_BE_SHIPPED', 'SHIPPED'];

function buildSteps(booking: any): TimelineStep[] {
  const stage = booking.event_stage ?? booking.stage ?? 'YET_TO_START';
  const stageIdx = STAGE_ORDER.indexOf(stage);
  const liveLink = booking.event_live_link ?? booking.live_link;
  return [
    {
      label: 'Booking Confirmed',
      subtitle: booking.created_at ? `Booked on ${new Date(booking.created_at).toLocaleDateString('en-IN')}` : undefined,
      completed: true,
    },
    {
      label: 'Live Puja Stream',
      subtitle: liveLink ? `Watch live: ${liveLink}` : 'Live link will be shared before puja',
      completed: stageIdx >= STAGE_ORDER.indexOf('LIVE_ADDED'),
    },
    {
      label: 'Puja Video',
      subtitle: 'Short puja video — see "Your Videos" above',
      completed: stageIdx >= STAGE_ORDER.indexOf('SHORT_VIDEO_ADDED'),
    },
    {
      label: 'Sankalp Video',
      subtitle: 'Sankalp video — see "Your Videos" above',
      completed: stageIdx >= STAGE_ORDER.indexOf('SANKALP_VIDEO_ADDED'),
    },
    {
      label: 'Prasad Dispatched',
      subtitle: booking.tracking_id ? `Tracking: ${booking.tracking_id}` : undefined,
      completed: stageIdx >= STAGE_ORDER.indexOf('TO_BE_SHIPPED'),
      isPrasadStep: true,
    },
    {
      label: 'Delivered',
      completed: stageIdx >= STAGE_ORDER.indexOf('SHIPPED'),
      isPrasadStep: true,
    },
  ];
}

function parseSankalpTimestamps(raw: any, devoteeName?: string): SankalpTimestamp[] {
  if (!raw) return [];
  // Array or object with devotees/timestamps array
  const list = Array.isArray(raw) ? raw : raw?.devotees ?? raw?.timestamps ?? null;
  if (Array.isArray(list)) {
    return list
      .filter((t: any) => t && (t.minute != null || t.second != null))
      .map((t: any) => ({
        name: String(t.name ?? devoteeName ?? 'Devotee'),
        gotra: t.gotra ? String(t.gotra) : undefined,
        minute: Number(t.minute ?? 0),
        second: Number(t.second ?? 0),
      }));
  }
  // "MM:SS" string stored per-booking by admin
  if (typeof raw === 'string' && raw.includes(':')) {
    const [m, s] = raw.split(':').map(Number);
    if (!isNaN(m) && !isNaN(s)) {
      return [{ name: devoteeName ?? 'Your name', minute: m, second: s }];
    }
  }
  return [];
}

export default function PujaStatusPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  // Subscription Phase C — Stop future bookings flow.
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  useEffect(() => {
    pujaBookingService.getById(id)
      .then((res) => setBooking(res.data?.data ?? res.data ?? null))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const handleStopSubscription = async () => {
    const remaining = booking?.subscription_remaining ?? 0;
    const confirmMsg = remaining > 0
      ? `Stop future bookings? The next ${remaining} auto-paid event${remaining > 1 ? 's' : ''} will be cancelled. Past bookings and charges remain — no refund.`
      : `Stop future bookings? Past bookings remain — no refund.`;
    if (!confirm(confirmMsg)) return;
    try {
      setCancelling(true);
      setCancelError(null);
      const res = await pujaBookingService.cancelRepeat(id);
      // Soft-warn if Razorpay mandate cancel failed server-side
      const mandate = res.data?.meta?.mandate_cancel_status;
      if (mandate === 'failed') {
        alert('Subscription stopped on Savidhi, but the bank mandate could not be cancelled at Razorpay. We will retry automatically. Contact support if you see any unexpected debit.');
      }
      // Refresh the booking so the button hides
      const fresh = await pujaBookingService.getById(id);
      setBooking(fresh.data?.data ?? fresh.data ?? null);
    } catch (err: any) {
      setCancelError(err?.response?.data?.message ?? err?.message ?? 'Failed to stop subscription');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="section-container py-20 text-center text-text-secondary">
        Booking not found. <Link href="/bookings/puja" className="text-primary-500 underline">Go back</Link>
      </div>
    );
  }

  const isCancelled = booking.status === 'CANCELLED' || booking.event_status === 'CANCELLED';
  const shortVideoUrl = booking.event_short_video_url ?? booking.short_video_url;
  const sankalpVideoUrl = booking.event_sankalp_video_url ?? booking.sankalp_video_url;
  const firstBookingDevoteeName =
    (Array.isArray(booking.devotees) && booking.devotees[0]?.name) || booking.devotee_name;
  const sankalpTimestamps = parseSankalpTimestamps(
    booking.event_sankalp_timestamps ?? booking.sankalp_timestamps ?? booking.sankalp_video_timestamp,
    firstBookingDevoteeName,
  );
  const hasPrasad = booking.event_has_prasad ?? booking.has_prasad ?? true;
  const pujaName = booking.puja_name ?? 'Puja';
  const templeName = booking.temple_name ?? '';
  const devotees: any[] = Array.isArray(booking.devotees) ? booking.devotees : [];
  const steps = buildSteps(booking);

  return (
    <div className="section-container py-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/bookings/puja" className="text-text-primary text-2xl leading-none">←</Link>
        <h1 className="text-xl font-bold text-text-primary">Puja Status</h1>
      </div>

      <div className="card p-4 mb-6">
        <h2 className="font-bold text-text-primary">{pujaName}</h2>
        <p className="text-sm text-text-secondary mt-1">{templeName}</p>
        <p className="text-xs text-text-muted mt-2">Booking ID: {String(booking.id ?? '').slice(0, 8)}</p>
      </div>

      {devotees.length > 0 && (
        <div className="bg-white border border-orange-100 rounded-xl p-4 mb-6 shadow-sm">
          <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" />
            Devotees ({devotees.length})
          </h3>
          <div className="space-y-1.5">
            {devotees.map((d, i) => (
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

      <YourVideosCard
        shortVideoUrl={shortVideoUrl}
        sankalpVideoUrl={sankalpVideoUrl}
        sankalpTimestamps={sankalpTimestamps}
      />

      {/* Subscription Phase C — Stop future bookings (only on active subs). */}
      {booking.booking_type === 'SUBSCRIPTION' && (booking.subscription_remaining ?? 0) > 0 && (
        <div className="bg-white border border-orange-100 rounded-xl p-4 mb-6 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-text-primary mb-1">Subscription Active</h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                {booking.subscription_remaining} future event{booking.subscription_remaining > 1 ? 's' : ''} will be auto-paid
                via your saved e-mandate. Stop anytime — past bookings stay active.
              </p>
              {cancelError && (
                <p className="text-xs text-red-600 mt-2">{cancelError}</p>
              )}
            </div>
            <button
              type="button"
              onClick={handleStopSubscription}
              disabled={cancelling}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-red-200 bg-red-50 text-red-700 text-xs font-semibold hover:bg-red-100 disabled:opacity-60 flex-shrink-0"
            >
              {cancelling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Ban className="w-3.5 h-3.5" />}
              {cancelling ? 'Stopping…' : 'Stop future bookings'}
            </button>
          </div>
        </div>
      )}

      {isCancelled && (
        <div className="bg-red-50 border border-red-100 rounded-xl p-4 mb-6 text-sm text-red-600">
          This booking has been cancelled. A refund (if applicable) will be processed.
        </div>
      )}

      {!isCancelled && (
        <div className="bg-white border border-orange-100 rounded-xl p-4 mb-6 shadow-sm">
          <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-4">Progress</h3>
          <BookingTimeline steps={steps} hasPrasad={hasPrasad} />
        </div>
      )}

      <SupportActions shareTitle={`My Puja Booking — ${pujaName}`} />
    </div>
  );
}
