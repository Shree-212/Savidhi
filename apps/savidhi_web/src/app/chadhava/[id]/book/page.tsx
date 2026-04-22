'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Calendar, Loader2, Minus, Plus } from 'lucide-react';
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
  const { id } = use(params);
  const router = useRouter();

  // Data
  const [chadhava, setChadhava] = useState<any>(null);
  const [events, setEvents] = useState<ChadhavaEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Flow state
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

  // Auth guard
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!getAccessToken()) {
      router.replace(`/login?redirect=/chadhava/${id}/book`);
    }
  }, [id, router]);

  // Load chadhava + events
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

  if (error || !chadhava) {
    return (
      <div className="section-container py-20 text-center text-text-secondary">
        {error || 'Chadhava not found.'} <Link href="/chadhava" className="text-primary-500 underline">Go back</Link>
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

  return (
    <div className="min-h-screen bg-surface-warm">
      <div className="bg-white border-b border-border-light sticky top-0 z-10">
        <div className="section-container flex items-center gap-4 py-3">
          <button onClick={back}>
            <ArrowLeft className="w-5 h-5 text-text-primary" />
          </button>
          <h1 className="font-semibold text-text-primary">Book {chadhava.mapped.name}</h1>
        </div>
      </div>

      <div className="section-container py-4">
        {/* Stepper */}
        <div className="flex items-center justify-between mb-8 max-w-2xl mx-auto">
          {STEP_LABELS.map((label, i) => (
            <div key={label} className="flex flex-col items-center gap-1.5 flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                i <= step ? 'bg-primary-500 text-white' : 'bg-border-light text-text-muted'
              }`}>{i + 1}</div>
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
          {/* Step 0: Event */}
          {step === 0 && (
            <div>
              <h2 className="font-semibold text-text-primary mb-4">Select Upcoming Event</h2>
              {events.length === 0 ? (
                <div className="border border-border-DEFAULT rounded-xl p-6 text-center text-text-secondary">
                  No upcoming events scheduled.
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
                          active ? 'border-primary-500 bg-primary-50' : 'border-border-DEFAULT bg-white hover:border-primary-300'
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
              <Button className="w-full" size="lg" disabled={!canAdvance(0)} onClick={advance}>
                Continue
              </Button>
            </div>
          )}

          {/* Step 1: Offerings */}
          {step === 1 && (
            <div>
              <h2 className="font-semibold text-text-primary mb-1">Select Your Offerings</h2>
              <p className="text-xs text-text-secondary mb-4">Tap + / − to adjust quantities.</p>
              <div className="space-y-3 mb-6">
                {offerings.map((o) => {
                  const qty = offeringsQty[o.id] ?? 0;
                  return (
                    <div key={o.id} className={`border rounded-xl p-3 bg-white ${qty > 0 ? 'border-primary-400' : 'border-border-DEFAULT'}`}>
                      <div className="flex items-start gap-3">
                        {o.images[0] && (
                          <img src={o.images[0]} alt={o.name} className="w-14 h-14 rounded-lg object-cover" />
                        )}
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-text-primary">{o.name}</p>
                          {o.benefit && <p className="text-xs text-text-secondary mt-0.5">{o.benefit}</p>}
                          <p className="text-sm text-primary-600 font-bold mt-1">₹{o.price}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => bumpQty(o.id, -1)}
                            disabled={qty === 0}
                            className="w-8 h-8 rounded-full border border-border-DEFAULT flex items-center justify-center disabled:opacity-30"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="w-6 text-center text-sm font-medium">{qty}</span>
                          <button
                            onClick={() => bumpQty(o.id, 1)}
                            className="w-8 h-8 rounded-full bg-primary-500 text-white flex items-center justify-center"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="bg-white border border-border-DEFAULT rounded-xl p-4 mb-6 flex justify-between">
                <span className="text-sm font-semibold">Subtotal</span>
                <span className="font-bold text-primary-600">₹{totalPrice.toLocaleString()}</span>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" size="lg" onClick={back}>Back</Button>
                <Button className="flex-1" size="lg" disabled={!canAdvance(1)} onClick={advance}>
                  Continue · ₹{totalPrice.toLocaleString()}
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Devotees + address */}
          {step === 2 && (
            <div>
              <h2 className="font-semibold text-text-primary mb-3">Devotee Details</h2>
              <div className="space-y-3 mb-4">
                {devotees.map((d, i) => (
                  <div key={i} className="border border-border-DEFAULT rounded-xl p-3 bg-white space-y-2">
                    <div className="flex justify-between items-center">
                      <p className="text-xs font-semibold text-text-secondary">Devotee {i + 1}</p>
                      {devotees.length > 1 && (
                        <button onClick={() => removeDevotee(i)} className="text-xs text-red-500 hover:underline">Remove</button>
                      )}
                    </div>
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
                  </div>
                ))}
              </div>
              <button onClick={addDevotee} className="text-sm text-primary-500 font-medium mb-6">
                + Add another devotee
              </button>

              {sendHamper && (
                <>
                  <h2 className="font-semibold text-text-primary mb-3">Prasad Delivery Address</h2>
                  <div className="space-y-3 mb-6">
                    <input
                      placeholder="Full address"
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

              <h2 className="font-semibold text-text-primary mb-3">Sankalp — optional</h2>
              <textarea
                placeholder="Your intention"
                value={sankalp}
                onChange={(e) => setSankalp(e.target.value)}
                rows={3}
                className="w-full border border-border-DEFAULT rounded-xl px-4 py-3 text-sm mb-6 resize-none focus:outline-none focus:ring-2 focus:ring-primary-300"
              />

              {/* Price summary */}
              <div className="bg-white border border-border-DEFAULT rounded-xl p-4 mb-6 text-sm space-y-2">
                <div className="flex justify-between"><span className="text-text-secondary">Chadhava</span><span>{chadhava.mapped.name}</span></div>
                {selectedEvent && (
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Date</span>
                    <span>{new Date(selectedEvent.start_time).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-border-light">
                  {selectedOfferings.map((o) => (
                    <div key={o.id} className="flex justify-between">
                      <span className="text-text-secondary">{o.name} × {offeringsQty[o.id]}</span>
                      <span>₹{(o.price * offeringsQty[o.id]).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between pt-2 border-t border-border-light">
                  <span className="font-semibold">Total</span>
                  <span className="font-bold text-primary-600">₹{totalPrice.toLocaleString()}</span>
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" size="lg" onClick={back}>Back</Button>
                <Button className="flex-1" size="lg" disabled={!canAdvance(2) || submitting} onClick={handleSubmit}>
                  {submitting ? (<><Loader2 className="w-4 h-4 animate-spin mr-2" /> Booking…</>) : `Confirm · ₹${totalPrice.toLocaleString()}`}
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
              <h2 className="text-xl font-bold text-text-primary mb-2">Chadhava Booking Confirmed!</h2>
              {confirmedId && confirmedId !== 'confirmed' && (
                <p className="text-xs text-text-muted mb-4">Booking ID: {confirmedId.slice(0, 8)}</p>
              )}
              <p className="text-sm text-text-secondary mb-8">Track your chadhava status in your bookings.</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-md mx-auto">
                <Link href="/bookings" className="flex-1"><Button size="lg" className="w-full">My Bookings</Button></Link>
                <Link href="/" className="flex-1"><Button variant="outline" size="lg" className="w-full">Home</Button></Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
