'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Flame, Clock, Gift, LogIn, Loader2 } from 'lucide-react';
import { isAuthenticated } from '@/lib/auth';
import { pujaBookingService, chadhavaBookingService, appointmentService } from '@/lib/services';

export default function BookingsPage() {
  const [pujaCount, setPujaCount] = useState(0);
  const [chadhavaCount, setChadhavaCount] = useState(0);
  const [apptCount, setApptCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) { setLoading(false); return; }
    setLoggedIn(true);
    (async () => {
      try {
        const [pRes, cRes, aRes] = await Promise.allSettled([
          pujaBookingService.list(),
          chadhavaBookingService.list(),
          appointmentService.list(),
        ]);
        if (pRes.status === 'fulfilled') setPujaCount(pRes.value.data?.data?.length ?? 0);
        if (cRes.status === 'fulfilled') setChadhavaCount(cRes.value.data?.data?.length ?? 0);
        if (aRes.status === 'fulfilled') setApptCount(aRes.value.data?.data?.length ?? 0);
      } catch { /* ignore */ }
      finally { setLoading(false); }
    })();
  }, []);

  if (!loggedIn && !loading) {
    return (
      <div className="section-container py-20 max-w-md mx-auto text-center">
        <div className="w-20 h-20 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <LogIn className="w-10 h-10 text-primary-500" />
        </div>
        <h1 className="text-2xl font-bold text-text-primary mb-2">Login to view your bookings</h1>
        <p className="text-text-secondary mb-6">Track your puja bookings and astrology appointments</p>
        <Link href="/login" className="inline-flex items-center gap-2 bg-primary-500 text-white px-8 py-3 rounded-xl font-semibold hover:bg-primary-600 transition">
          Login <LogIn className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="section-container py-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-text-primary mb-6">My Bookings</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link href="/bookings/puja" className="card p-6 hover:shadow-md transition group">
          <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center mb-3">
            <Flame className="w-6 h-6 text-primary-500" />
          </div>
          <h2 className="font-semibold text-text-primary group-hover:text-primary-500 transition">Puja Bookings</h2>
          <p className="text-xs text-text-secondary mt-1">{pujaCount} {pujaCount === 1 ? 'booking' : 'bookings'}</p>
        </Link>

        <Link href="/bookings/chadhava" className="card p-6 hover:shadow-md transition group">
          <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center mb-3">
            <Gift className="w-6 h-6 text-primary-500" />
          </div>
          <h2 className="font-semibold text-text-primary group-hover:text-primary-500 transition">Chadhava Bookings</h2>
          <p className="text-xs text-text-secondary mt-1">{chadhavaCount} {chadhavaCount === 1 ? 'offering' : 'offerings'}</p>
        </Link>

        <Link href="/bookings/appointments" className="card p-6 hover:shadow-md transition group">
          <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center mb-3">
            <Clock className="w-6 h-6 text-primary-500" />
          </div>
          <h2 className="font-semibold text-text-primary group-hover:text-primary-500 transition">Appointment Bookings</h2>
          <p className="text-xs text-text-secondary mt-1">{apptCount} {apptCount === 1 ? 'booking' : 'bookings'}</p>
        </Link>
      </div>
    </div>
  );
}
