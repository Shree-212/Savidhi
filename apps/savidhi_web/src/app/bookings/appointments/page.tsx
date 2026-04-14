'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { AppointmentCard } from '@/components/shared/AppointmentCard';
import { appointmentService } from '@/lib/services';
import { normaliseMediaUrl } from '@/lib/utils';
import type { AppointmentBooking } from '@/data/models';

const FILTERS = ['All', 'Ongoing', 'Upcoming', 'Completed', 'Cancelled'];

function mapAppointmentBooking(a: any): AppointmentBooking {
  const scheduledAt = a.scheduled_at ?? '';
  const date = scheduledAt ? new Date(scheduledAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
  const time = scheduledAt ? new Date(scheduledAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '';
  const statusMap: Record<string, AppointmentBooking['status']> = {
    LINK_YET_TO_BE_GENERATED: 'YET_TO_START',
    INPROGRESS: 'MEET_IN_PROGRESS',
    COMPLETED: 'COMPLETE',
    CANCELLED: 'CANCELLED',
  };
  return {
    id: a.id,
    bookingId: a.id,
    astrologerName: a.astrologer_name ?? '',
    astrologerImage: normaliseMediaUrl(a.astrologer_pic ?? a.profile_pic ?? ''),
    date,
    timeSlot: time,
    status: statusMap[a.status] ?? 'YET_TO_START',
  };
}

const filterMap: Record<string, (b: AppointmentBooking) => boolean> = {
  All: () => true,
  Ongoing: (b) => b.status === 'MEET_IN_PROGRESS',
  Upcoming: (b) => b.status === 'YET_TO_START',
  Completed: (b) => b.status === 'COMPLETE',
  Cancelled: (b) => b.status === 'CANCELLED',
};

export default function AppointmentBookingsPage() {
  const [filter, setFilter] = useState('All');
  const [bookings, setBookings] = useState<AppointmentBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    appointmentService.list({ page: 1 })
      .then((res) => {
        const raw = res.data?.data ?? [];
        setBookings(raw.map(mapAppointmentBooking));
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load appointments'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = bookings.filter(filterMap[filter] || filterMap.All);

  return (
    <div className="section-container py-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/bookings">
          <ArrowLeft className="w-5 h-5 text-text-primary" />
        </Link>
        <h1 className="text-xl font-bold text-text-primary">Appointment Bookings</h1>
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
            <AppointmentCard key={b.id} booking={b} />
          ))}
          {filtered.length === 0 && (
            <p className="text-center text-text-muted py-12">No appointments found</p>
          )}
        </div>
      )}
    </div>
  );
}
