'use client';

// Standalone /login route. The OTP form itself lives in `<AuthSheet>` so the
// same component powers both this page and the inline booking-flow overlay.
// Direct hits land here with a marketing pane on desktop instead of the prior
// max-w-md empty page.

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Sparkles, Shield, Heart, BookOpen } from 'lucide-react';
import { AuthSheet } from '@/components/shared/AuthSheet';

function LoginPageInner() {
  const router = useRouter();
  const params = useSearchParams();
  const redirect = params.get('redirect') || '/';

  // If the user is already authenticated, bounce straight to the redirect target.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.localStorage.getItem('savidhi_token')) {
      router.replace(redirect);
    }
  }, [redirect, router]);

  return (
    <div className="min-h-[80vh] bg-surface-warm">
      <div className="section-container max-w-6xl py-6 lg:py-12">
        <div className="grid lg:grid-cols-[6fr_5fr] gap-8 lg:gap-12 lg:items-stretch">
          {/* LEFT — marketing pane (hidden on mobile; the AuthSheet's own
              hero/copy block handles small screens). */}
          <aside className="hidden lg:flex flex-col justify-between bg-gradient-to-br from-[#7A1E12] via-[#9c2a18] to-[#C9560A] text-[#ffe9cf] rounded-3xl p-10 shadow-[0_14px_40px_rgba(122,30,18,0.16)] overflow-hidden relative">
            <div className="absolute -top-8 -right-8 w-48 h-48 bg-yellow-400/10 rounded-full blur-2xl" />
            <div className="absolute -bottom-12 -left-8 w-56 h-56 bg-orange-300/10 rounded-full blur-3xl" />

            <div className="relative">
              <p className="text-[11px] uppercase tracking-[0.18em] font-semibold opacity-80 mb-3">Welcome to</p>
              <h1 className="font-display text-4xl xl:text-5xl font-bold leading-tight mb-4">
                Savidhi
                <span className="block text-2xl xl:text-3xl font-medium mt-1 opacity-90">सविधि</span>
              </h1>
              <p className="text-base leading-relaxed text-[#ffe9cf]/90 max-w-md">
                Book pujas, chadhava offerings and astrologer consultations from trusted temples across India.
              </p>
            </div>

            <ul className="relative space-y-4 mt-10">
              {[
                { Icon: Sparkles, title: 'Verified Vedic Pandits', desc: 'Performed in your name & gotra on the auspicious tithi.' },
                { Icon: BookOpen,  title: '100+ Temples Across India', desc: 'Ancient shrines, every region covered.' },
                { Icon: Heart,     title: '2 Lakh+ Devotees Served', desc: 'Live updates, prasad delivered home.' },
                { Icon: Shield,    title: 'Secure Payments',         desc: '256-bit encryption · Razorpay protected.' },
              ].map(({ Icon, title, desc }) => (
                <li key={title} className="flex items-start gap-3">
                  <span className="w-9 h-9 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center flex-shrink-0 ring-1 ring-white/10">
                    <Icon className="w-[18px] h-[18px] text-[#ffd9a6]" />
                  </span>
                  <div className="leading-snug">
                    <p className="font-semibold text-white text-[15px]">{title}</p>
                    <p className="text-[12.5px] text-[#ffe9cf]/80 mt-0.5">{desc}</p>
                  </div>
                </li>
              ))}
            </ul>

            <p className="relative text-[12px] text-[#ffe9cf]/70 mt-10">
              Trusted by devotees in 500+ cities · 4.7★ rated across 800+ reviews.
            </p>
          </aside>

          {/* RIGHT — AuthSheet in fullPage mode renders the form panel inline. */}
          <div className="bg-white rounded-3xl shadow-[0_4px_14px_rgba(122,30,18,0.06)] border border-orange-100 overflow-hidden">
            <AuthSheet
              open
              onClose={() => router.push('/')}
              onSuccess={() => router.replace(redirect)}
              fullPage
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// useSearchParams must be wrapped in Suspense in app-router pages.
export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-[60vh]" />}>
      <LoginPageInner />
    </Suspense>
  );
}
