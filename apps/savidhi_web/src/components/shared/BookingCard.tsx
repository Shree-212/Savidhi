import Link from 'next/link';
import { Calendar, MapPin } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import type { PujaBooking } from '@/data/models';

interface BookingCardProps {
  booking: PujaBooking;
}

export function BookingCard({ booking }: BookingCardProps) {
  return (
    <Link href={`/bookings/puja/${booking.bookingId}`} className="block">
      <div className="card hover:shadow-md transition-shadow space-y-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h3 className="font-semibold text-sm text-text-primary">{booking.pujaName}</h3>
            <p className="text-xs text-text-muted flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {booking.templeName}
            </p>
          </div>
          <StatusBadge status={booking.status} />
        </div>
        <div className="flex items-center gap-4 text-xs text-text-secondary">
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            Booked: {booking.bookedOn}
          </span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-text-muted">Puja On: {booking.pujaOn}</span>
          {booking.isWeekly && (
            <span className="bg-primary-50 text-primary-600 px-2 py-0.5 rounded-full text-[10px] font-bold">
              WEEKLY
            </span>
          )}
        </div>
        <p className="text-[10px] text-text-muted">ID: {booking.bookingId}</p>
      </div>
    </Link>
  );
}
