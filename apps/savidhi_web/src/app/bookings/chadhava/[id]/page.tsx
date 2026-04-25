'use client';

import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Calendar, Gift, MapPin, Package, Phone, Share2, Loader2, Users } from 'lucide-react';
import { chadhavaBookingService } from '@/lib/services';
import { StatusBadge } from '@/components/shared/StatusBadge';
import type { ChadhavaBookingStatus } from '@/data/models';

const STATUS_ORDER = [
  'CONFIRMED', 'PENDING',
  'INPROGRESS', 'LIVE_ADDED', 'SHORT_VIDEO_ADDED', 'SANKALP_VIDEO_ADDED',
  'TO_BE_SHIPPED', 'SHIPPED', 'COMPLETED',
];

function statusIndex(s: string) {
  const idx = STATUS_ORDER.indexOf(s);
  return idx === -1 ? 0 : idx;
}

function mapDisplayStatus(s: string): ChadhavaBookingStatus {
  const map: Record<string, ChadhavaBookingStatus> = {
    CONFIRMED: 'YET_TO_START', PENDING: 'YET_TO_START',
    INPROGRESS: 'ONGOING', LIVE_ADDED: 'ONGOING',
    SHORT_VIDEO_ADDED: 'ONGOING', SANKALP_VIDEO_ADDED: 'ONGOING',
    TO_BE_SHIPPED: 'PRASAD_SHIPPED', SHIPPED: 'PRASAD_SHIPPED',
    COMPLETED: 'COMPLETE', CANCELLED: 'CANCELLED',
  };
  return map[s] ?? 'YET_TO_START';
}

interface Step {
  label: string;
  subtitle?: string;
  completed: boolean;
}

function buildSteps(booking: any): Step[] {
  const si = statusIndex(booking.status ?? 'PENDING');
  return [
    {
      label: 'Booking Confirmed',
      subtitle: booking.created_at
        ? `Booked on ${new Date(booking.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`
        : undefined,
      completed: true,
    },
    {
      label: 'Chadhava In Progress',
      subtitle: 'Your chadhava is being performed at the temple',
      completed: si >= statusIndex('INPROGRESS'),
    },
    {
      label: 'Prasad Being Prepared',
      subtitle: 'Prasad from the offering is being packed for you',
      completed: si >= statusIndex('TO_BE_SHIPPED'),
    },
    {
      label: 'Prasad Dispatched',
      subtitle: booking.tracking_id ? `Tracking ID: ${booking.tracking_id}` : 'Will be shipped to your address',
      completed: si >= statusIndex('SHIPPED'),
    },
    {
      label: 'Completed',
      subtitle: 'Your chadhava has been completed',
      completed: si >= statusIndex('COMPLETED'),
    },
  ];
}

export default function ChadhavaStatusPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    chadhavaBookingService
      .getById(id)
      .then((res) => {
        const b = res.data?.data ?? res.data;
        setBooking(b ?? null);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load booking'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="section-container py-20 text-center text-text-secondary">
        {error ?? 'Booking not found.'}{' '}
        <Link href="/bookings/chadhava" className="text-primary-500 underline">
          Go back
        </Link>
      </div>
    );
  }

  const steps = buildSteps(booking);
  const displayStatus = mapDisplayStatus(booking.status ?? '');
  const isCancelled = booking.status === 'CANCELLED';

  const offerings: any[] = booking.offerings ?? [];
  const devotees: any[] = booking.devotees ?? [];

  return (
    <div className="section-container py-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/bookings/chadhava"
          className="w-9 h-9 rounded-full bg-white border border-border-DEFAULT flex items-center justify-center text-text-secondary hover:border-primary-300 hover:bg-primary-50 hover:text-primary-500 transition flex-shrink-0"
          aria-label="Back"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <h1 className="text-xl font-bold text-text-primary">Chadhava Status</h1>
      </div>

      {/* Summary card */}
      <div className="bg-white border border-orange-100 rounded-xl p-4 mb-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-lg bg-primary-50 flex items-center justify-center flex-shrink-0">
            <Gift className="w-5 h-5 text-primary-500" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <h2 className="font-bold text-text-primary leading-snug">
                {booking.chadhava_name ?? 'Chadhava'}
              </h2>
              <StatusBadge status={displayStatus} />
            </div>
            {booking.temple_name && (
              <p className="text-xs text-text-muted flex items-center gap-1">
                <MapPin className="w-3 h-3 flex-shrink-0" />
                {booking.temple_name}
              </p>
            )}
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-orange-50">
              {booking.event_start_time && (
                <span className="text-xs text-text-secondary inline-flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(booking.event_start_time).toLocaleDateString('en-IN', {
                    day: '2-digit', month: 'short', year: 'numeric',
                  })}
                </span>
              )}
              {Number(booking.cost) > 0 && (
                <span className="text-sm font-bold text-primary-600 tabular-nums">
                  ₹{Number(booking.cost).toLocaleString()}
                </span>
              )}
            </div>
            <p className="text-[10px] text-text-muted mt-1">Booking ID: {booking.id?.slice(0, 8)}</p>
          </div>
        </div>
      </div>

      {/* Offerings */}
      {offerings.length > 0 && (
        <div className="bg-white border border-orange-100 rounded-xl p-4 mb-5 shadow-sm">
          <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <Package className="w-3.5 h-3.5" />
            Offerings ({offerings.length})
          </h3>
          <div className="space-y-1.5">
            {offerings.map((o: any, i: number) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-text-primary">{o.item_name}</span>
                {o.quantity && o.quantity > 1 && (
                  <span className="text-xs text-text-muted">×{o.quantity}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Devotees */}
      {devotees.length > 0 && (
        <div className="bg-white border border-orange-100 rounded-xl p-4 mb-5 shadow-sm">
          <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" />
            Devotees ({devotees.length})
          </h3>
          <div className="space-y-1.5">
            {devotees.map((d: any, i: number) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-text-primary">{d.name}</span>
                {d.gotra && <span className="text-xs text-text-muted">Gotra: {d.gotra}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Timeline */}
      {!isCancelled && (
        <div className="bg-white border border-orange-100 rounded-xl p-4 mb-5 shadow-sm">
          <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-4">Progress</h3>
          <div className="relative pl-6">
            {steps.map((step, idx) => {
              const isLast = idx === steps.length - 1;
              return (
                <div key={idx} className="relative pb-6 last:pb-0">
                  {!isLast && (
                    <div
                      className={`absolute left-[-17px] top-3 w-0.5 h-full ${
                        step.completed ? 'bg-primary-500' : 'bg-border-DEFAULT'
                      }`}
                    />
                  )}
                  <div
                    className={`absolute left-[-21px] top-1 w-2.5 h-2.5 rounded-full border-2 ${
                      step.completed
                        ? 'bg-primary-500 border-primary-500'
                        : 'bg-white border-border-DEFAULT'
                    }`}
                  />
                  <p className={`font-semibold text-sm ${step.completed ? 'text-text-primary' : 'text-text-muted'}`}>
                    {step.label}
                  </p>
                  {step.subtitle && (
                    <p className="text-xs text-text-secondary mt-0.5">{step.subtitle}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {isCancelled && (
        <div className="bg-red-50 border border-red-100 rounded-xl p-4 mb-5 text-sm text-red-600">
          This booking has been cancelled.
        </div>
      )}

      <div className="flex gap-3">
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
