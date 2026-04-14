'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, User } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { pujaService } from '@/lib/services';
import { mapPuja } from '@/lib/mappers';
import type { Puja } from '@/data/models';

const DEVOTEE_OPTIONS = [
  { count: 1, label: '1 Devotee' },
  { count: 2, label: '2 Devotee' },
  { count: 4, label: '4 Devotee' },
  { count: 6, label: '6 Devotee' },
];

const STEP_LABELS = ['Select Puja', 'Devotee Details', 'Make Payment', 'Sankalp Form'];

export default function PujaBookingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [puja, setPuja] = useState<Puja | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(0);
  const [devoteeCount, setDevoteeCount] = useState(1);
  const [name, setName] = useState('');
  const [gotra, setGotra] = useState('');
  const [houseNo, setHouseNo] = useState('');
  const [pincode, setPincode] = useState('');
  const [address, setAddress] = useState('');

  useEffect(() => {
    pujaService.getById(id)
      .then((res) => {
        const raw = res.data?.data ?? res.data;
        if (raw) setPuja(mapPuja(raw));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  if (!puja) {
    return (
      <div className="section-container py-20 text-center text-text-secondary">
        Puja not found. <Link href="/puja" className="text-primary-500 underline">Go back</Link>
      </div>
    );
  }

  const totalPrice = devoteeCount * puja.pricePerDevotee;

  return (
    <div className="min-h-screen bg-surface-warm">
      {/* Header */}
      <div className="bg-white border-b border-border-light sticky top-0 z-10">
        <div className="section-container flex items-center gap-4 py-3">
          <button onClick={() => (step > 0 ? setStep(step - 1) : history.back())}>
            <ArrowLeft className="w-5 h-5 text-text-primary" />
          </button>
          <h1 className="font-semibold text-text-primary">Puja Details</h1>
        </div>
      </div>

      {/* Steps */}
      <div className="section-container py-4">
        <div className="flex items-center justify-between mb-8">
          {STEP_LABELS.map((label, i) => (
            <div key={label} className="flex flex-col items-center gap-1.5 flex-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  i <= step ? 'bg-primary-500 text-white' : 'bg-border-light text-text-muted'
                }`}
              >
                {i + 1}
              </div>
              <span className={`text-[10px] text-center leading-tight ${i <= step ? 'text-primary-600 font-medium' : 'text-text-muted'}`}>
                {label}
              </span>
            </div>
          ))}
        </div>

        <div className="max-w-2xl mx-auto">
          {/* Step 0: Select Devotees */}
          {step === 0 && (
            <div>
              <h2 className="font-semibold text-text-primary mb-4">Select Number Of Devotees</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
                {DEVOTEE_OPTIONS.map((opt) => (
                  <button
                    key={opt.count}
                    onClick={() => setDevoteeCount(opt.count)}
                    className={`border rounded-xl p-4 text-center transition ${
                      devoteeCount === opt.count
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-border-DEFAULT bg-white hover:border-primary-200'
                    }`}
                  >
                    <User className={`w-7 h-7 mx-auto mb-2 ${devoteeCount === opt.count ? 'text-primary-500' : 'text-text-muted'}`} />
                    <p className="text-sm font-medium text-text-primary">{opt.label}</p>
                    <p className={`text-sm font-bold mt-1 ${devoteeCount === opt.count ? 'text-primary-600' : 'text-text-secondary'}`}>
                      ₹ {opt.count * puja.pricePerDevotee}
                    </p>
                  </button>
                ))}
              </div>
              <Button className="w-full" size="lg" onClick={() => setStep(1)}>
                Continue · ₹{totalPrice}
              </Button>
            </div>
          )}

          {/* Step 1: Devotee Details */}
          {step === 1 && (
            <div>
              <h2 className="font-semibold text-text-primary mb-4">Contact Details</h2>
              <label className="block text-sm text-text-secondary mb-1">Name</label>
              <input
                className="w-full border border-border-DEFAULT rounded-xl px-4 py-3 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-primary-300"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
              />
              <label className="block text-sm text-text-secondary mb-1">Gotra</label>
              <input
                className="w-full border border-border-DEFAULT rounded-xl px-4 py-3 text-sm mb-6 focus:outline-none focus:ring-2 focus:ring-primary-300"
                value={gotra}
                onChange={(e) => setGotra(e.target.value)}
                placeholder="Your gotra"
              />

              <h2 className="font-semibold text-text-primary mb-4">Prasad Delivery Address</h2>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <input
                  className="border border-border-DEFAULT rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
                  value={houseNo}
                  onChange={(e) => setHouseNo(e.target.value)}
                  placeholder="House number"
                />
                <input
                  className="border border-border-DEFAULT rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
                  placeholder="Pincode"
                  inputMode="numeric"
                  maxLength={6}
                />
              </div>
              <input
                className="w-full border border-border-DEFAULT rounded-xl px-4 py-3 text-sm mb-6 focus:outline-none focus:ring-2 focus:ring-primary-300"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Full address"
              />

              {/* Price Breakdown */}
              <div className="bg-white border border-border-DEFAULT rounded-xl p-4 mb-6 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-text-secondary">Puja Fee</span>
                  <span className="text-text-primary font-medium">₹{puja.pricePerDevotee}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Devotees</span>
                  <span className="text-text-primary font-medium">× {devoteeCount}</span>
                </div>
                <div className="flex justify-between border-t border-border-light pt-2">
                  <span className="font-semibold text-text-primary">Total</span>
                  <span className="font-bold text-primary-600">₹{totalPrice}</span>
                </div>
              </div>

              <Button className="w-full" size="lg" onClick={() => setStep(2)}>
                Proceed To Payment · ₹{totalPrice}
              </Button>
            </div>
          )}

          {/* Step 2: Payment */}
          {step === 2 && (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl">💳</span>
              </div>
              <h2 className="text-xl font-bold text-text-primary mb-2">Make Payment</h2>
              <p className="text-sm text-text-secondary mb-6">
                Total: <span className="font-bold text-primary-600">₹{totalPrice}</span>
              </p>
              <p className="text-xs text-text-muted mb-8">Payment gateway integration coming soon</p>
              <Button className="w-full max-w-sm mx-auto" size="lg" onClick={() => setStep(3)}>
                Pay ₹{totalPrice}
              </Button>
            </div>
          )}

          {/* Step 3: Sankalp Form / Confirmation */}
          {step === 3 && (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl">✅</span>
              </div>
              <h2 className="text-xl font-bold text-text-primary mb-2">Booking Confirmed!</h2>
              <p className="text-sm text-text-secondary mb-2">
                {puja.name} for {devoteeCount} devotee(s)
              </p>
              <p className="text-sm text-text-secondary mb-8">
                We&apos;ll notify you before the puja starts. You can track the status in your bookings.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/bookings">
                  <Button size="lg">View Bookings</Button>
                </Link>
                <Link href="/">
                  <Button variant="outline" size="lg">Back To Home</Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
