'use client';

// Lightweight phone-OTP login as an overlay sheet.
//
// Why this exists: pre-Apr-2026 every protected CTA `router.replace('/login?…')`
// out of context, which (a) interrupted the conversion funnel, (b) lost the
// scroll position in the booking sheet, (c) landed users on an empty
// max-w-md page that read as stale. AuthSheet reuses the exact same OTP flow
// (`authService.sendOtp` / `verifyOtp` + `setAuthTokens`) but renders inline.
//
// The standalone `/login` page also mounts this component (with `fullPage`)
// so direct-URL hits get the same form behind a marketing pane.

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Loader2, Phone, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { authService } from '@/lib/services';
import { setAuthTokens } from '@/lib/auth';
import api from '@/lib/api';

interface AuthSheetProps {
  open: boolean;
  onClose: () => void;
  /** Fired after the OTP verification succeeds and tokens are persisted. */
  onSuccess?: () => void;
  /** Optional context strip shown above the form, e.g. "Sign in to complete your puja booking". */
  contextLine?: string;
  /** Standalone /login mode — full bleed, no backdrop, no slide animation. */
  fullPage?: boolean;
}

export function AuthSheet({
  open,
  onClose,
  onSuccess,
  contextLine,
  fullPage = false,
}: AuthSheetProps) {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const otpContainerRef = useRef<HTMLDivElement>(null);

  // Reset every time the sheet opens — avoids stale state from a previous attempt.
  useEffect(() => {
    if (!open) return;
    setPhone('');
    setOtp('');
    setOtpSent(false);
    setLoading(false);
    setError('');
  }, [open]);

  // Lock body scroll while open (not in fullPage mode — the standalone page
  // already owns the viewport).
  useEffect(() => {
    if (!open || fullPage) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open, fullPage]);

  // Auto-focus the first OTP input once we move to the OTP step.
  useEffect(() => {
    if (!otpSent) return;
    const first = otpContainerRef.current?.querySelector<HTMLInputElement>('input');
    first?.focus();
  }, [otpSent]);

  const handleGenerateOtp = async () => {
    if (phone.length < 10) return;
    setLoading(true);
    setError('');
    try {
      await authService.sendOtp(phone);
      setOtpSent(true);
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (otp.length < 6) return;
    setLoading(true);
    setError('');
    try {
      const res = await authService.verifyOtp(phone, otp);
      if (res.data?.success && res.data?.data) {
        const { accessToken, refreshToken } = res.data.data;
        setAuthTokens(accessToken, refreshToken);
        api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
        onSuccess?.();
      } else {
        setError(res.data?.message || 'Verification failed');
      }
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  const shellClass = fullPage
    ? 'relative w-full bg-surface-warm min-h-screen flex flex-col'
    : 'fixed inset-0 z-[110] flex items-stretch';
  const panelClass = fullPage
    ? 'flex-1 flex flex-col bg-surface-warm'
    : 'relative ml-auto w-full sm:max-w-[460px] h-full bg-surface-warm shadow-2xl flex flex-col sheet-slide-up';

  return (
    <div className={shellClass} role="dialog" aria-modal="true" aria-label="Log in">
      {!fullPage && (
        <button
          aria-label="Close"
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      <div className={panelClass}>
        {/* Top bar — only shown in the overlay mode; /login route renders its
            own marketing pane around the panel and doesn't need a header. */}
        {!fullPage && (
          <div className="bg-white border-b border-orange-100 sticky top-0 z-10 backdrop-blur-sm">
            <div className="flex items-center gap-3 px-4 py-3.5">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider leading-none">Welcome to Savidhi</p>
                <h1 className="text-base font-bold text-text-primary truncate mt-1">Log in to continue</h1>
              </div>
              <button
                onClick={onClose}
                aria-label="Close"
                className="w-9 h-9 rounded-full bg-white border border-border-DEFAULT flex items-center justify-center text-text-secondary hover:border-primary-300 hover:bg-primary-50 hover:text-primary-500 transition flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-5 pt-6 pb-8">
          {/* Diya hero — kept compact so the form is above the fold on mobile. */}
          <div className="flex justify-center mb-5">
            <div className="w-20 h-20 bg-primary-50 rounded-full flex items-center justify-center ring-4 ring-orange-50/70">
              <span className="text-4xl" aria-hidden>🪔</span>
            </div>
          </div>

          {contextLine && (
            <p className="text-center text-sm text-primary-700 bg-primary-50 border border-primary-100 rounded-xl px-3 py-2 mb-5">
              {contextLine}
            </p>
          )}

          <div className="bg-white rounded-2xl border border-orange-100 shadow-[0_4px_14px_rgba(122,30,18,0.06)] p-6">
            <h2 className="text-xl font-bold text-text-primary mb-1 text-center">Log In</h2>
            <p className="text-xs text-text-secondary text-center mb-5">
              Enter your phone number — we&apos;ll send a one-time code.
            </p>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 text-center">
                {error}
              </div>
            )}

            {!otpSent ? (
              <>
                <label className="block text-sm font-medium text-text-secondary mb-2">Phone Number</label>
                <div className="relative mb-5">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    placeholder="96668 88882"
                    autoFocus={!fullPage}
                    className="w-full pl-10 pr-4 py-3 border border-border-DEFAULT rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400 placeholder:text-text-muted"
                  />
                </div>
                <Button className="w-full" size="lg" onClick={handleGenerateOtp} disabled={phone.length < 10 || loading}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Generate OTP <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </>
            ) : (
              <>
                <label className="block text-sm font-medium text-text-secondary mb-2 text-center">
                  Enter the 6-digit OTP sent to <span className="font-semibold text-text-primary">+91 {phone}</span>
                </label>
                <div ref={otpContainerRef} className="flex gap-2 mb-5 justify-center">
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <input
                      key={i}
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={otp[i] || ''}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/\D/g, '');
                        if (raw.length > 1) {
                          const next = otp.split('');
                          for (let k = 0; k < raw.length && i + k < 6; k++) next[i + k] = raw[k];
                          const padded = next.join('').slice(0, 6);
                          setOtp(padded);
                          const inputs = otpContainerRef.current?.querySelectorAll('input');
                          const lastIdx = Math.min(i + raw.length, 6) - 1;
                          (inputs?.[lastIdx] as HTMLInputElement | undefined)?.focus();
                          return;
                        }
                        const newOtp = otp.split('');
                        newOtp[i] = raw;
                        setOtp(newOtp.join(''));
                        if (raw && e.target.nextElementSibling) {
                          (e.target.nextElementSibling as HTMLInputElement).focus();
                        }
                      }}
                      onPaste={(e) => {
                        const text = e.clipboardData.getData('text').replace(/\D/g, '');
                        if (!text) return;
                        e.preventDefault();
                        const next = otp.split('');
                        for (let k = 0; k < text.length && i + k < 6; k++) next[i + k] = text[k];
                        const padded = next.join('').slice(0, 6);
                        setOtp(padded);
                        const inputs = otpContainerRef.current?.querySelectorAll('input');
                        const lastIdx = Math.min(i + text.length, 6) - 1;
                        (inputs?.[lastIdx] as HTMLInputElement | undefined)?.focus();
                      }}
                      className="w-11 h-12 text-center border border-border-DEFAULT rounded-xl text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400"
                    />
                  ))}
                </div>
                <Button className="w-full" size="lg" onClick={handleSubmit} disabled={otp.length < 6 || loading}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Submit
                </Button>
                <button
                  onClick={() => { setOtpSent(false); setOtp(''); setError(''); }}
                  className="w-full mt-3 text-sm text-primary-500 hover:underline"
                >
                  Change phone number
                </button>
              </>
            )}
          </div>

          <p className="text-center text-[11px] text-text-muted mt-5 leading-snug">
            By continuing you agree to Savidhi&apos;s{' '}
            <Link href="/terms" className="underline">Terms</Link> &amp;{' '}
            <Link href="/privacy" className="underline">Privacy Policy</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}
