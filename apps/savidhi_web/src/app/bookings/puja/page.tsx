'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { BookingCard } from '@/components/shared/BookingCard';
import { MOCK_PUJA_BOOKINGS } from '@/data';
import type { PujaBooking } from '@/data';

const FILTERS = ['All', 'Ongoing', 'Upcoming', 'Completed', 'Cancelled'];

const filterMap: Record<string, (b: PujaBooking) => boolean> = {
  All: () => true,
  Ongoing: (b) => ['ONGOING', 'VIDEO_PROCESSING', 'PRASAD_SHIPPED'].includes(b.status),
  Upcoming: (b) => b.status === 'YET_TO_START',
  Completed: (b) => b.status === 'COMPLETE',
  Cancelled: (b) => b.status === 'CANCELLED',
};

export default function PujaBookingsPage() {
  const [filter, setFilter] = useState('All');
  const bookings = MOCK_PUJA_BOOKINGS.filter(filterMap[filter] || filterMap.All);

  return (
    <div className="section-container py-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/bookings">
          <ArrowLeft className="w-5 h-5 text-text-primary" />
        </Link>
        <h1 className="text-xl font-bold text-text-primary">Puja Bookings</h1>
      </div>

      {/* Filter Chips */}
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

      {/* Bookings */}
      <div className="space-y-3">
        {bookings.map((b) => (
          <BookingCard key={b.id} booking={b} />
        ))}
        {bookings.length === 0 && (
          <p className="text-center text-text-muted py-12">No bookings found</p>
        )}
      </div>
    </div>
  );
}
