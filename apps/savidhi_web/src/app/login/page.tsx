'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Phone, ArrowRight, SkipForward, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { authService } from '@/lib/services';
import { setAuthTokens } from '@/lib/auth';
import api from '@/lib/api';

export default function LoginPage() {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleGenerateOtp = async () => {
    if (phone.length < 10) return;
    setLoading(true);
    setError('');
    try {
      await authService.sendOtp(phone);
      setOtpSent(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send OTP');
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
        router.push('/');
      } else {
        setError(res.data?.message || 'Verification failed');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-surface-warm px-4">
      <div className="w-full max-w-md">
        {/* Skip */}
        <div className="flex justify-end mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-text-secondary border border-border-DEFAULT rounded-lg px-3 py-1.5 hover:bg-white transition"
          >
            Skip <SkipForward className="w-3.5 h-3.5 text-primary-500" />
          </Link>
        </div>

        {/* Illustration */}
        <div className="flex justify-center mb-8">
          <div className="w-48 h-48 bg-primary-50 rounded-full flex items-center justify-center">
            <span className="text-7xl">🪔</span>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-border-light p-8">
          <h1 className="text-2xl font-bold text-text-primary mb-6 text-center">Log In</h1>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 text-center">
              {error}
            </div>
          )}

          {!otpSent ? (
            <>
              <label className="block text-sm font-medium text-text-secondary mb-2">Phone Number</label>
              <div className="relative mb-6">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  placeholder="96668 88882"
                  className="w-full pl-10 pr-4 py-3 border border-border-DEFAULT rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400 placeholder:text-text-muted"
                />
              </div>
              <Button className="w-full" onClick={handleGenerateOtp} disabled={phone.length < 10 || loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Generate OTP <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <p className="text-xs text-text-muted mt-3 text-center">
                OTP will be logged in auth-service console for testing
              </p>
            </>
          ) : (
            <>
              <label className="block text-sm font-medium text-text-secondary mb-2">Enter OTP sent to +91 {phone}</label>
              <div className="flex gap-2 mb-6 justify-center">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <input
                    key={i}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={otp[i] || ''}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      const newOtp = otp.split('');
                      newOtp[i] = val;
                      setOtp(newOtp.join(''));
                      if (val && e.target.nextElementSibling) {
                        (e.target.nextElementSibling as HTMLInputElement).focus();
                      }
                    }}
                    className="w-11 h-12 text-center border border-border-DEFAULT rounded-xl text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400"
                  />
                ))}
              </div>
              <Button className="w-full" onClick={handleSubmit} disabled={otp.length < 6 || loading}>
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
      </div>
    </div>
  );
}
