'use client';

// Astrologer / consultation booking sheet. Mirrors BookingSheet & ChadhavaBookingSheet
// in shell + tracking, but the inner flow is 3 steps:
//   0) pick duration (15min / 30min / 1hour / 2hour)
//   1) pick date+time + devotee name/gotra
//   2) confirm (success card)
//
// The consult section is currently disabled at the route level (May-2026 launch).
// This sheet stays inert until /consult is re-enabled — re-enabling is a one-line
// change in src/app/consult/[id]/page.tsx.

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Check, Clock, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { paymentService } from '@/lib/services';
import { getAccessToken } from '@/lib/auth';
import { loadRazorpay, openCheckout } from '@/lib/razorpay';
import { trackEvent } from '@/lib/analytics';
import { AuthSheet } from '@/components/shared/AuthSheet';
import type { AppointmentDuration, DurationOption } from '@/data/models';

interface ConsultBookingSheetProps {
  astrologerId: string;     // UUID
  astrologerSlug: string;   // for tracking content_id
  astrologerName: string;
  durations: DurationOption[];
  initialDuration?: AppointmentDuration;
  open: boolean;
  onClose: () => void;
  fullPage?: boolean;
}

const STEP_LABELS = ['Duration', 'Schedule & Details', 'Confirm'];

export function ConsultBookingSheet({
  astrologerId,
  astrologerSlug,
  astrologerName,
  durations,
  initialDuration = '15min',
  open,
  onClose,
  fullPage = false,
}: ConsultBookingSheetProps) {
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<AppointmentDuration>(initialDuration);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [devoteeName, setDevoteeName] = useState('');
  const [devoteeGotra, setDevoteeGotra] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [confirmedId, setConfirmedId] = useState<string | null>(null);
  const [error, setError] = useState('');

  // Inline auth gate — see BookingSheet for the rationale.
  const [needsAuth, setNeedsAuth] = useState(false);
  useEffect(() => {
    if (!open) return;
    if (typeof window === 'undefined') return;
    setNeedsAuth(!getAccessToken());
  }, [open]);

  // Reset + tracking on open. Default scheduled date = tomorrow 10:00 AM.
  useEffect(() => {
    if (!open) return;
    setStep(0);
    setError('');
    setConfirmedId(null);
    setSelected(initialDuration);
    setDevoteeName('');
    setDevoteeGotra('');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setDate(tomorrow.toISOString().slice(0, 10));
    setTime('10:00');
    trackEvent('add_to_cart', {
      content_type: 'consult',
      content_ids: [astrologerSlug],
      content_name: astrologerName,
      duration: initialDuration,
    });
  }, [open, initialDuration, astrologerSlug, astrologerName]);

  useEffect(() => {
    if (!open || fullPage) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open, fullPage]);

  const idempotencyKey = useMemo(() => {
    if (!open) return '';
    return typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }, [open]);

  const price = durations.find((d) => d.key === selected)?.price ?? 0;
  const selectedLabel = durations.find((d) => d.key === selected)?.label ?? '';

  const advance = () => setStep((s) => Math.min(s + 1, STEP_LABELS.length - 1));
  const back = () => (step > 0 ? setStep(step - 1) : onClose());

  const canAdvance = (s: number) => {
    if (s === 0) return !!selected && price > 0;
    if (s === 1) return !!date && !!time && devoteeName.trim().length >= 2;
    return true;
  };

  const handleSubmit = async () => {
    if (!date || !time) return;
    try {
      setSubmitting(true);
      setError('');
      const scheduledAt = new Date(`${date}T${time}:00`).toISOString();

      trackEvent('initiate_checkout', {
        content_type: 'consult',
        content_ids: [astrologerSlug],
        content_name: astrologerName,
        value: price,
        currency: 'INR',
      });

      const bookingPayload = {
        astrologer_id: astrologerId,
        duration: selected,
        scheduled_at: scheduledAt,
        devotee_name: devoteeName.trim(),
        devotee_gotra: devoteeGotra.trim() || undefined,
      };

      const orderRes = await paymentService.createOrder({
        booking_type: 'APPOINTMENT',
        booking_payload: bookingPayload,
        booking_idempotency_key: idempotencyKey,
      });
      const pay = orderRes.data?.data;
      if (!pay?.gateway_order_id) throw new Error('Could not start payment');
      const apptAmount = Number(pay.amount ?? price);

      if (pay.stub) {
        const verifyRes = await paymentService.verify({
          payment_id: pay.id,
          gateway_order_id: pay.gateway_order_id,
          gateway_payment_id: `pay_stub_${Date.now()}`,
          gateway_signature: 'stub',
        });
        const verifiedAppt = verifyRes.data?.data?.booking;
        if (!verifiedAppt?.id) throw new Error('Appointment materialization failed');
        setConfirmedId(verifiedAppt.id);
        trackEvent('purchase', {
          content_type: 'consult',
          content_ids: [astrologerSlug],
          content_name: astrologerName,
          value: price,
          currency: 'INR',
          transaction_id: verifiedAppt.id,
        });
        advance();
        return;
      }

      const Razorpay = await loadRazorpay();
      openCheckout(Razorpay, {
        key: pay.razorpay_key_id,
        order: { id: pay.gateway_order_id, amount: Math.round(apptAmount * 100) },
        name: 'Savidhi',
        description: `${astrologerName} — ${selectedLabel} consultation`,
        notes: { astrologer_id: astrologerId },
        onSuccess: async (resp) => {
          try {
            const verifyRes = await paymentService.verify({
              payment_id: pay.id,
              gateway_order_id: resp.razorpay_order_id,
              gateway_payment_id: resp.razorpay_payment_id,
              gateway_signature: resp.razorpay_signature,
            });
            const verifiedAppt = verifyRes.data?.data?.booking;
            if (!verifiedAppt?.id) throw new Error('Appointment confirmation failed');
            setConfirmedId(verifiedAppt.id);
            trackEvent('purchase', {
              content_type: 'consult',
              content_ids: [astrologerSlug],
              content_name: astrologerName,
              value: price,
              currency: 'INR',
              transaction_id: verifiedAppt.id,
            });
            advance();
          } catch (verifyErr) {
            const e = verifyErr as { response?: { data?: { message?: string } } };
            setError(e.response?.data?.message ?? 'Payment verification failed');
          }
        },
        onFailure: (failure) => setError(failure.description ?? 'Payment failed. No appointment was created — please try again.'),
        onDismiss: () => setError('Payment cancelled. No appointment was created — please try again.'),
      });
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setError(e.response?.data?.message ?? e.message ?? 'Booking failed');
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
    <div className={shellClass} role="dialog" aria-modal="true" aria-label="Book Appointment">
      {!fullPage && (
        <button
          aria-label="Close"
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      <div className={panelClass}>
        {step === 2 ? (
          <div className="min-h-screen bg-surface-warm flex items-start justify-center pt-12 sm:pt-20 px-4 pb-8">
            <div className="bg-white border border-orange-100 rounded-2xl shadow-sm p-8 sm:p-12 max-w-md w-full text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5 ring-4 ring-green-50">
                <Check className="w-10 h-10 text-green-600" strokeWidth={3} />
              </div>
              <h2 className="text-2xl font-bold text-text-primary mb-2">Appointment Booked!</h2>
              <p className="text-sm text-text-secondary mb-1">
                {astrologerName} — {selectedLabel} on {new Date(`${date}T${time}`).toLocaleString('en-IN', {
                  weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                })}
              </p>
              {confirmedId && (
                <p className="text-xs text-text-muted mb-6">Booking ID: {confirmedId.slice(0, 8)}</p>
              )}
              <p className="text-sm text-text-secondary mb-7 leading-relaxed">
                We&apos;ll share the meeting link before your scheduled time.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link href="/bookings/appointments" className="flex-1">
                  <Button size="lg" className="w-full">My Appointments</Button>
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
                  <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider leading-none">Book Appointment</p>
                  <h1 className="text-base font-bold text-text-primary truncate mt-1">{astrologerName}</h1>
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
                        <span className={`text-[10px] sm:text-[11px] text-center leading-tight transition-colors ${
                          isActive ? 'text-primary-700 font-bold' : isDone ? 'text-text-secondary font-medium' : 'text-text-muted'
                        }`}>
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
                    <p className="text-2xl font-bold text-primary-600 tabular-nums leading-none mt-1">₹{price.toLocaleString()}</p>
                  </div>
                  <div className="text-right text-xs text-text-secondary">
                    {selectedLabel}
                    {date && time && (
                      <p className="text-text-muted mt-0.5">
                        {new Date(`${date}T${time}`).toLocaleString('en-IN', {
                          day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                        })}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {step === 0 && (
                <div>
                  <h2 className="text-lg font-bold text-text-primary mb-1">Select Time Duration</h2>
                  <p className="text-sm text-text-secondary mb-5">Choose how long you&apos;d like to consult.</p>
                  <div className="grid grid-cols-2 gap-3">
                    {durations.map((dur) => {
                      const active = selected === dur.key;
                      return (
                        <button
                          key={dur.key}
                          onClick={() => setSelected(dur.key)}
                          className={`relative border-2 rounded-2xl p-5 text-center transition-all ${
                            active
                              ? 'border-primary-500 bg-primary-50 shadow-md'
                              : 'border-orange-100 bg-white hover:border-primary-200 hover:shadow-sm'
                          }`}
                        >
                          <Clock className={`w-7 h-7 mx-auto mb-2 ${active ? 'text-primary-500' : 'text-text-muted'}`} />
                          <p className={`text-sm font-bold ${active ? 'text-primary-700' : 'text-text-primary'}`}>{dur.label}</p>
                          <p className={`text-base font-bold mt-1 tabular-nums ${active ? 'text-primary-600' : 'text-text-secondary'}`}>
                            ₹{dur.price.toLocaleString()}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {step === 1 && (
                <div>
                  <h2 className="text-lg font-bold text-text-primary mb-1">Schedule & Devotee Details</h2>
                  <p className="text-sm text-text-secondary mb-5">When would you like to consult?</p>
                  <div className="grid grid-cols-2 gap-2.5 mb-3">
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full border border-orange-100 rounded-xl px-3 py-3 text-sm bg-white focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition"
                    />
                    <input
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      className="w-full border border-orange-100 rounded-xl px-3 py-3 text-sm bg-white focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition"
                    />
                  </div>
                  <input
                    placeholder="Your name"
                    value={devoteeName}
                    onChange={(e) => setDevoteeName(e.target.value)}
                    className="w-full border border-orange-100 rounded-xl px-4 py-3 text-sm bg-white mb-3 focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition"
                  />
                  <input
                    placeholder="Gotra (optional)"
                    value={devoteeGotra}
                    onChange={(e) => setDevoteeGotra(e.target.value)}
                    className="w-full border border-orange-100 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition"
                  />
                </div>
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
                  onClick={step === 1 ? handleSubmit : advance}
                >
                  {submitting ? (
                    <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Booking…</>
                  ) : step === 1 ? (
                    `Confirm · ₹${price.toLocaleString()}`
                  ) : (
                    `Continue · ₹${price.toLocaleString()}`
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
        contextLine={`Log in to book a consultation with ${astrologerName}`}
      />
    </div>
  );
}
