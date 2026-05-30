'use client';

// Ready-to-render astrologer detail LP. Currently NOT mounted by
// src/app/consult/[id]/page.tsx (which redirects '/' until consult is
// re-enabled for the May-2026 launch). To re-enable consult, replace the
// page body with `<ConsultDetailContent params={params} />`.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, Sparkles, Clock, Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ExpandableSection } from '@/components/shared/ExpandableSection';
import { DevoteeProof } from '@/components/shared/DevoteeProof';
import { ConsultBookingSheet } from '@/components/shared/ConsultBookingSheet';
import { astrologerService } from '@/lib/services';
import { useT, useLocale } from '@/lib/i18n';
import { trackEvent } from '@/lib/analytics';
import type { AppointmentDuration, DurationOption } from '@/data/models';

const TESTIMONIAL_AVATARS = [
  'https://images.pexels.com/photos/1239288/pexels-photo-1239288.jpeg?auto=compress&w=160&h=160&fit=crop',
  'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&w=160&h=160&fit=crop',
  'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&w=160&h=160&fit=crop',
  'https://images.pexels.com/photos/1681010/pexels-photo-1681010.jpeg?auto=compress&w=160&h=160&fit=crop',
];

const DURATION_LABELS: Array<{ key: AppointmentDuration; label: string; priceField: string }> = [
  { key: '15min', label: '15 Min', priceField: 'price_15min' },
  { key: '30min', label: '30 Min', priceField: 'price_30min' },
  { key: '1hour', label: '1 Hour', priceField: 'price_1hour' },
  { key: '2hour', label: '2 Hour', priceField: 'price_2hour' },
];

const HOW_IT_WORKS_STEPS = [
  { num: 1, titleKey: 'consult.lp.howItWorks.step1.title', descKey: 'consult.lp.howItWorks.step1.desc' },
  { num: 2, titleKey: 'consult.lp.howItWorks.step2.title', descKey: 'consult.lp.howItWorks.step2.desc' },
  { num: 3, titleKey: 'consult.lp.howItWorks.step3.title', descKey: 'consult.lp.howItWorks.step3.desc' },
  { num: 4, titleKey: 'consult.lp.howItWorks.step4.title', descKey: 'consult.lp.howItWorks.step4.desc' },
];

const TESTIMONIALS = [1, 2, 3, 4] as const;
const FAQS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

interface Astrologer {
  id: string;
  slug: string;
  name: string;
  photo_url?: string;
  experience_years?: number;
  specialisation?: string;
  languages?: string[];
  bio?: string;
}

export function ConsultDetailContent({ id }: { id: string }) {
  const t = useT();
  const { locale } = useLocale();
  const [astro, setAstro] = useState<Astrologer | null>(null);
  const [durations, setDurations] = useState<DurationOption[]>([]);
  const [loading, setLoading] = useState(true);

  const [bookOpen, setBookOpen] = useState(false);
  const [bookDuration, setBookDuration] = useState<AppointmentDuration>('15min');

  useEffect(() => {
    setLoading(true);
    astrologerService.getById(id)
      .then((res) => {
        const raw = res.data?.data ?? res.data;
        if (!raw) return;
        setAstro(raw as Astrologer);
        setDurations(
          DURATION_LABELS.map((d) => ({
            key: d.key,
            label: d.label,
            price: Number(raw[d.priceField] ?? 0),
          })),
        );
        trackEvent('view_content', {
          content_type: 'product',
          content_category: 'consult',
          content_ids: [raw.slug || raw.id || id],
          content_name: raw.name,
          currency: 'INR',
        });
      })
      .finally(() => setLoading(false));
  }, [id, locale]);

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

  const openSheetWith = (duration: AppointmentDuration) => {
    setBookDuration(duration);
    setBookOpen(true);
  };
  const lowestPrice = Math.min(...durations.map((d) => d.price).filter((p) => p > 0));

  return (
    <div className="min-h-screen bg-surface-warm">
      <div className="section-container max-w-6xl pt-3 sm:pt-6 pb-6 sm:pb-8">
        <div className="flex items-center justify-between mb-3 sm:mb-5">
          <Link
            href="/consult"
            className="inline-flex items-center gap-2 text-sm font-medium text-text-secondary hover:text-primary-500 transition group"
          >
            <span className="w-8 h-8 rounded-full bg-white border border-border-DEFAULT flex items-center justify-center group-hover:border-primary-300 group-hover:bg-primary-50 transition">
              <ArrowLeft className="w-4 h-4" />
            </span>
            <span className="hidden sm:inline">Back to Astrologers</span>
          </Link>
        </div>

        {/* BANNER — astrologer profile photo + meta + DevoteeProof */}
        <div className="grid lg:grid-cols-[5fr_7fr] gap-4 sm:gap-6 lg:gap-10 lg:items-start">
          <div className="min-w-0 lg:sticky lg:top-4 space-y-5">
            <div className="aspect-square rounded-2xl bg-orange-100 overflow-hidden">
              {astro.photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={astro.photo_url} alt={astro.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-primary-300 text-6xl">🔮</div>
              )}
            </div>
            <div className="hidden lg:block bg-white border border-orange-100 rounded-2xl p-5 shadow-[0_1px_2px_rgba(232,129,58,0.04)]">
              {lowestPrice > 0 && (
                <div className="mb-4">
                  <span className="text-[11px] text-text-muted uppercase tracking-wider font-semibold">Starting from</span>
                  <p className="text-3xl font-bold text-primary-600 leading-none mt-0.5">₹{lowestPrice.toLocaleString()}</p>
                </div>
              )}
              <Button className="w-full" size="lg" onClick={() => openSheetWith('15min')}>
                Book Consultation
              </Button>
            </div>
          </div>

          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl lg:text-[2rem] font-bold text-text-primary leading-tight mb-3">{astro.name}</h1>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mb-5">
              {astro.experience_years && (
                <span className="inline-flex items-center gap-1.5 text-base font-semibold text-text-primary">
                  <Sparkles className="w-[18px] h-[18px] text-primary-500 flex-shrink-0" />
                  <span>{astro.experience_years}+ years</span>
                </span>
              )}
              {astro.specialisation && (
                <span className="inline-flex items-center gap-1.5 text-base font-semibold text-text-primary">
                  <Clock className="w-[18px] h-[18px] text-primary-500 flex-shrink-0" />
                  <span>{astro.specialisation}</span>
                </span>
              )}
            </div>
            <div className="mb-6">
              <DevoteeProof label="Devotees consulted on Savidhi" rating={{ value: 4.7, total: '800+' }} />
            </div>
          </div>
        </div>

        {/* PACKAGES — duration tiles */}
        {durations.some((d) => d.price > 0) && (
          <section className="mt-10 sm:mt-12">
            <SectionHeading title="Choose Consultation Duration" subtitle="Speak with the astrologer directly. Notes, transcript & follow-ups available." />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
              {durations.filter((d) => d.price > 0).map((dur) => (
                <button
                  key={dur.key}
                  onClick={() => openSheetWith(dur.key)}
                  className="bg-white border-[1.5px] border-orange-100 rounded-2xl p-5 text-center hover:border-primary-300 transition shadow-[0_4px_14px_rgba(122,30,18,0.06)]"
                >
                  <Clock className="w-7 h-7 mx-auto mb-2 text-primary-500" />
                  <p className="text-sm font-bold text-text-primary">{dur.label}</p>
                  <p className="text-lg font-bold text-primary-600 tabular-nums mt-1">₹{dur.price.toLocaleString()}</p>
                  <p className="text-[11px] text-text-muted mt-2 inline-flex items-center gap-1">
                    <Check className="w-3 h-3 text-green-600" strokeWidth={3} />
                    <span>1-on-1 call</span>
                  </p>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* TRUST */}
        <section className="mt-10 sm:mt-12">
          <div className="bg-gradient-to-r from-[#7A1E12] to-[#9c2a18] rounded-2xl p-5 sm:p-7 lg:p-9 text-[#ffe9cf] grid grid-cols-3 gap-2 text-center">
            <TrustStat value={t('puja.lp.trust.devotees')}  label={t('puja.lp.trust.devoteesLabel')} />
            <TrustStat value={t('puja.lp.trust.pandits')}   label="Vedic Astrologers" />
            <TrustStat value={t('puja.lp.trust.verified')}  label="Verified Experts" />
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="mt-10 sm:mt-12">
          <SectionHeading title={t('puja.lp.howItWorks.heading')} />
          <ol className="relative mt-5 md:grid md:grid-cols-4 md:gap-5 md:before:hidden before:absolute before:top-4 before:left-[17px] before:bottom-4 before:w-[2px] before:bg-orange-200">
            {HOW_IT_WORKS_STEPS.map((s) => (
              <li key={s.num} className="relative pl-12 pb-6 last:pb-0 md:pl-0 md:pb-0 md:text-center">
                <span className="absolute left-0 top-0 md:static md:mx-auto md:mb-3 w-9 h-9 rounded-full bg-primary-50 text-primary-600 font-bold flex items-center justify-center z-10 ring-4 ring-surface-warm md:block">
                  {s.num}
                </span>
                <h4 className="font-bold text-[15px] text-text-primary">{t(s.titleKey)}</h4>
                <p className="text-[13px] text-text-secondary mt-1">{t(s.descKey)}</p>
              </li>
            ))}
          </ol>
        </section>

        {astro.bio && (
          <section className="mt-10 sm:mt-12">
            <SectionHeading title="About the Astrologer" />
            <p className="mt-3 text-[14px] text-text-secondary leading-relaxed whitespace-pre-line">{astro.bio}</p>
          </section>
        )}

        {/* TESTIMONIALS */}
        <section className="mt-10 sm:mt-12">
          <SectionHeading title={t('puja.lp.testimonials.heading')} />
          <div className="mt-5 flex gap-3 overflow-x-auto snap-x scrollbar-hide -mx-4 px-4 lg:mx-0 lg:px-0 lg:grid lg:grid-cols-3 lg:overflow-visible">
            {TESTIMONIALS.map((n, i) => (
              <div
                key={n}
                className="snap-start flex-shrink-0 w-[280px] lg:w-auto bg-white border border-orange-100 rounded-2xl p-4 shadow-[0_1px_2px_rgba(232,129,58,0.04)]"
              >
                <div className="text-yellow-500 text-sm mb-2">★★★★★</div>
                <p className="text-[13px] text-text-primary leading-snug italic">“{t(`puja.lp.testimonials.${n}.quote`)}”</p>
                <div className="flex items-center gap-2.5 mt-3 pt-3 border-t border-orange-50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={TESTIMONIAL_AVATARS[i]} alt={t(`puja.lp.testimonials.${n}.name`)} className="w-9 h-9 rounded-full object-cover bg-primary-50" />
                  <div className="min-w-0">
                    <p className="text-[13px] font-bold text-text-primary truncate">{t(`puja.lp.testimonials.${n}.name`)}</p>
                    <p className="text-[11px] text-text-muted truncate">{t(`puja.lp.testimonials.${n}.city`)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="mt-10 sm:mt-12">
          <SectionHeading title={t('puja.lp.faq.heading')} />
          <div className="mt-5 grid grid-cols-1 lg:grid-cols-2 lg:gap-x-4">
            {FAQS.map((n) => (
              <ExpandableSection key={n} title={t(`puja.lp.faq.${n}.q`)}>
                <p>{t(`puja.lp.faq.${n}.a`)}</p>
              </ExpandableSection>
            ))}
          </div>
        </section>
      </div>

      <div className="lg:hidden sticky bottom-0 bg-white border-t border-orange-100 shadow-[0_-2px_12px_rgba(232,129,58,0.08)] z-20">
        <div className="section-container max-w-2xl flex items-center gap-3 py-3">
          {lowestPrice > 0 && (
            <div className="flex flex-col leading-tight flex-shrink-0">
              <span className="text-[10px] text-text-muted uppercase font-semibold tracking-wider">From</span>
              <span className="text-xl font-bold text-primary-600 leading-none mt-0.5 tabular-nums">₹{lowestPrice.toLocaleString()}</span>
            </div>
          )}
          <Button className="flex-1" size="lg" onClick={() => openSheetWith('15min')}>
            Book Consultation
          </Button>
        </div>
      </div>

      <ConsultBookingSheet
        astrologerId={astro.id}
        astrologerSlug={astro.slug}
        astrologerName={astro.name}
        durations={durations}
        initialDuration={bookDuration}
        open={bookOpen}
        onClose={() => setBookOpen(false)}
      />
    </div>
  );
}

function SectionHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div>
      <h2 className="text-xl sm:text-2xl font-bold text-text-primary flex items-center gap-2.5">
        <span className="block w-1.5 h-6 rounded bg-gradient-to-b from-primary-400 to-primary-600" />
        {title}
      </h2>
      {subtitle && <p className="text-sm text-text-secondary mt-1.5 leading-snug">{subtitle}</p>}
    </div>
  );
}

function TrustStat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="font-display text-xl sm:text-2xl font-bold text-white leading-none">{value}</p>
      <p className="text-[11px] sm:text-xs opacity-85 mt-1">{label}</p>
    </div>
  );
}
