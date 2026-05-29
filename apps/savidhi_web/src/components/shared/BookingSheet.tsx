'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Calendar, Check, Loader2, User, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { paymentService, pujaEventService } from '@/lib/services';
import { getAccessToken } from '@/lib/auth';
import { loadRazorpay, openCheckout } from '@/lib/razorpay';
import { trackEvent, generateEventId } from '@/lib/analytics';
import { AuthSheet } from '@/components/shared/AuthSheet';

interface PujaEvent {
  id: string;
  start_time: string;
  max_bookings: number;
  status: string;
  stage: string;
  pujari_name?: string;
}

interface BookingSheetProps {
  pujaId: string;            // UUID or slug — backend accepts both
  pujaName: string;
  pujaRaw: Record<string, unknown> & {
    booking_mode?: 'ONE_TIME' | 'SUBSCRIPTION' | 'BOTH';
    send_hamper?: boolean;
    shlok?: string;
    price_for_1?: number | string;
    price_for_2?: number | string;
    price_for_4?: number | string;
    price_for_6?: number | string;
    slug?: string;
  };
  initialDevoteeCount?: number;
  open: boolean;
  onClose: () => void;
  /** When true, render full-bleed (used by the standalone /book route). */
  fullPage?: boolean;
}

const DEVOTEE_TIER_OPTIONS = [
  { count: 1, label: '1 Devotee', priceField: 'price_for_1' as const },
  { count: 2, label: '2 Devotees', priceField: 'price_for_2' as const },
  { count: 4, label: '4 Devotees', priceField: 'price_for_4' as const },
  { count: 6, label: '6 Devotees', priceField: 'price_for_6' as const },
];

const STEP_LABELS = ['Pick Event', 'Devotee Count', 'Devotees & Address', 'Confirm'];

export function BookingSheet({
  pujaId,
  pujaName,
  pujaRaw,
  initialDevoteeCount = 1,
  open,
  onClose,
  fullPage = false,
}: BookingSheetProps) {
  const [events, setEvents] = useState<PujaEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [step, setStep] = useState(0);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [devoteeCount, setDevoteeCount] = useState<number>(initialDevoteeCount);

  // Booking type honours the puja's booking_mode (admin restricts to one, or
  // allows both). For ONE_TIME-only puja → forced ONE_TIME; SUBSCRIPTION-only
  // → forced SUBSCRIPTION; BOTH → user picks.
  const [bookingType, setBookingType] = useState<'ONE_TIME' | 'SUBSCRIPTION'>(
    pujaRaw.booking_mode === 'SUBSCRIPTION' ? 'SUBSCRIPTION' : 'ONE_TIME',
  );
  const [subscriptionCount, setSubscriptionCount] = useState<number>(4);

  const [devotees, setDevotees] = useState<Array<{ name: string; gotra: string; relation: string }>>([
    { name: '', gotra: '', relation: 'Self' },
  ]);
  const [shipToName, setShipToName] = useState('');
  const [shipToPhone, setShipToPhone] = useState('');
  const [shipToLine1, setShipToLine1] = useState('');
  const [shipToLine2, setShipToLine2] = useState('');
  const [shipToCity, setShipToCity] = useState('');
  const [shipToState, setShipToState] = useState('');
  const [pincode, setPincode] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [confirmedId, setConfirmedId] = useState<string | null>(null);

  // Auth gate — when the sheet opens for an anonymous user, present an inline
  // AuthSheet instead of jumping out to /login. Keeps the booking funnel
  // intact: the user logs in, the AuthSheet closes, and they continue from
  // step 0 with a freshly-set token.
  const [needsAuth, setNeedsAuth] = useState(false);
  useEffect(() => {
    if (!open) return;
    if (typeof window === 'undefined') return;
    setNeedsAuth(!getAccessToken());
  }, [open]);

  // Reset to step 0 each time the sheet opens, and emit AddToCart for the
  // funnel. Devotee count is seeded from the package the user clicked on.
  useEffect(() => {
    if (!open) return;
    setStep(0);
    setError('');
    setConfirmedId(null);
    setDevoteeCount(initialDevoteeCount);
    trackEvent('add_to_cart', {
      content_type: 'puja',
      content_ids: [pujaRaw.slug || pujaId],
      content_name: pujaName,
      devotee_count: initialDevoteeCount,
    });
  }, [open, initialDevoteeCount, pujaId, pujaName, pujaRaw.slug]);

  // Lock body scroll while the sheet is open (mobile + desktop) so users don't
  // accidentally scroll the page behind it. Restored on close/unmount.
  useEffect(() => {
    if (!open || fullPage) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open, fullPage]);

  // Fetch upcoming events for this puja the first time the sheet opens. We
  // intentionally re-fetch on each open in case the user comes back later and
  // the previous selection has rolled past its start time.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError('');
        const eventsRes = await pujaEventService.list({ puja_id: pujaId, upcoming: true, limit: 20 });
        if (cancelled) return;
        const evs = (eventsRes.data?.data ?? []) as PujaEvent[];
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
  }, [open, pujaId]);

  // Sync the devotee[] array length to the chosen tier.
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

  // Idempotency key — generated once per sheet open so a duplicate-tap of
  // Confirm doesn't create two orders for the same intent.
  const idempotencyKey = useMemo(() => {
    if (!open) return '';
    return typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }, [open]);

  // Meta Pixel + CAPI dedup id for the Purchase event. Generated once per
  // sheet open and shared between the browser Pixel fire (after Razorpay
  // success) and the server-side CAPI Purchase (fired from /verify and
  // the webhook against payments.meta_event_ids.purchase).
  const purchaseEventId = useMemo(() => (open ? generateEventId() : ''), [open]);

  const priceField = DEVOTEE_TIER_OPTIONS.find((o) => o.count === devoteeCount)?.priceField ?? 'price_for_1';
  const unitPrice = Number(pujaRaw[priceField] ?? pujaRaw.price_for_1 ?? 0);
  const totalPrice = unitPrice;
  const sendHamper = !!pujaRaw.send_hamper;
  const selectedEvent = events.find((e) => e.id === selectedEventId);

  const advance = () => setStep((s) => Math.min(s + 1, STEP_LABELS.length - 1));
  const back = () => (step > 0 ? setStep(step - 1) : onClose());

  const canAdvanceFromStep = (s: number) => {
    if (s === 0) return !!selectedEventId;
    if (s === 1) return devoteeCount >= 1;
    if (s === 2) {
      if (devotees.some((d) => !d.name.trim() || !d.gotra.trim())) return false;
      if (sendHamper) {
        if (!shipToName.trim() || !shipToLine1.trim() || !shipToCity.trim() || !shipToState.trim()) return false;
        if (pincode.length !== 6) return false;
        if (shipToPhone.replace(/\D/g, '').length !== 10) return false;
      }
      return true;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!selectedEventId) return;
    try {
      setSubmitting(true);
      setError('');

      trackEvent('initiate_checkout', {
        content_type: 'puja',
        content_ids: [pujaRaw.slug || pujaId],
        content_name: pujaName,
        devotee_count: devoteeCount,
        value: totalPrice,
        currency: 'INR',
      });

      // Deferred-booking flow: server validates payload, creates the Razorpay
      // order, and stashes the booking. The booking row is inserted only on
      // successful /verify so failed payments never leave ghost bookings.
      const bookingPayload = {
        puja_event_id: selectedEventId,
        devotee_count: devoteeCount,
        ...(sendHamper ? {
          ship_to_name: shipToName.trim(),
          ship_to_phone: shipToPhone.replace(/\D/g, '').slice(-10),
          ship_to_line1: shipToLine1.trim(),
          ship_to_line2: shipToLine2.trim() || undefined,
          ship_to_city: shipToCity.trim(),
          ship_to_state: shipToState.trim(),
          ship_to_pincode: pincode,
          ship_to_country: 'India',
        } : {}),
        devotees: devotees.map((d) => ({
          name: d.name.trim(),
          gotra: d.gotra.trim(),
          relation: d.relation.trim() || undefined,
        })),
        booking_type: bookingType,
        ...(bookingType === 'SUBSCRIPTION' ? { subscription_count: subscriptionCount } : {}),
      };

      const orderRes = await paymentService.createOrder({
        booking_type: 'PUJA',
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
          content_type: 'puja',
          content_ids: [pujaRaw.slug || pujaId],
          content_name: pujaName,
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
        description: `${pujaName} × ${devoteeCount} devotee${devoteeCount > 1 ? 's' : ''}`,
        notes: { puja_event_id: selectedEventId },
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
              content_type: 'puja',
              content_ids: [pujaRaw.slug || pujaId],
              content_name: pujaName,
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
        onFailure: (failure) => { setError(failure.description || 'Payment failed. No booking was created — please try again.'); },
        onDismiss: () => { setError('Payment cancelled. No booking was created — please try again.'); },
      });
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setError(e.response?.data?.message || e.message || 'Booking failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  // ------- Layout shells -------
  // When fullPage=true (the /book route fallback) we render in-flow without
  // backdrop/animation. Otherwise it's a slide-up on mobile, slide-from-right
  // panel on desktop, with a tappable backdrop.
  const shellClass = fullPage
    ? 'relative w-full bg-surface-warm min-h-screen flex flex-col'
    : 'fixed inset-0 z-[100] flex items-stretch';

  const panelClass = fullPage
    ? 'flex-1 flex flex-col bg-surface-warm'
    : 'relative ml-auto w-full sm:max-w-[480px] h-full bg-surface-warm shadow-2xl flex flex-col sheet-slide-up';

  return (
    <div className={shellClass} role="dialog" aria-modal="true" aria-label="Book Puja">
      {!fullPage && (
        <button
          aria-label="Close"
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      <div className={panelClass}>
        {/* Success view — full-focus card, separate from the regular layout */}
        {step === 3 ? (
          <div className="min-h-screen bg-surface-warm flex items-start justify-center pt-12 sm:pt-20 px-4 pb-8">
            <div className="bg-white border border-orange-100 rounded-2xl shadow-sm p-8 sm:p-12 max-w-md w-full text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5 ring-4 ring-green-50">
                <Check className="w-10 h-10 text-green-600" strokeWidth={3} />
              </div>
              <h2 className="text-2xl font-bold text-text-primary mb-2">Booking Confirmed!</h2>
              <p className="text-sm text-text-secondary mb-1">
                {pujaName} for {devoteeCount} devotee{devoteeCount > 1 ? 's' : ''}
              </p>
              {confirmedId && confirmedId !== 'confirmed' && (
                <p className="text-xs text-text-muted mb-6">Booking ID: {confirmedId.slice(0, 8)}</p>
              )}
              <p className="text-sm text-text-secondary mb-7 leading-relaxed">
                We&apos;ll notify you before the puja starts. You can track the status in your bookings.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link href="/bookings/puja" className="flex-1">
                  <Button size="lg" className="w-full">View My Bookings</Button>
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
            {/* Top bar */}
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
                  <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider leading-none">Book Puja</p>
                  <h1 className="text-base font-bold text-text-primary truncate mt-1">{pujaName}</h1>
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

            {/* Stepper */}
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

              {/* Summary card — always visible inside the sheet */}
              <div className="mb-5 bg-white border border-orange-100 rounded-2xl p-4 shadow-[0_1px_2px_rgba(232,129,58,0.04)]">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-wider font-semibold text-text-muted">Total</p>
                    <p className="text-2xl font-bold text-primary-600 tabular-nums leading-none mt-1">₹{totalPrice.toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-text-secondary">{devoteeCount} devotee{devoteeCount > 1 ? 's' : ''}</p>
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

              {/* Loader on initial events fetch */}
              {loading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="w-7 h-7 text-primary-500 animate-spin" />
                </div>
              ) : (
                <>
                  {/* Step 0: Pick Event */}
                  {step === 0 && (
                    <div>
                      <h2 className="text-lg font-bold text-text-primary mb-1">Select an upcoming event</h2>
                      <p className="text-sm text-text-secondary mb-5">Choose a date to book this puja.</p>

                      {pujaRaw.booking_mode === 'BOTH' && (
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
                          {bookingType === 'SUBSCRIPTION' && (
                            <p className="text-xs text-primary-700 bg-primary-50 border border-primary-100 rounded-lg px-3 py-2 mt-2">
                              You&apos;ll be auto-billed for the next N upcoming events of this puja. Cancel anytime from your bookings.
                            </p>
                          )}
                        </div>
                      )}

                      {pujaRaw.booking_mode === 'SUBSCRIPTION' && (
                        <div className="mb-5 text-xs text-primary-700 bg-primary-50 border border-primary-100 rounded-lg px-3 py-2">
                          This puja is offered as a subscription only — auto-billed for the next N events. Cancel anytime.
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
                          No upcoming events scheduled for this puja yet.
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
                                  {/* The events list is already pre-filtered to NOT_STARTED + YET_TO_START upstream,
                                      so every row here is bookable — render a friendly "Available" pill
                                      instead of leaking the raw enum to devotees. */}
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

                  {/* Step 1: Devotee Count */}
                  {step === 1 && (
                    <div>
                      <h2 className="text-lg font-bold text-text-primary mb-1">How many devotees?</h2>
                      <p className="text-sm text-text-secondary mb-5">Pick a package — pricing follows the puja definition.</p>
                      <div className="grid grid-cols-2 gap-3">
                        {DEVOTEE_TIER_OPTIONS.map((opt) => {
                          const price = Number(pujaRaw[opt.priceField] ?? 0);
                          if (price <= 0) return null;
                          const active = devoteeCount === opt.count;
                          return (
                            <button
                              key={opt.count}
                              onClick={() => setDevoteeCount(opt.count)}
                              className={`border-2 rounded-2xl p-4 text-center transition-all ${
                                active
                                  ? 'border-primary-500 bg-primary-50 shadow-sm'
                                  : 'border-orange-100 bg-white hover:border-primary-300'
                              }`}
                            >
                              <User className={`w-6 h-6 mx-auto mb-1.5 ${active ? 'text-primary-500' : 'text-text-muted'}`} />
                              <p className={`text-sm font-bold ${active ? 'text-primary-700' : 'text-text-primary'}`}>{opt.label}</p>
                              <p className={`text-sm font-bold mt-1 ${active ? 'text-primary-600' : 'text-text-secondary'}`}>
                                ₹{price.toLocaleString()}
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Step 2: Devotee Details */}
                  {step === 2 && (
                    <div>
                      <h2 className="text-lg font-bold text-text-primary mb-1">Devotee details</h2>
                      <p className="text-sm text-text-secondary mb-5">Required for the puja sankalpa.</p>

                      <div className="space-y-3 mb-6">
                        {devotees.map((d, i) => (
                          <div key={i} className="bg-white border border-orange-100 rounded-xl p-3.5 space-y-2.5 shadow-[0_1px_2px_rgba(232,129,58,0.04)]">
                            <p className="text-[11px] font-bold text-primary-600 uppercase tracking-wider">Devotee {i + 1}</p>
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
                            <input
                              placeholder="Relation (e.g. Self, Wife, Father)"
                              value={d.relation}
                              onChange={(e) =>
                                setDevotees((prev) => prev.map((x, k) => (k === i ? { ...x, relation: e.target.value } : x)))
                              }
                              className="w-full border border-orange-100 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition"
                            />
                          </div>
                        ))}
                      </div>

                      {sendHamper && (
                        <>
                          <h2 className="text-lg font-bold text-text-primary mb-1">Prasad delivery address</h2>
                          <p className="text-sm text-text-secondary mb-3">Where should we send the prasad hamper?</p>
                          <div className="space-y-2.5 mb-6">
                            <input
                              placeholder="Recipient full name"
                              value={shipToName}
                              onChange={(e) => setShipToName(e.target.value)}
                              className="w-full border border-orange-100 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition"
                            />
                            <input
                              placeholder="10-digit phone number"
                              value={shipToPhone}
                              onChange={(e) => setShipToPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                              inputMode="numeric"
                              maxLength={10}
                              className="w-full border border-orange-100 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition"
                            />
                            <input
                              placeholder="Address line 1 (house no., street)"
                              value={shipToLine1}
                              onChange={(e) => setShipToLine1(e.target.value)}
                              className="w-full border border-orange-100 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition"
                            />
                            <input
                              placeholder="Address line 2 (apartment, landmark — optional)"
                              value={shipToLine2}
                              onChange={(e) => setShipToLine2(e.target.value)}
                              className="w-full border border-orange-100 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition"
                            />
                            <div className="grid grid-cols-2 gap-2.5">
                              <input
                                placeholder="City"
                                value={shipToCity}
                                onChange={(e) => setShipToCity(e.target.value)}
                                className="w-full border border-orange-100 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition"
                              />
                              <input
                                placeholder="State"
                                value={shipToState}
                                onChange={(e) => setShipToState(e.target.value)}
                                className="w-full border border-orange-100 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition"
                              />
                            </div>
                            <input
                              placeholder="6-digit Pincode"
                              value={pincode}
                              onChange={(e) => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                              inputMode="numeric"
                              maxLength={6}
                              className="w-full border border-orange-100 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition"
                            />
                          </div>
                        </>
                      )}

                      {pujaRaw.shlok && (
                        <>
                          <h2 className="text-lg font-bold text-text-primary mb-1">Puja Shlok</h2>
                          <p className="text-sm text-text-secondary mb-3">This shlok will be recited during your puja.</p>
                          <div className="w-full border border-orange-100 rounded-xl px-4 py-3 text-sm bg-orange-50 text-text-primary whitespace-pre-line leading-relaxed">
                            {pujaRaw.shlok}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Sticky action bar */}
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
                  disabled={!canAdvanceFromStep(step) || submitting}
                  onClick={step === 2 ? handleSubmit : advance}
                >
                  {submitting ? (
                    <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Booking…</>
                  ) : step === 2 ? (
                    `Confirm · ₹${totalPrice.toLocaleString()}`
                  ) : (
                    `Continue${step === 1 ? ` · ₹${totalPrice.toLocaleString()}` : ''}`
                  )}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Inline auth gate. Mounts only when the user opened the booking sheet
          without a token. On success the AuthSheet closes and the booking
          sheet behind it picks up from step 0 with a fresh access token. */}
      <AuthSheet
        open={needsAuth}
        onClose={() => { setNeedsAuth(false); onClose(); }}
        onSuccess={() => setNeedsAuth(false)}
        contextLine={`Log in to complete your booking — ${pujaName}`}
      />
    </div>
  );
}
