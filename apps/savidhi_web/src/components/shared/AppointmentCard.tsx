import Image from 'next/image';
import Link from 'next/link';
import { Calendar } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import type { AppointmentBooking } from '@/data/models';
import { normaliseMediaUrl, isLocalMediaUrl } from '@/lib/utils';

interface AppointmentCardProps {
  booking: AppointmentBooking;
}

export function AppointmentCard({ booking }: AppointmentCardProps) {
  return (
    <Link href={`/bookings/appointments/${booking.bookingId}`} className="block">
      <div className="card hover:shadow-md transition-shadow">
        <div className="flex gap-4">
          <div className="relative w-14 h-14 rounded-full overflow-hidden shrink-0 bg-primary-50">
            <Image
              src={normaliseMediaUrl(booking.astrologerImage) || '/images/placeholder.jpg'}
              alt={booking.astrologerName}
              fill
              className="object-cover"
              sizes="56px"
              unoptimized={isLocalMediaUrl(booking.astrologerImage)}
            />
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-sm text-text-primary">{booking.astrologerName}</h3>
                <p className="text-xs text-text-muted flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {booking.date}
                </p>
              </div>
              <StatusBadge status={booking.status} />
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-text-secondary">{booking.timeSlot}</span>
            </div>
            <p className="text-[10px] text-text-muted">ID: {booking.bookingId}</p>
          </div>
        </div>
      </div>
    </Link>
  );
}
