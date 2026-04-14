'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { BookingCard } from '@/components/shared/BookingCard';
import { pujaBookingService } from '@/lib/services';
import type { PujaBooking } from '@/data/models';

const FILTERS = ['All', 'Ongoing', 'Upcoming', 'Completed', 'Cancelled'];

function mapPujaBooking(b: any): PujaBooking {
  return {
    id: b.id,
    bookingId: b.id,
    pujaName: b.puja_name ?? b.pujaName ?? '',
    templeName: b.temple_name ?? b.templeName ?? '',
    bookedOn: b.created_at ? new Date(b.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '',
    pujaOn: b.event_start_time ? new Date(b.event_start_time).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '',
    status: mapStatus(b.status),
  };
}

function mapStatus(s: string): PujaBooking['status'] {
  const map: Record<string, PujaBooking['status']> = {
    CONFIRMED: 'YET_TO_START',
    PENDING: 'YET_TO_START',
    INPROGRESS: 'ONGOING',
    LIVE_ADDED: 'ONGOING',
    SHORT_VIDEO_ADDED: 'VIDEO_PROCESSING',
    SANKALP_VIDEO_ADDED: 'VIDEO_PROCESSING',
    TO_BE_SHIPPED: 'PRASAD_SHIPPED',
    SHIPPED: 'PRASAD_SHIPPED',
    COMPLETED: 'COMPLETE',
    CANCELLED: 'CANCELLED',
  };
  return map[s] ?? 'YET_TO_START';
}

const filterMap: Record<string, (b: PujaBooking) => boolean> = {
  All: () => true,
  Ongoing: (b) => ['ONGOING', 'VIDEO_PROCESSING', 'PRASAD_SHIPPED'].includes(b.status),
  Upcoming: (b) => b.status === 'YET_TO_START',
  Completed: (b) => b.status === 'COMPLETE',
  Cancelled: (b) => b.status === 'CANCELLED',
};

export default function PujaBookingsPage() {
  const [filter, setFilter] = useState('All');
  const [bookings, setBookings] = useState<PujaBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    pujaBookingService.list({ page: 1 })
      .then((res) => {
        const raw = res.data?.data ?? [];
        setBookings(raw.map(mapPujaBooking));
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load bookings'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = bookings.filter(filterMap[filter] || filterMap.All);

  return (
    <div className="section-container py-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/bookings">
          <ArrowLeft className="w-5 h-5 text-text-primary" />
        </Link>
        <h1 className="text-xl font-bold text-text-primary">Puja Bookings</h1>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition ${
              filter === f ? 'bg-primary-500 text-white' : 'bg-white border border-border-DEFAULT text-text-secondary hover:border-primary-300'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
        </div>
      ) : error ? (
        <p className="text-center text-red-500 py-12">{error}</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((b) => (
            <BookingCard key={b.id} booking={b} />
          ))}
          {filtered.length === 0 && (
            <p className="text-center text-text-muted py-12">No bookings found</p>
          )}
        </div>
      )}
    </div>
  );
}
