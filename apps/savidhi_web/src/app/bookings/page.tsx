'use client';

import Link from 'next/link';
import { Flame, Clock } from 'lucide-react';
import { MOCK_PUJA_BOOKINGS, MOCK_APPOINTMENT_BOOKINGS } from '@/data';

export default function BookingsPage() {
  return (
    <div className="section-container py-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-text-primary mb-6">My Bookings</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link href="/bookings/puja" className="card p-6 hover:shadow-md transition group">
          <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center mb-3">
            <Flame className="w-6 h-6 text-primary-500" />
          </div>
          <h2 className="font-semibold text-text-primary group-hover:text-primary-500 transition">Puja Bookings</h2>
          <p className="text-xs text-text-secondary mt-1">{MOCK_PUJA_BOOKINGS.length} bookings</p>
        </Link>

        <Link href="/bookings/appointments" className="card p-6 hover:shadow-md transition group">
          <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center mb-3">
            <Clock className="w-6 h-6 text-primary-500" />
          </div>
          <h2 className="font-semibold text-text-primary group-hover:text-primary-500 transition">Appointment Bookings</h2>
          <p className="text-xs text-text-secondary mt-1">{MOCK_APPOINTMENT_BOOKINGS.length} bookings</p>
        </Link>
      </div>
    </div>
  );
}
