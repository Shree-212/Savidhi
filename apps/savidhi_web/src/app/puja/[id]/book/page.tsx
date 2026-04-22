'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Calendar, Loader2, User } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { pujaService, pujaEventService, pujaBookingService, paymentService } from '@/lib/services';
import { mapPuja } from '@/lib/mappers';
import { getAccessToken } from '@/lib/auth';
import { loadRazorpay, openCheckout } from '@/lib/razorpay';
import type { Puja } from '@/data/models';

interface PujaEvent {
  id: string;
  start_time: string;
  max_bookings: number;
  status: string;
  stage: string;
  pujari_name?: string;
}

const DEVOTEE_TIER_OPTIONS = [
  { count: 1, label: '1 Devotee', priceField: 'price_for_1' as const },
  { count: 2, label: '2 Devotees', priceField: 'price_for_2' as const },
  { count: 4, label: '4 Devotees', priceField: 'price_for_4' as const },
  { count: 6, label: '6 Devotees', priceField: 'price_for_6' as const },
];

const STEP_LABELS = ['Pick Event', 'Select Count', 'Devotees & Address', 'Confirm'];

export default function PujaBookingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  // Data
  const [puja, setPuja] = useState<any>(null);
  const [events, setEvents] = useState<PujaEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Flow state
  const [step, setStep] = useState(0);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [devoteeCount, setDevoteeCount] = useState<number>(1);

  // Form fields (devotee rows = devoteeCount; each with name + gotra + relation)
  const [devotees, setDevotees] = useState<Array<{ name: string; gotra: string; relation: string }>>([
    { name: '', gotra: '', relation: 'Self' },
  ]);
  const [sankalp, setSankalp] = useState('');
  const [address, setAddress] = useState('');
  const [pincode, setPincode] = useState('');

  // Submit state
  const [submitting, setSubmitting] = useState(false);
  const [confirmedId, setConfirmedId] = useState<string | null>(null);

  // ── Guard: redirect to login if not authenticated ───────────
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!getAccessToken()) {
      router.replace(`/login?redirect=/puja/${id}/book`);
    }
  }, [id, router]);

  // ── Load puja + upcoming events ─────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError('');
        const [pujaRes, eventsRes] = await Promise.all([
          pujaService.getById(id),
          pujaEventService.list({ puja_id: id, upcoming: true, limit: 20 }),
        ]);
        if (cancelled) return;
        const pujaRaw = pujaRes.data?.data ?? pujaRes.data;
        if (pujaRaw) setPuja({ mapped: mapPuja(pujaRaw), raw: pujaRaw });
        const eventsRaw = eventsRes.data?.data ?? [];
        setEvents(eventsRaw);
      } catch (err: any) {
        if (!cancelled) setError(err.response?.data?.message || err.message || 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  // ── Keep devotee rows array matching count ──────────────────
  useEffect(() => {
    setDevotees((prev) => {
      if (prev.length === devoteeCount) return prev;
      if (prev.length < devoteeCount) {
        return [
          ...prev,
          ...Array.from({ length: devoteeCount - prev.length }, () => ({ name: '', gotra: '', relation: '' })),
        ];
      }
      return prev.slice(0, devoteeCount);
    });
  }, [devoteeCount]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  if (error || !puja) {
    return (
      <div className="section-container py-20 text-center text-text-secondary">
        {error || 'Puja not found.'} <Link href="/puja" className="text-primary-500 underline">Go back</Link>
      </div>
    );
  }

  const priceField = DEVOTEE_TIER_OPTIONS.find((o) => o.count === devoteeCount)?.priceField ?? 'price_for_1';
  const unitPrice = Number(puja.raw[priceField] ?? puja.raw.price_for_1 ?? 0);
  const totalPrice = unitPrice; // Already tiered; not multiplied
  const sendHamper = !!puja.raw.send_hamper;

  const selectedEvent = events.find((e) => e.id === selectedEventId);

  // ── Handlers ────────────────────────────────────────────────
  const advance = () => setStep((s) => Math.min(s + 1, STEP_LABELS.length - 1));
  const back = () => (step > 0 ? setStep(step - 1) : router.back());

  const canAdvanceFromStep = (s: number) => {
    if (s === 0) return !!selectedEventId;
    if (s === 1) return devoteeCount >= 1;
    if (s === 2) {
      if (devotees.some((d) => !d.name.trim() || !d.gotra.trim())) return false;
      if (sendHamper && !address.trim()) return false;
      return true;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!selectedEventId) return;
    try {
      setSubmitting(true);
      setError('');

      // 1. Create booking (returns booking with cost in ₹)
      const payload = {
        puja_event_id: selectedEventId,
        devotee_count: devoteeCount,
        sankalp: sankalp || undefined,
        prasad_delivery_address: sendHamper
          ? `${address}${pincode ? `, PIN: ${pincode}` : ''}`
          : undefined,
        devotees: devotees.map((d) => ({
          name: d.name.trim(),
          gotra: d.gotra.trim(),
          relation: d.relation.trim() || undefined,
        })),
      };
      const bookingRes = await pujaBookingService.create(payload);
      const booking = bookingRes.data?.data;
      if (!booking?.id) throw new Error('Booking creation failed');
      const bookingAmount = Number(booking.cost);

      // 2. Create Razorpay order
      const orderRes = await paymentService.createOrder({
        booking_type: 'PUJA',
        booking_id: booking.id,
        amount: bookingAmount,
      });
      const pay = orderRes.data?.data;
      if (!pay?.gateway_order_id) throw new Error('Could not start payment');

      // If Razorpay keys are not configured, skip the checkout and just confirm
      if (pay.stub) {
        await paymentService.verify({
          payment_id: pay.id,
          gateway_order_id: pay.gateway_order_id,
          gateway_payment_id: `pay_stub_${Date.now()}`,
          gateway_signature: 'stub',
        });
        setConfirmedId(booking.id);
        advance();
        return;
      }

      // 3. Open Razorpay Checkout modal
      const Razorpay = await loadRazorpay();
      openCheckout(Razorpay, {
        key: pay.razorpay_key_id,
        order: { id: pay.gateway_order_id, amount: Math.round(bookingAmount * 100) },
        name: 'Savidhi',
        description: `${puja.mapped.name} × ${devoteeCount} devotee${devoteeCount > 1 ? 's' : ''}`,
        notes: { booking_id: booking.id, puja_event_id: selectedEventId },
        onSuccess: async (resp) => {
          try {
            await paymentService.verify({
              payment_id: pay.id,
              gateway_order_id: resp.razorpay_order_id,
              gateway_payment_id: resp.razorpay_payment_id,
              gateway_signature: resp.razorpay_signature,
            });
            setConfirmedId(booking.id);
            advance();
          } catch (verifyErr: any) {
            setError(verifyErr.response?.data?.message || 'Payment verification failed');
          }
        },
        onFailure: (failure) => {
          setError(failure.description || 'Payment failed');
        },
        onDismiss: () => {
          setError('Payment cancelled. Your booking is reserved until payment is completed.');
        },
      });
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Booking failed');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Rendering ───────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-surface-warm">
      {/* Header */}
      <div className="bg-white border-b border-border-light sticky top-0 z-10">
        <div className="section-container flex items-center gap-4 py-3">
          <button onClick={back}>
            <ArrowLeft className="w-5 h-5 text-text-primary" />
          </button>
          <h1 className="font-semibold text-text-primary">Book {puja.mapped.name}</h1>
        </div>
      </div>

      {/* Stepper */}
      <div className="section-container py-4">
        <div className="flex items-center justify-between mb-8 max-w-2xl mx-auto">
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

        {error && (
          <div className="max-w-2xl mx-auto mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="max-w-2xl mx-auto">
          {/* Step 0: Pick Event */}
          {step === 0 && (
            <div>
              <h2 className="font-semibold text-text-primary mb-4">Select Upcoming Event</h2>
              {events.length === 0 ? (
                <div className="border border-border-DEFAULT rounded-xl p-6 text-center text-text-secondary">
                  No upcoming events scheduled for this puja. The admin has not added a date yet.
                </div>
              ) : (
                <div className="space-y-3 mb-6">
                  {events.map((e) => {
                    const d = new Date(e.start_time);
                    const active = selectedEventId === e.id;
                    return (
                      <button
                        key={e.id}
                        onClick={() => setSelectedEventId(e.id)}
                        className={`w-full border rounded-xl p-4 text-left transition ${
                          active
                            ? 'border-primary-500 bg-primary-50'
                            : 'border-border-DEFAULT bg-white hover:border-primary-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Calendar className={`w-5 h-5 ${active ? 'text-primary-500' : 'text-text-muted'}`} />
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-text-primary">
                              {d.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
                            </p>
                            <p className="text-xs text-text-secondary">
                              {d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                              {e.pujari_name && ` · Pujari: ${e.pujari_name}`}
                            </p>
                          </div>
                          <span className="text-xs text-primary-600 font-medium">{e.status}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
              <Button
                className="w-full"
                size="lg"
                disabled={!canAdvanceFromStep(0)}
                onClick={advance}
              >
                Continue
              </Button>
            </div>
          )}

          {/* Step 1: Select Count */}
          {step === 1 && (
            <div>
              <h2 className="font-semibold text-text-primary mb-1">How many devotees?</h2>
              <p className="text-xs text-text-secondary mb-4">Pricing tiers come from the puja definition.</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                {DEVOTEE_TIER_OPTIONS.map((opt) => {
                  const price = Number(puja.raw[opt.priceField] ?? 0);
                  return (
                    <button
                      key={opt.count}
                      onClick={() => setDevoteeCount(opt.count)}
                      className={`border rounded-xl p-4 text-center transition ${
                        devoteeCount === opt.count
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-border-DEFAULT bg-white hover:border-primary-300'
                      }`}
                    >
                      <User
                        className={`w-6 h-6 mx-auto mb-1.5 ${
                          devoteeCount === opt.count ? 'text-primary-500' : 'text-text-muted'
                        }`}
                      />
                      <p className="text-sm font-medium text-text-primary">{opt.label}</p>
                      <p
                        className={`text-sm font-bold mt-1 ${
                          devoteeCount === opt.count ? 'text-primary-600' : 'text-text-secondary'
                        }`}
                      >
                        ₹{price.toLocaleString()}
                      </p>
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" size="lg" onClick={back}>
                  Back
                </Button>
                <Button className="flex-1" size="lg" disabled={!canAdvanceFromStep(1)} onClick={advance}>
                  Continue · ₹{totalPrice.toLocaleString()}
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Devotee Details + Address */}
          {step === 2 && (
            <div>
              <h2 className="font-semibold text-text-primary mb-3">Devotee Details</h2>
              <div className="space-y-3 mb-6">
                {devotees.map((d, i) => (
                  <div key={i} className="border border-border-DEFAULT rounded-xl p-3 bg-white space-y-2">
                    <p className="text-xs font-semibold text-text-secondary">Devotee {i + 1}</p>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        placeholder="Full Name"
                        value={d.name}
                        onChange={(e) =>
                          setDevotees((prev) => prev.map((x, k) => (k === i ? { ...x, name: e.target.value } : x)))
                        }
                        className="border border-border-DEFAULT rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
                      />
                      <input
                        placeholder="Gotra"
                        value={d.gotra}
                        onChange={(e) =>
                          setDevotees((prev) => prev.map((x, k) => (k === i ? { ...x, gotra: e.target.value } : x)))
                        }
                        className="border border-border-DEFAULT rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
                      />
                    </div>
                    <input
                      placeholder="Relation (e.g. Self, Wife, Father)"
                      value={d.relation}
                      onChange={(e) =>
                        setDevotees((prev) => prev.map((x, k) => (k === i ? { ...x, relation: e.target.value } : x)))
                      }
                      className="w-full border border-border-DEFAULT rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
                    />
                  </div>
                ))}
              </div>

              {sendHamper && (
                <>
                  <h2 className="font-semibold text-text-primary mb-3">Prasad Delivery Address</h2>
                  <div className="space-y-3 mb-6">
                    <input
                      placeholder="Full address (line 1 + locality + city + state)"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full border border-border-DEFAULT rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
                    />
                    <input
                      placeholder="Pincode"
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
                      maxLength={6}
                      className="w-full border border-border-DEFAULT rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
                    />
                  </div>
                </>
              )}

              <h2 className="font-semibold text-text-primary mb-3">Sankalp (your intention) — optional</h2>
              <textarea
                placeholder="e.g. For the health and prosperity of my family"
                value={sankalp}
                onChange={(e) => setSankalp(e.target.value)}
                rows={3}
                className="w-full border border-border-DEFAULT rounded-xl px-4 py-3 text-sm mb-6 focus:outline-none focus:ring-2 focus:ring-primary-300 resize-none"
              />

              {/* Price summary */}
              <div className="bg-white border border-border-DEFAULT rounded-xl p-4 mb-6 text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-text-secondary">Puja</span>
                  <span className="font-medium">{puja.mapped.name}</span>
                </div>
                {selectedEvent && (
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Date</span>
                    <span className="font-medium">
                      {new Date(selectedEvent.start_time).toLocaleString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-text-secondary">Devotees</span>
                  <span className="font-medium">{devoteeCount}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-border-light">
                  <span className="font-semibold">Total</span>
                  <span className="font-bold text-primary-600">₹{totalPrice.toLocaleString()}</span>
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" size="lg" onClick={back}>
                  Back
                </Button>
                <Button
                  className="flex-1"
                  size="lg"
                  disabled={!canAdvanceFromStep(2) || submitting}
                  onClick={handleSubmit}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" /> Booking…
                    </>
                  ) : (
                    `Confirm Booking · ₹${totalPrice.toLocaleString()}`
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Confirmation */}
          {step === 3 && (
            <div className="text-center py-10">
              <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl">✅</span>
              </div>
              <h2 className="text-xl font-bold text-text-primary mb-2">Booking Confirmed!</h2>
              <p className="text-sm text-text-secondary mb-2">
                {puja.mapped.name} for {devoteeCount} devotee{devoteeCount > 1 ? 's' : ''}
              </p>
              {confirmedId && confirmedId !== 'confirmed' && (
                <p className="text-xs text-text-muted mb-6">Booking ID: {confirmedId.slice(0, 8)}</p>
              )}
              <p className="text-sm text-text-secondary mb-8">
                We&apos;ll notify you before the puja starts. You can track the status in your bookings.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-md mx-auto">
                <Link href="/bookings/puja" className="flex-1">
                  <Button size="lg" className="w-full">View My Bookings</Button>
                </Link>
                <Link href="/" className="flex-1">
                  <Button variant="outline" size="lg" className="w-full">Back To Home</Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
