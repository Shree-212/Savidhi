'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Calendar, Check, Clock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import {
  astrologerService,
  appointmentService,
  paymentService,
} from '@/lib/services';
import { getAccessToken } from '@/lib/auth';
import { loadRazorpay, openCheckout } from '@/lib/razorpay';
import type { AppointmentDuration, DurationOption } from '@/data/models';

const DURATION_LABELS: Array<{ key: AppointmentDuration; label: string; priceField: string }> = [
  { key: '15min', label: '15 Min', priceField: 'price_15min' },
  { key: '30min', label: '30 Min', priceField: 'price_30min' },
  { key: '1hour', label: '1 Hour', priceField: 'price_1hour' },
  { key: '2hour', label: '2 Hour', priceField: 'price_2hour' },
];

const STEP_LABELS = ['Duration', 'Schedule & Details', 'Confirm'];

export default function BookAppointmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params); // slug or UUID — BE accepts both for catalog lookup
  const router = useRouter();

  const [astro, setAstro] = useState<{ id: string; slug: string; name: string } | null>(null);
  const [durations, setDurations] = useState<DurationOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Flow state
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<AppointmentDuration>('15min');
  const [date, setDate] = useState(''); // YYYY-MM-DD
  const [time, setTime] = useState(''); // HH:MM
  const [devoteeName, setDevoteeName] = useState('');
  const [devoteeGotra, setDevoteeGotra] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [confirmedId, setConfirmedId] = useState<string | null>(null);

  // Auth guard — appointment-create requires login
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!getAccessToken()) {
      router.replace(`/login?redirect=/consult/${id}/book`);
    }
  }, [id, router]);

  // Default date = tomorrow at 10:00 AM
  useEffect(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setDate(tomorrow.toISOString().slice(0, 10));
    setTime('10:00');
  }, []);

  useEffect(() => {
    astrologerService.getById(id)
      .then((res) => {
        const raw = res.data?.data ?? res.data;
        if (!raw) return;
        setAstro({ id: raw.id, slug: raw.slug ?? raw.id, name: raw.name });
        setDurations(
          DURATION_LABELS.map((d) => ({
            key: d.key,
            label: d.label,
            price: Number(raw[d.priceField] ?? 0),
          })),
        );
      })
      .catch((err) => setError(err?.response?.data?.message ?? 'Failed to load'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  if (!astro) {
    return (
      <div className="section-container py-20 text-center text-text-secondary">
        Astrologer not found. <Link href="/consult" className="text-primary-500 underline">Go back</Link>
      </div>
    );
  }

  const price = durations.find((d) => d.key === selected)?.price ?? 0;
  const selectedLabel = durations.find((d) => d.key === selected)?.label ?? '';

  const advance = () => setStep((s) => Math.min(s + 1, STEP_LABELS.length - 1));
  const back = () => (step > 0 ? setStep(step - 1) : router.back());

  const canAdvance = (s: number) => {
    if (s === 0) return !!selected && price > 0;
    if (s === 1) return !!date && !!time && devoteeName.trim().length >= 2;
    return true;
  };

  const handleSubmit = async () => {
    if (!astro || !date || !time) return;
    try {
      setSubmitting(true);
      setError('');

      const scheduledAt = new Date(`${date}T${time}:00`).toISOString();

      // 1. Create appointment
      const apptRes = await appointmentService.create({
        astrologer_id: astro.id, // use UUID, BE expects it
        duration: selected,
        scheduled_at: scheduledAt,
        devotee_name: devoteeName.trim(),
        devotee_gotra: devoteeGotra.trim() || undefined,
      });
      const appt = apptRes.data?.data;
      if (!appt?.id) throw new Error('Appointment creation failed');
      const apptAmount = Number(appt.cost ?? price);

      // 2. Create Razorpay order (or stub fallback)
      const orderRes = await paymentService.createOrder({
        booking_type: 'APPOINTMENT',
        booking_id: appt.id,
        amount: apptAmount,
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
        setConfirmedId(appt.id);
        advance();
        return;
      }

      const Razorpay = await loadRazorpay();
      openCheckout(Razorpay, {
        key: pay.razorpay_key_id,
        order: { id: pay.gateway_order_id, amount: Math.round(apptAmount * 100) },
        name: 'Savidhi',
        description: `${astro.name} — ${selectedLabel} consultation`,
        notes: { appointment_id: appt.id, astrologer_id: astro.id },
        onSuccess: async (resp) => {
          try {
            await paymentService.verify({
              payment_id: pay.id,
              gateway_order_id: resp.razorpay_order_id,
              gateway_payment_id: resp.razorpay_payment_id,
              gateway_signature: resp.razorpay_signature,
            });
            setConfirmedId(appt.id);
            advance();
          } catch (verifyErr: any) {
            setError(verifyErr?.response?.data?.message ?? 'Payment verification failed');
          }
        },
        onFailure: (failure) => setError(failure.description ?? 'Payment failed'),
        onDismiss: () => setError('Payment cancelled. You can try again from your bookings.'),
      });
    } catch (err: any) {
      setError(err?.response?.data?.message ?? err?.message ?? 'Booking failed');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Confirmation view ──────────────────────────────────────────────────────
  if (step === 2) {
    return (
      <div className="min-h-screen bg-surface-warm flex items-start justify-center pt-12 sm:pt-20 px-4">
        <div className="bg-white border border-orange-100 rounded-2xl shadow-sm p-8 sm:p-12 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5 ring-4 ring-green-50">
            <Check className="w-10 h-10 text-green-600" strokeWidth={3} />
          </div>
          <h2 className="text-2xl font-bold text-text-primary mb-2">Appointment Booked!</h2>
          <p className="text-sm text-text-secondary mb-1">
            {astro.name} — {selectedLabel} on {new Date(`${date}T${time}`).toLocaleString('en-IN', {
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
            <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider leading-none">Book Appointment</p>
            <h1 className="text-base font-bold text-text-primary truncate mt-1">{astro.name}</h1>
          </div>
        </div>
      </div>

      {/* Stepper */}
      <div className="section-container max-w-6xl pt-5 pb-2">
        <div className="flex items-center justify-between gap-1 sm:gap-2 max-w-md mx-auto">
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

      <div className="section-container max-w-6xl pt-4 pb-6 sm:pb-8">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid lg:grid-cols-[7fr_5fr] gap-6 lg:gap-10 lg:items-start">
          {/* LEFT — step content */}
          <div>
            {/* Step 0: Duration */}
            {step === 0 && (
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-text-primary mb-1">Select Time Duration</h2>
                <p className="text-sm text-text-secondary mb-5">Choose how long you&apos;d like to consult.</p>
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
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

            {/* Step 1: Schedule + devotee */}
            {step === 1 && (
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-text-primary mb-1">Pick a date &amp; time</h2>
                <p className="text-sm text-text-secondary mb-5">When would you like to consult?</p>

                <div className="grid grid-cols-2 gap-3 mb-6">
                  <label className="block">
                    <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-1.5 block">Date</span>
                    <input
                      type="date"
                      value={date}
                      min={new Date().toISOString().slice(0, 10)}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full border border-orange-100 rounded-xl px-3.5 py-2.5 text-sm bg-white focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-1.5 block">Time</span>
                    <input
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      className="w-full border border-orange-100 rounded-xl px-3.5 py-2.5 text-sm bg-white focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition"
                    />
                  </label>
                </div>

                <h2 className="text-lg sm:text-xl font-bold text-text-primary mb-1">Your details</h2>
                <p className="text-sm text-text-secondary mb-3">Used by the astrologer for the consultation.</p>
                <div className="space-y-2.5">
                  <input
                    placeholder="Your full name"
                    value={devoteeName}
                    onChange={(e) => setDevoteeName(e.target.value)}
                    className="w-full border border-orange-100 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition"
                  />
                  <input
                    placeholder="Gotra (optional)"
                    value={devoteeGotra}
                    onChange={(e) => setDevoteeGotra(e.target.value)}
                    className="w-full border border-orange-100 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition"
                  />
                </div>
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
                onClick={step === 1 ? handleSubmit : advance}
              >
                {submitting ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Booking…</>
                ) : step === 1 ? (
                  `Confirm &amp; Pay · ₹${price.toLocaleString()}`
                ) : (
                  `Continue · ₹${price.toLocaleString()}`
                )}
              </Button>
            </div>
          </div>

          {/* RIGHT — sticky summary */}
          <aside className="lg:sticky lg:top-24">
            <div className="bg-white border border-orange-100 rounded-2xl shadow-[0_1px_2px_rgba(232,129,58,0.04)] overflow-hidden">
              <div className="px-5 py-4 border-b border-orange-50">
                <h3 className="font-bold text-text-primary text-base">Summary</h3>
              </div>
              <div className="p-5 space-y-3 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <span className="text-text-secondary">Astrologer</span>
                  <span className="font-semibold text-text-primary text-right">{astro.name}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-text-secondary">Duration</span>
                  <span className="font-semibold text-text-primary">{selectedLabel}</span>
                </div>
                {step >= 1 && date && time && (
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-text-secondary inline-flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" /> When
                    </span>
                    <span className="font-semibold text-text-primary text-right">
                      {new Date(`${date}T${time}`).toLocaleString('en-IN', {
                        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                      })}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between gap-3 pt-3 border-t border-orange-50">
                  <span className="font-bold text-text-primary">Total</span>
                  <span className="font-bold text-primary-600 text-xl tabular-nums">₹{price.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Mobile sticky action bar */}
      <div className="lg:hidden sticky bottom-0 bg-white border-t border-orange-100 shadow-[0_-2px_12px_rgba(232,129,58,0.08)] z-20">
        <div className="section-container max-w-2xl flex items-center gap-3 py-3">
          {step > 0 && (
            <Button variant="outline" size="lg" onClick={back} className="px-4">Back</Button>
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
    </div>
  );
}
