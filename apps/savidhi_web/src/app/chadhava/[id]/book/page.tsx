'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Calendar, Loader2, Minus, Plus, Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { chadhavaService, chadhavaEventService, chadhavaBookingService, paymentService } from '@/lib/services';
import { mapChadhava } from '@/lib/mappers';
import { getAccessToken } from '@/lib/auth';
import { loadRazorpay, openCheckout } from '@/lib/razorpay';

interface ChadhavaEvent {
  id: string;
  start_time: string;
  max_bookings: number;
  status: string;
  stage: string;
  pujari_name?: string;
}

const STEP_LABELS = ['Pick Event', 'Offerings', 'Devotees & Address', 'Confirm'];

export default function ChadhavaBookingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params); // 'id' is now either UUID or slug; BE accepts both
  const router = useRouter();
  const searchParams = useSearchParams();

  const [chadhava, setChadhava] = useState<any>(null);
  const [events, setEvents] = useState<ChadhavaEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [step, setStep] = useState(0);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [offeringsQty, setOfferingsQty] = useState<Record<string, number>>({});

  const [devotees, setDevotees] = useState<Array<{ name: string; gotra: string }>>([
    { name: '', gotra: '' },
  ]);
  const [sankalp, setSankalp] = useState('');
  const [address, setAddress] = useState('');
  const [pincode, setPincode] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [confirmedId, setConfirmedId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!getAccessToken()) {
      router.replace(`/login?redirect=/chadhava/${id}/book`);
    }
  }, [id, router]);

  // Pre-populate offering quantities from `?offerings=id:qty,id:qty` query
  // string (set by the chadhava detail page when the user clicks "Offer For").
  useEffect(() => {
    const param = searchParams.get('offerings');
    if (!param) return;
    const seeded: Record<string, number> = {};
    for (const pair of param.split(',')) {
      const [oid, qty] = pair.split(':');
      const n = Number(qty);
      if (oid && Number.isFinite(n) && n > 0) seeded[oid] = n;
    }
    if (Object.keys(seeded).length > 0) {
      setOfferingsQty(seeded);
    }
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError('');
        const [chRes, evRes] = await Promise.all([
          chadhavaService.getById(id),
          chadhavaEventService.list({ chadhava_id: id, upcoming: true, limit: 20 }),
        ]);
        if (cancelled) return;
        const chRaw = chRes.data?.data ?? chRes.data;
        if (chRaw) setChadhava({ mapped: mapChadhava(chRaw), raw: chRaw });
        setEvents(evRes.data?.data ?? []);
      } catch (err: any) {
        if (!cancelled) setError(err.response?.data?.message || 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  if (error && !chadhava) {
    return (
      <div className="section-container py-20 text-center text-text-secondary">
        {error || 'Chadhava not found.'} <Link href="/chadhava" className="text-primary-500 underline">Go back</Link>
      </div>
    );
  }

  if (!chadhava) {
    return (
      <div className="section-container py-20 text-center text-text-secondary">
        Chadhava not found. <Link href="/chadhava" className="text-primary-500 underline">Go back</Link>
      </div>
    );
  }

  const offerings: Array<{ id: string; name: string; benefit: string; price: number; images: string[] }> =
    (chadhava.raw.offerings ?? []).map((o: any) => ({
      id: o.id,
      name: o.item_name ?? o.name,
      benefit: o.benefit ?? '',
      price: Number(o.price ?? 0),
      images: o.images ?? [],
    }));

  const selectedOfferings = offerings.filter((o) => (offeringsQty[o.id] ?? 0) > 0);
  const totalPrice = selectedOfferings.reduce((s, o) => s + o.price * (offeringsQty[o.id] ?? 0), 0);
  const sendHamper = !!chadhava.raw.send_hamper;
  const selectedEvent = events.find((e) => e.id === selectedEventId);

  const advance = () => setStep((s) => Math.min(s + 1, STEP_LABELS.length - 1));
  const back = () => (step > 0 ? setStep(step - 1) : router.back());

  const canAdvance = (s: number) => {
    if (s === 0) return !!selectedEventId;
    if (s === 1) return selectedOfferings.length > 0;
    if (s === 2) {
      if (devotees.some((d) => !d.name.trim() || !d.gotra.trim())) return false;
      if (sendHamper && !address.trim()) return false;
      return true;
    }
    return true;
  };

  const bumpQty = (offId: string, delta: number) => {
    setOfferingsQty((prev) => {
      const next = Math.max(0, (prev[offId] ?? 0) + delta);
      return { ...prev, [offId]: next };
    });
  };

  const addDevotee = () => setDevotees((prev) => [...prev, { name: '', gotra: '' }]);
  const removeDevotee = (i: number) =>
    setDevotees((prev) => (prev.length > 1 ? prev.filter((_, k) => k !== i) : prev));

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      setError('');
      const payload = {
        chadhava_event_id: selectedEventId,
        sankalp: sankalp || undefined,
        prasad_delivery_address: sendHamper ? `${address}${pincode ? `, PIN: ${pincode}` : ''}` : undefined,
        devotees: devotees.map((d) => ({ name: d.name.trim(), gotra: d.gotra.trim() })),
        offerings: selectedOfferings.map((o) => ({
          offering_id: o.id,
          quantity: offeringsQty[o.id],
        })),
      };
      const bookingRes = await chadhavaBookingService.create(payload);
      const booking = bookingRes.data?.data;
      if (!booking?.id) throw new Error('Booking creation failed');
      const bookingAmount = Number(booking.cost);

      const orderRes = await paymentService.createOrder({
        booking_type: 'CHADHAVA',
        booking_id: booking.id,
        amount: bookingAmount,
      });
      const pay = orderRes.data?.data;
      if (!pay?.gateway_order_id) throw new Error('Could not start payment');

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

      const Razorpay = await loadRazorpay();
      openCheckout(Razorpay, {
        key: pay.razorpay_key_id,
        order: { id: pay.gateway_order_id, amount: Math.round(bookingAmount * 100) },
        name: 'Savidhi',
        description: `${chadhava.mapped.name} — ${selectedOfferings.length} offering${selectedOfferings.length > 1 ? 's' : ''}`,
        notes: { booking_id: booking.id, chadhava_event_id: selectedEventId },
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
        onFailure: (failure) => setError(failure.description || 'Payment failed'),
        onDismiss: () => setError('Payment cancelled. Your booking is reserved.'),
      });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Booking failed');
    } finally {
      setSubmitting(false);
    }
  };

  // Confirmation view
  if (step === 3) {
    return (
      <div className="min-h-screen bg-surface-warm flex items-start justify-center pt-12 sm:pt-20 px-4">
        <div className="bg-white border border-orange-100 rounded-2xl shadow-sm p-8 sm:p-12 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5 ring-4 ring-green-50">
            <Check className="w-10 h-10 text-green-600" strokeWidth={3} />
          </div>
          <h2 className="text-2xl font-bold text-text-primary mb-2">Chadhava Booking Confirmed!</h2>
          {confirmedId && confirmedId !== 'confirmed' && (
            <p className="text-xs text-text-muted mb-4">Booking ID: {confirmedId.slice(0, 8)}</p>
          )}
          <p className="text-sm text-text-secondary mb-7 leading-relaxed">
            Track your chadhava status in your bookings.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link href="/bookings" className="flex-1">
              <Button size="lg" className="w-full">My Bookings</Button>
            </Link>
            <Link href="/" className="flex-1">
              <Button variant="outline" size="lg" className="w-full">Home</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-warm">
      {/* Top bar */}
      <div className="bg-white border-b border-orange-100 sticky top-0 z-10 backdrop-blur-sm">
        <div className="section-container max-w-6xl flex items-center gap-3 py-3.5">
          <button
            onClick={back}
            className="w-9 h-9 rounded-full bg-white border border-border-DEFAULT flex items-center justify-center text-text-secondary hover:border-primary-300 hover:bg-primary-50 hover:text-primary-500 transition flex-shrink-0"
            aria-label="Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider leading-none">Book Chadhava</p>
            <h1 className="text-base font-bold text-text-primary truncate mt-1">{chadhava.mapped.name}</h1>
          </div>
        </div>
      </div>

      {/* Stepper */}
      <div className="section-container max-w-6xl pt-5 pb-2">
        <div className="flex items-center justify-between gap-1 sm:gap-2 max-w-2xl mx-auto">
          {STEP_LABELS.map((label, i) => {
            const isDone = i < step;
            const isActive = i === step;
            return (
              <div key={label} className="flex items-center flex-1">
                <div className="flex flex-col items-center gap-1.5 flex-1">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      isDone
                        ? 'bg-primary-500 text-white'
                        : isActive
                        ? 'bg-primary-500 text-white ring-4 ring-primary-100'
                        : 'bg-white border-2 border-border-DEFAULT text-text-muted'
                    }`}
                  >
                    {isDone ? <Check className="w-4 h-4" strokeWidth={3} /> : i + 1}
                  </div>
                  <span
                    className={`text-[10px] sm:text-[11px] text-center leading-tight transition-colors ${
                      isActive ? 'text-primary-700 font-bold' : isDone ? 'text-text-secondary font-medium' : 'text-text-muted'
                    }`}
                  >
                    {label}
                  </span>
                </div>
                {i < STEP_LABELS.length - 1 && (
                  <div className={`flex-1 h-0.5 -mt-5 mx-1 sm:mx-2 transition-colors ${
                    isDone ? 'bg-primary-500' : 'bg-border-DEFAULT'
                  }`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="section-container max-w-6xl pt-4 pb-6 sm:pb-8">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid lg:grid-cols-[7fr_5fr] gap-6 lg:gap-10 lg:items-start">
          {/* LEFT — step content */}
          <div>
            {/* Step 0: Pick Event */}
            {step === 0 && (
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-text-primary mb-1">Select an upcoming event</h2>
                <p className="text-sm text-text-secondary mb-5">Choose a date for your chadhava.</p>

                {events.length === 0 ? (
                  <div className="border border-orange-100 bg-white rounded-xl p-8 text-center text-text-secondary">
                    No upcoming events scheduled.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {events.map((e) => {
                      const d = new Date(e.start_time);
                      const active = selectedEventId === e.id;
                      return (
                        <button
                          key={e.id}
                          onClick={() => setSelectedEventId(e.id)}
                          className={`w-full border-2 rounded-xl p-4 text-left transition-all ${
                            active
                              ? 'border-primary-500 bg-primary-50 shadow-sm'
                              : 'border-orange-100 bg-white hover:border-primary-300'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                              active ? 'bg-primary-500 text-white' : 'bg-primary-50 text-primary-500'
                            }`}>
                              <Calendar className="w-5 h-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-text-primary">
                                {d.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
                              </p>
                              <p className="text-xs text-text-secondary mt-0.5">
                                {d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                {e.pujari_name && ` · Pujari: ${e.pujari_name}`}
                              </p>
                            </div>
                            <span className="text-[10px] uppercase tracking-wider text-primary-600 font-bold flex-shrink-0">
                              {e.status}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Step 1: Offerings */}
            {step === 1 && (
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-text-primary mb-1">Select your offerings</h2>
                <p className="text-sm text-text-secondary mb-5">Tap + / − to adjust quantities.</p>
                <div className="space-y-2.5">
                  {offerings.map((o) => {
                    const qty = offeringsQty[o.id] ?? 0;
                    const active = qty > 0;
                    return (
                      <div
                        key={o.id}
                        className={`border-2 rounded-xl p-3 sm:p-4 bg-white transition-all ${
                          active ? 'border-primary-400 shadow-sm' : 'border-orange-100'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {o.images[0] && (
                            <img
                              src={o.images[0]}
                              alt={o.name}
                              className="w-14 h-14 rounded-lg object-cover ring-1 ring-orange-100 flex-shrink-0"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-text-primary leading-snug">{o.name}</p>
                            {o.benefit && <p className="text-xs text-text-muted mt-0.5 leading-snug">{o.benefit}</p>}
                            <p className="text-sm font-bold text-primary-600 mt-1.5">₹{o.price}</p>
                          </div>
                          <div className="flex items-center gap-1.5 bg-primary-50 rounded-full p-0.5 flex-shrink-0">
                            <button
                              onClick={() => bumpQty(o.id, -1)}
                              disabled={qty === 0}
                              className="w-7 h-7 rounded-full bg-white border border-primary-200 flex items-center justify-center text-primary-500 hover:bg-primary-100 transition disabled:opacity-30 disabled:hover:bg-white"
                              aria-label="Decrease quantity"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="w-6 text-center text-sm font-bold text-primary-700 tabular-nums">{qty}</span>
                            <button
                              onClick={() => bumpQty(o.id, 1)}
                              className="w-7 h-7 rounded-full bg-primary-500 text-white flex items-center justify-center hover:bg-primary-600 transition"
                              aria-label="Increase quantity"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 2: Devotees + address */}
            {step === 2 && (
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-text-primary mb-1">Devotee details</h2>
                <p className="text-sm text-text-secondary mb-4">Names and gotras for the chadhava sankalpa.</p>

                <div className="space-y-3 mb-3">
                  {devotees.map((d, i) => (
                    <div
                      key={i}
                      className="bg-white border border-orange-100 rounded-xl p-3.5 sm:p-4 space-y-2.5 shadow-[0_1px_2px_rgba(232,129,58,0.04)]"
                    >
                      <div className="flex justify-between items-center">
                        <p className="text-[11px] font-bold text-primary-600 uppercase tracking-wider">Devotee {i + 1}</p>
                        {devotees.length > 1 && (
                          <button onClick={() => removeDevotee(i)} className="text-xs text-red-500 hover:underline font-medium">
                            Remove
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2.5">
                        <input
                          placeholder="Full Name"
                          value={d.name}
                          onChange={(e) =>
                            setDevotees((prev) => prev.map((x, k) => (k === i ? { ...x, name: e.target.value } : x)))
                          }
                          className="border border-orange-100 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition"
                        />
                        <input
                          placeholder="Gotra"
                          value={d.gotra}
                          onChange={(e) =>
                            setDevotees((prev) => prev.map((x, k) => (k === i ? { ...x, gotra: e.target.value } : x)))
                          }
                          className="border border-orange-100 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition"
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={addDevotee}
                  className="text-sm text-primary-600 font-semibold hover:text-primary-700 mb-6 inline-flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" /> Add another devotee
                </button>

                {sendHamper && (
                  <>
                    <h2 className="text-lg sm:text-xl font-bold text-text-primary mb-1">Prasad delivery address</h2>
                    <p className="text-sm text-text-secondary mb-3">Where should we send the prasad hamper?</p>
                    <div className="space-y-2.5 mb-6">
                      <input
                        placeholder="Full address"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        className="w-full border border-orange-100 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition"
                      />
                      <input
                        placeholder="Pincode"
                        value={pincode}
                        onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
                        maxLength={6}
                        className="w-full border border-orange-100 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition"
                      />
                    </div>
                  </>
                )}

                <h2 className="text-lg sm:text-xl font-bold text-text-primary mb-1">Sankalp <span className="text-sm font-normal text-text-muted">(optional)</span></h2>
                <p className="text-sm text-text-secondary mb-3">Your intention for the chadhava.</p>
                <textarea
                  placeholder="e.g. For the well-being of my family"
                  value={sankalp}
                  onChange={(e) => setSankalp(e.target.value)}
                  rows={3}
                  className="w-full border border-orange-100 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition resize-none"
                />
              </div>
            )}

            {/* Desktop action row */}
            <div className="hidden lg:flex gap-3 mt-6">
              {step > 0 && (
                <Button variant="outline" className="flex-1 sm:flex-initial sm:min-w-[8rem]" size="lg" onClick={back}>
                  Back
                </Button>
              )}
              <Button
                className="flex-1"
                size="lg"
                disabled={!canAdvance(step) || submitting}
                onClick={step === 2 ? handleSubmit : advance}
              >
                {submitting ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Booking…</>
                ) : step === 2 ? (
                  `Confirm Booking · ₹${totalPrice.toLocaleString()}`
                ) : (
                  `Continue${step === 1 && totalPrice > 0 ? ` · ₹${totalPrice.toLocaleString()}` : ''}`
                )}
              </Button>
            </div>
          </div>

          {/* RIGHT — sticky summary */}
          <aside className="lg:sticky lg:top-24">
            <div className="bg-white border border-orange-100 rounded-2xl shadow-[0_1px_2px_rgba(232,129,58,0.04)] overflow-hidden">
              <div className="px-5 py-4 border-b border-orange-50">
                <h3 className="font-bold text-text-primary text-base">Booking Summary</h3>
              </div>
              <div className="p-5 space-y-3 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <span className="text-text-secondary">Chadhava</span>
                  <span className="font-semibold text-text-primary text-right">{chadhava.mapped.name}</span>
                </div>
                {selectedEvent && (
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-text-secondary">Date</span>
                    <span className="font-semibold text-text-primary text-right">
                      {new Date(selectedEvent.start_time).toLocaleString('en-IN', {
                        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                      })}
                    </span>
                  </div>
                )}
                {selectedOfferings.length > 0 && (
                  <div className="pt-2 border-t border-orange-50 space-y-1.5">
                    {selectedOfferings.map((o) => (
                      <div key={o.id} className="flex justify-between gap-3">
                        <span className="text-text-secondary truncate">{o.name} × {offeringsQty[o.id]}</span>
                        <span className="font-medium text-text-primary tabular-nums flex-shrink-0">
                          ₹{(o.price * offeringsQty[o.id]).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex items-center justify-between gap-3 pt-3 border-t border-orange-50">
                  <span className="font-bold text-text-primary">Total</span>
                  <span className="font-bold text-primary-600 text-xl tabular-nums">₹{totalPrice.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Mobile sticky action bar */}
      <div className="lg:hidden sticky bottom-0 bg-white/95 backdrop-blur-sm border-t border-border-light py-3 px-4 z-20">
        <div className="flex gap-3 max-w-2xl mx-auto">
          {step > 0 && (
            <Button variant="outline" size="lg" onClick={back} className="px-5">Back</Button>
          )}
          <Button
            className="flex-1"
            size="lg"
            disabled={!canAdvance(step) || submitting}
            onClick={step === 2 ? handleSubmit : advance}
          >
            {submitting ? (
              <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Booking…</>
            ) : step === 2 ? (
              `Confirm · ₹${totalPrice.toLocaleString()}`
            ) : (
              `Continue${step === 1 && totalPrice > 0 ? ` · ₹${totalPrice.toLocaleString()}` : ''}`
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
