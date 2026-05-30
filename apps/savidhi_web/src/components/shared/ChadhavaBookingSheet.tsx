'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Calendar, Check, Loader2, Minus, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { chadhavaEventService, paymentService } from '@/lib/services';
import { getAccessToken } from '@/lib/auth';
import { loadRazorpay, openCheckout } from '@/lib/razorpay';
import { trackEvent, generateEventId } from '@/lib/analytics';
import { AuthSheet } from '@/components/shared/AuthSheet';

interface ChadhavaEvent {
  id: string;
  start_time: string;
  max_bookings: number;
  status: string;
  stage: string;
  pujari_name?: string;
}

interface Offering {
  id: string;
  name: string;
  benefit: string;
  price: number;
  images: string[];
}

interface ChadhavaBookingSheetProps {
  chadhavaId: string;
  chadhavaName: string;
  chadhavaRaw: Record<string, unknown> & {
    booking_mode?: 'ONE_TIME' | 'SUBSCRIPTION' | 'BOTH';
    send_hamper?: boolean;
    shlok?: string;
    offerings?: Array<{ id: string; item_name?: string; name?: string; benefit?: string; price?: number | string; images?: string[] }>;
    slug?: string;
  };
  /** Offering IDs → qty to pre-seed at step 1. */
  initialOfferings?: Record<string, number>;
  open: boolean;
  onClose: () => void;
  fullPage?: boolean;
}

const STEP_LABELS = ['Pick Event', 'Offerings', 'Devotees & Address', 'Confirm'];
const MAX_DEVOTEES = 6;

export function ChadhavaBookingSheet({
  chadhavaId,
  chadhavaName,
  chadhavaRaw,
  initialOfferings,
  open,
  onClose,
  fullPage = false,
}: ChadhavaBookingSheetProps) {
  const [events, setEvents] = useState<ChadhavaEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [step, setStep] = useState(0);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [offeringsQty, setOfferingsQty] = useState<Record<string, number>>(initialOfferings ?? {});
  const [bookingType, setBookingType] = useState<'ONE_TIME' | 'SUBSCRIPTION'>(
    chadhavaRaw.booking_mode === 'SUBSCRIPTION' ? 'SUBSCRIPTION' : 'ONE_TIME',
  );
  const [subscriptionCount, setSubscriptionCount] = useState<number>(4);

  const [devotees, setDevotees] = useState<Array<{ name: string; gotra: string }>>([
    { name: '', gotra: '' },
  ]);
  const [address, setAddress] = useState('');
  const [pincode, setPincode] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [confirmedId, setConfirmedId] = useState<string | null>(null);

  // Inline auth gate — see BookingSheet for the rationale.
  const [needsAuth, setNeedsAuth] = useState(false);
  useEffect(() => {
    if (!open) return;
    if (typeof window === 'undefined') return;
    setNeedsAuth(!getAccessToken());
  }, [open]);

  // Reset + tracking when the sheet opens.
  useEffect(() => {
    if (!open) return;
    setStep(0);
    setError('');
    setConfirmedId(null);
    setOfferingsQty(initialOfferings ?? {});
    trackEvent('add_to_cart', {
      content_type: 'product',
      content_category: 'chadhava',
      content_ids: [chadhavaRaw.slug || chadhavaId],
      content_name: chadhavaName,
      offerings: initialOfferings ? Object.entries(initialOfferings).map(([id, q]) => ({ id, q })) : [],
    });
  }, [open, initialOfferings, chadhavaId, chadhavaName, chadhavaRaw.slug]);

  // Lock body scroll while sheet is open (skipped in fullPage mode).
  useEffect(() => {
    if (!open || fullPage) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open, fullPage]);

  // Fetch upcoming events on open.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError('');
        const eventsRes = await chadhavaEventService.list({ chadhava_id: chadhavaId, upcoming: true, limit: 20 });
        if (cancelled) return;
        const evs = (eventsRes.data?.data ?? []) as ChadhavaEvent[];
        const bookable = evs.filter((e) => e.status === 'NOT_STARTED' && e.stage === 'YET_TO_START');
        bookable.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
        setEvents(bookable);
      } catch (err) {
        const e = err as { response?: { data?: { message?: string } }; message?: string };
        if (!cancelled) setError(e.response?.data?.message || e.message || 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, chadhavaId]);

  const idempotencyKey = useMemo(() => {
    if (!open) return '';
    return typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }, [open]);

  // Meta Pixel + CAPI dedup id for the Purchase event (shared between the
  // browser Pixel fire and the server-side CAPI Purchase).
  const purchaseEventId = useMemo(() => (open ? generateEventId() : ''), [open]);

  const offerings: Offering[] = (chadhavaRaw.offerings ?? []).map((o) => ({
    id: o.id,
    name: o.item_name ?? o.name ?? '',
    benefit: o.benefit ?? '',
    price: Number(o.price ?? 0),
    images: o.images ?? [],
  }));

  const selectedOfferings = offerings.filter((o) => (offeringsQty[o.id] ?? 0) > 0);
  const perDevoteeTotal = selectedOfferings.reduce((s, o) => s + o.price * (offeringsQty[o.id] ?? 0), 0);
  const totalPrice = perDevoteeTotal * Math.max(1, devotees.length);
  const sendHamper = !!chadhavaRaw.send_hamper;
  const selectedEvent = events.find((e) => e.id === selectedEventId);

  const advance = () => setStep((s) => Math.min(s + 1, STEP_LABELS.length - 1));
  const back = () => (step > 0 ? setStep(step - 1) : onClose());

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

  const addDevotee = () => setDevotees((prev) => (prev.length >= MAX_DEVOTEES ? prev : [...prev, { name: '', gotra: '' }]));
  const removeDevotee = (i: number) =>
    setDevotees((prev) => (prev.length > 1 ? prev.filter((_, k) => k !== i) : prev));

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      setError('');

      trackEvent('initiate_checkout', {
        content_type: 'product',
        content_category: 'chadhava',
        content_ids: [chadhavaRaw.slug || chadhavaId],
        content_name: chadhavaName,
        value: totalPrice,
        currency: 'INR',
      });

      const bookingPayload = {
        chadhava_event_id: selectedEventId,
        prasad_delivery_address: sendHamper ? `${address}${pincode ? `, PIN: ${pincode}` : ''}` : undefined,
        devotees: devotees.map((d) => ({ name: d.name.trim(), gotra: d.gotra.trim() })),
        offerings: selectedOfferings.map((o) => ({
          offering_id: o.id,
          quantity: offeringsQty[o.id],
        })),
        booking_type: bookingType,
        ...(bookingType === 'SUBSCRIPTION' ? { subscription_count: subscriptionCount } : {}),
      };

      const orderRes = await paymentService.createOrder({
        booking_type: 'CHADHAVA',
        booking_payload: bookingPayload,
        booking_idempotency_key: idempotencyKey,
        meta_event_ids: { purchase: purchaseEventId },
      });
      const pay = orderRes.data?.data;
      if (!pay?.gateway_order_id) throw new Error('Could not start payment');
      const bookingAmount = Number(pay.amount);

      if (pay.stub) {
        const verifyRes = await paymentService.verify({
          payment_id: pay.id,
          gateway_order_id: pay.gateway_order_id,
          gateway_payment_id: `pay_stub_${Date.now()}`,
          gateway_signature: 'stub',
        });
        const verifiedBooking = verifyRes.data?.data?.booking;
        if (!verifiedBooking?.id) throw new Error('Booking materialization failed');
        setConfirmedId(verifiedBooking.id);
        trackEvent('purchase', {
          content_type: 'product',
          content_category: 'chadhava',
          content_ids: [chadhavaRaw.slug || chadhavaId],
          content_name: chadhavaName,
          value: totalPrice,
          currency: 'INR',
          transaction_id: verifiedBooking.id,
        }, { eventId: purchaseEventId, pixelOnly: true });
        advance();
        return;
      }

      const Razorpay = await loadRazorpay();
      openCheckout(Razorpay, {
        key: pay.razorpay_key_id,
        order: { id: pay.gateway_order_id, amount: Math.round(bookingAmount * 100) },
        name: 'Savidhi',
        description: `${chadhavaName} — ${selectedOfferings.length} offering${selectedOfferings.length > 1 ? 's' : ''}`,
        notes: { chadhava_event_id: selectedEventId },
        recurring: !!pay.recurring,
        customer_id: pay.razorpay_customer_id ?? null,
        onSuccess: async (resp) => {
          try {
            const verifyRes = await paymentService.verify({
              payment_id: pay.id,
              gateway_order_id: resp.razorpay_order_id,
              gateway_payment_id: resp.razorpay_payment_id,
              gateway_signature: resp.razorpay_signature,
            });
            const verifiedBooking = verifyRes.data?.data?.booking;
            if (!verifiedBooking?.id) throw new Error('Booking confirmation failed');
            setConfirmedId(verifiedBooking.id);
            trackEvent('purchase', {
              content_type: 'product',
              content_category: 'chadhava',
              content_ids: [chadhavaRaw.slug || chadhavaId],
              content_name: chadhavaName,
              value: totalPrice,
              currency: 'INR',
              transaction_id: verifiedBooking.id,
            }, { eventId: purchaseEventId, pixelOnly: true });
            advance();
          } catch (verifyErr) {
            const e = verifyErr as { response?: { data?: { message?: string } } };
            setError(e.response?.data?.message || 'Payment verification failed');
          }
        },
        onFailure: (failure) => setError(failure.description || 'Payment failed. No booking was created — please try again.'),
        onDismiss: () => setError('Payment cancelled. No booking was created — please try again.'),
      });
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setError(e.response?.data?.message || e.message || 'Booking failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  const shellClass = fullPage
    ? 'relative w-full bg-surface-warm min-h-screen flex flex-col'
    : 'fixed inset-0 z-[100] flex items-stretch';

  const panelClass = fullPage
    ? 'flex-1 flex flex-col bg-surface-warm'
    : 'relative ml-auto w-full sm:max-w-[480px] h-full bg-surface-warm shadow-2xl flex flex-col sheet-slide-up';

  return (
    <div className={shellClass} role="dialog" aria-modal="true" aria-label="Book Chadhava">
      {!fullPage && (
        <button
          aria-label="Close"
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      <div className={panelClass}>
        {step === 3 ? (
          <div className="min-h-screen bg-surface-warm flex items-start justify-center pt-12 sm:pt-20 px-4 pb-8">
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
                <button
                  className="flex-1 inline-flex items-center justify-center rounded-xl border-2 border-orange-200 text-text-primary font-semibold text-sm px-4 py-3 hover:bg-orange-50 transition"
                  onClick={onClose}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="bg-white border-b border-orange-100 sticky top-0 z-10 backdrop-blur-sm">
              <div className="flex items-center gap-3 px-4 py-3.5">
                <button
                  onClick={back}
                  className="w-9 h-9 rounded-full bg-white border border-border-DEFAULT flex items-center justify-center text-text-secondary hover:border-primary-300 hover:bg-primary-50 hover:text-primary-500 transition flex-shrink-0"
                  aria-label="Back"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider leading-none">Book Chadhava</p>
                  <h1 className="text-base font-bold text-text-primary truncate mt-1">{chadhavaName}</h1>
                </div>
                {!fullPage && (
                  <button
                    onClick={onClose}
                    aria-label="Close"
                    className="w-9 h-9 rounded-full bg-white border border-border-DEFAULT flex items-center justify-center text-text-secondary hover:border-primary-300 hover:bg-primary-50 hover:text-primary-500 transition flex-shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="px-4 pt-5 pb-2">
              <div className="flex items-center justify-between gap-1 sm:gap-2">
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

            <div className="flex-1 overflow-y-auto px-4 pt-4 pb-6">
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="mb-5 bg-white border border-orange-100 rounded-2xl p-4 shadow-[0_1px_2px_rgba(232,129,58,0.04)]">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-wider font-semibold text-text-muted">Total</p>
                    <p className="text-2xl font-bold text-primary-600 tabular-nums leading-none mt-1">₹{totalPrice.toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-text-secondary">{selectedOfferings.length} offering{selectedOfferings.length !== 1 ? 's' : ''} × {devotees.length} dev.</p>
                    {selectedEvent && (
                      <p className="text-xs text-text-muted mt-0.5">
                        {new Date(selectedEvent.start_time).toLocaleString('en-IN', {
                          day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                        })}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="w-7 h-7 text-primary-500 animate-spin" />
                </div>
              ) : (
                <>
                  {step === 0 && (
                    <div>
                      <h2 className="text-lg font-bold text-text-primary mb-1">Select an upcoming event</h2>
                      <p className="text-sm text-text-secondary mb-5">Choose a date for your chadhava.</p>

                      {chadhavaRaw.booking_mode === 'BOTH' && (
                        <div className="mb-5">
                          <p className="text-[11px] uppercase tracking-wider font-semibold text-text-muted mb-2">Booking Type</p>
                          <div className="flex gap-2">
                            {(['ONE_TIME', 'SUBSCRIPTION'] as const).map((opt) => {
                              const active = bookingType === opt;
                              return (
                                <button
                                  key={opt}
                                  onClick={() => setBookingType(opt)}
                                  className={`flex-1 px-4 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${
                                    active
                                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                                      : 'border-orange-100 bg-white text-text-secondary hover:border-primary-300'
                                  }`}
                                >
                                  {opt === 'ONE_TIME' ? 'One Time' : 'Subscription'}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {bookingType === 'SUBSCRIPTION' && (
                        <div className="mb-5">
                          <label className="text-[11px] uppercase tracking-wider font-semibold text-text-muted mb-2 block">
                            Number of events to auto-pay for
                          </label>
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => setSubscriptionCount((n) => Math.max(2, n - 1))}
                              className="w-10 h-10 rounded-lg border-2 border-orange-100 bg-white text-lg font-bold text-text-secondary hover:border-primary-300"
                              aria-label="Decrease"
                            >−</button>
                            <input
                              type="number"
                              min={2}
                              max={12}
                              value={subscriptionCount}
                              onChange={(e) => {
                                const n = Number(e.target.value);
                                if (Number.isInteger(n)) setSubscriptionCount(Math.min(12, Math.max(2, n)));
                              }}
                              className="w-20 h-10 text-center font-bold text-lg border-2 border-orange-100 rounded-lg focus:outline-none focus:border-primary-400"
                            />
                            <button
                              type="button"
                              onClick={() => setSubscriptionCount((n) => Math.min(12, n + 1))}
                              className="w-10 h-10 rounded-lg border-2 border-orange-100 bg-white text-lg font-bold text-text-secondary hover:border-primary-300"
                              aria-label="Increase"
                            >+</button>
                            <span className="text-xs text-text-muted">events (2–12)</span>
                          </div>
                        </div>
                      )}

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
                                    </p>
                                  </div>
                                  {/* Mirrors the puja sheet's "Available" pill — events here are already
                                      filtered to NOT_STARTED + YET_TO_START upstream, so the static label is safe. */}
                                  <span className="text-[10.5px] uppercase tracking-wide font-bold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full flex-shrink-0">
                                    Available
                                  </span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {step === 1 && (
                    <div>
                      <h2 className="text-lg font-bold text-text-primary mb-1">Select your offerings</h2>
                      <p className="text-sm text-text-secondary mb-5">Tap + / − to adjust quantities.</p>
                      <div className="space-y-2.5">
                        {offerings.map((o) => {
                          const qty = offeringsQty[o.id] ?? 0;
                          const active = qty > 0;
                          return (
                            <div
                              key={o.id}
                              className={`border-2 rounded-xl p-3 bg-white transition-all ${
                                active ? 'border-primary-400 shadow-sm' : 'border-orange-100'
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                {o.images[0] && (
                                  // eslint-disable-next-line @next/next/no-img-element
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
                                    className="w-7 h-7 rounded-full bg-white border border-primary-200 flex items-center justify-center text-primary-500 hover:bg-primary-100 transition disabled:opacity-30"
                                    aria-label="Decrease"
                                  >
                                    <Minus className="w-3.5 h-3.5" />
                                  </button>
                                  <span className="w-6 text-center text-sm font-bold text-primary-700 tabular-nums">{qty}</span>
                                  <button
                                    onClick={() => bumpQty(o.id, 1)}
                                    className="w-7 h-7 rounded-full bg-primary-500 text-white flex items-center justify-center hover:bg-primary-600 transition"
                                    aria-label="Increase"
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

                  {step === 2 && (
                    <div>
                      <h2 className="text-lg font-bold text-text-primary mb-1">Devotee details</h2>
                      <p className="text-sm text-text-secondary mb-4">Names & gotras for the chadhava sankalpa.</p>

                      <div className="space-y-3 mb-3">
                        {devotees.map((d, i) => (
                          <div
                            key={i}
                            className="bg-white border border-orange-100 rounded-xl p-3.5 space-y-2.5 shadow-[0_1px_2px_rgba(232,129,58,0.04)]"
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
                        disabled={devotees.length >= MAX_DEVOTEES}
                        className="text-sm text-primary-600 font-semibold hover:text-primary-700 mb-2 inline-flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Plus className="w-4 h-4" /> Add another devotee
                      </button>
                      {devotees.length > 1 && devotees.length < MAX_DEVOTEES && (
                        <p className="text-[11px] text-text-muted mb-4">Same offerings are applied for each devotee — total scales accordingly.</p>
                      )}

                      {sendHamper && (
                        <>
                          <h2 className="text-lg font-bold text-text-primary mb-1 mt-4">Prasad delivery address</h2>
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

                      {chadhavaRaw.shlok && (
                        <>
                          <h2 className="text-lg font-bold text-text-primary mb-1">Chadhava Shlok</h2>
                          <p className="text-sm text-text-secondary mb-3">This shlok will be recited during your chadhava.</p>
                          <div className="w-full border border-orange-100 rounded-xl px-4 py-3 text-sm bg-orange-50 text-text-primary whitespace-pre-line leading-relaxed">
                            {chadhavaRaw.shlok}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="bg-white/95 backdrop-blur-sm border-t border-border-light py-3 px-4">
              <div className="flex gap-3">
                {step > 0 && (
                  <Button variant="outline" size="lg" onClick={back} className="px-5">
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
                    `Confirm · ₹${totalPrice.toLocaleString()}`
                  ) : (
                    `Continue${totalPrice > 0 ? ` · ₹${totalPrice.toLocaleString()}` : ''}`
                  )}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      <AuthSheet
        open={needsAuth}
        onClose={() => { setNeedsAuth(false); onClose(); }}
        onSuccess={() => setNeedsAuth(false)}
        contextLine={`Log in to complete your chadhava — ${chadhavaName}`}
      />
    </div>
  );
}
