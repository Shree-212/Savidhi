'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Calendar, Gift, Loader2, MapPin } from 'lucide-react';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { chadhavaBookingService } from '@/lib/services';
import type { ChadhavaBooking, ChadhavaBookingStatus } from '@/data/models';

const FILTERS = ['All', 'Ongoing', 'Upcoming', 'Completed', 'Cancelled'] as const;

function mapStatus(s: string): ChadhavaBookingStatus {
  const map: Record<string, ChadhavaBookingStatus> = {
    CONFIRMED: 'YET_TO_START',
    PENDING: 'YET_TO_START',
    INPROGRESS: 'ONGOING',
    LIVE_ADDED: 'ONGOING',
    SHORT_VIDEO_ADDED: 'ONGOING',
    SANKALP_VIDEO_ADDED: 'ONGOING',
    TO_BE_SHIPPED: 'PRASAD_SHIPPED',
    SHIPPED: 'PRASAD_SHIPPED',
    COMPLETED: 'COMPLETE',
    CANCELLED: 'CANCELLED',
  };
  return map[s] ?? 'YET_TO_START';
}

function mapChadhavaBooking(b: any): ChadhavaBooking {
  return {
    id: b.id,
    bookingId: b.id,
    chadhavaName: b.chadhava_name ?? b.chadhavaName ?? '',
    templeName: b.temple_name ?? b.templeName ?? '',
    bookedOn: b.created_at
      ? new Date(b.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
      : '',
    chadhavaOn: b.event_start_time
      ? new Date(b.event_start_time).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
      : '',
    totalCost: Number(b.cost ?? 0),
    offeringsCount: Number(b.offerings_count ?? b.offerings?.length ?? 0),
    status: mapStatus(b.status),
  };
}

const filterMap: Record<string, (b: ChadhavaBooking) => boolean> = {
  All: () => true,
  Ongoing: (b) => ['ONGOING', 'PRASAD_SHIPPED'].includes(b.status),
  Upcoming: (b) => b.status === 'YET_TO_START',
  Completed: (b) => b.status === 'COMPLETE',
  Cancelled: (b) => b.status === 'CANCELLED',
};

export default function ChadhavaBookingsPage() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('All');
  const [bookings, setBookings] = useState<ChadhavaBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    chadhavaBookingService
      .list({ page: 1 })
      .then((res) => {
        const raw = res.data?.data ?? [];
        setBookings(raw.map(mapChadhavaBooking));
      })
      .catch((e) =>
        setError(e instanceof Error ? e.message : 'Failed to load chadhava bookings'),
      )
      .finally(() => setLoading(false));
  }, []);

  const filtered = bookings.filter(filterMap[filter] || filterMap.All);

  return (
    <div className="section-container max-w-2xl py-6 sm:py-8">
      <div className="flex items-center gap-3 mb-5">
        <Link
          href="/bookings"
          className="w-9 h-9 rounded-full bg-white border border-border-DEFAULT flex items-center justify-center text-text-secondary hover:border-primary-300 hover:bg-primary-50 hover:text-primary-500 transition flex-shrink-0"
          aria-label="Back to bookings"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <h1 className="text-xl sm:text-2xl font-bold text-text-primary">Chadhava Bookings</h1>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide -mx-1 px-1">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition ${
              filter === f
                ? 'bg-primary-500 text-white shadow-sm'
                : 'bg-white border border-border-DEFAULT text-text-secondary hover:border-primary-300'
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
        <p className="text-center text-red-500 py-12 text-sm">{error}</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-full bg-primary-50 flex items-center justify-center mx-auto mb-3">
            <Gift className="w-7 h-7 text-primary-400" />
          </div>
          <p className="text-text-muted text-sm">
            {filter === 'All' ? 'No chadhava bookings yet' : `No ${filter.toLowerCase()} chadhavas`}
          </p>
          {filter === 'All' && (
            <Link
              href="/chadhava"
              className="inline-block mt-4 text-sm font-semibold text-primary-500 hover:text-primary-600"
            >
              Browse chadhavas →
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((b) => (
            <Link
              key={b.id}
              href={`/bookings/chadhava/${b.bookingId}`}
              className="block bg-white border border-orange-100 rounded-xl px-4 py-3.5 hover:border-primary-300 hover:shadow-sm transition-all shadow-[0_1px_2px_rgba(232,129,58,0.04)]"
            >
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-lg bg-primary-50 flex items-center justify-center flex-shrink-0">
                  <Gift className="w-5 h-5 text-primary-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="font-semibold text-sm text-text-primary leading-snug truncate">
                      {b.chadhavaName || 'Chadhava'}
                    </h3>
                    <StatusBadge status={b.status} />
                  </div>
                  {b.templeName && (
                    <p className="text-xs text-text-muted flex items-center gap-1 truncate">
                      <MapPin className="w-3 h-3 flex-shrink-0" />
                      {b.templeName}
                    </p>
                  )}
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-orange-50">
                    <span className="text-xs text-text-secondary inline-flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {b.chadhavaOn || b.bookedOn || 'Pending'}
                    </span>
                    {b.totalCost > 0 && (
                      <span className="text-sm font-bold text-primary-600 tabular-nums">
                        ₹{b.totalCost.toLocaleString()}
                      </span>
                    )}
                  </div>
                  {b.offeringsCount > 0 && (
                    <p className="text-[10px] text-text-muted mt-1">
                      {b.offeringsCount} offering{b.offeringsCount > 1 ? 's' : ''} · ID {b.bookingId.slice(0, 8)}
                    </p>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
