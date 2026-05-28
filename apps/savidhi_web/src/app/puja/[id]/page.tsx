'use client';

import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Loader2,
  Clock,
  Repeat,
  Sparkles,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ImageSlider } from '@/components/shared/ImageSlider';
import { CountdownTimer } from '@/components/shared/CountdownTimer';
import { DevoteeProof } from '@/components/shared/DevoteeProof';
import { ExpandableSection } from '@/components/shared/ExpandableSection';
import { BookingSheet } from '@/components/shared/BookingSheet';
import { pujaService, pujaEventService } from '@/lib/services';
import { mapPuja } from '@/lib/mappers';
import type { Puja } from '@/data/models';
import { useT, useLocale } from '@/lib/i18n';
import { getRepeatLabel } from '@/lib/repeatLabel';
import { formatEventDateWithHindiDay } from '@/lib/utils';
import { trackEvent } from '@/lib/analytics';

// Dummy package thumbnails — real human photography. Marketing will swap these
// for final CDN URLs. Keyed by devotee tier count so a future BE pricing
// override can supply per-puja overrides easily.
const PACKAGE_THUMBS: Record<number, string> = {
  1: 'https://images.pexels.com/photos/3331094/pexels-photo-3331094.jpeg?auto=compress&w=200&h=200&fit=crop',
  2: 'https://images.pexels.com/photos/1024960/pexels-photo-1024960.jpeg?auto=compress&w=200&h=200&fit=crop',
  4: 'https://images.pexels.com/photos/3171837/pexels-photo-3171837.jpeg?auto=compress&w=200&h=200&fit=crop',
  6: 'https://images.pexels.com/photos/3768131/pexels-photo-3768131.jpeg?auto=compress&w=200&h=200&fit=crop',
};

const TESTIMONIAL_AVATARS = [
  'https://images.pexels.com/photos/1239288/pexels-photo-1239288.jpeg?auto=compress&w=160&h=160&fit=crop',
  'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&w=160&h=160&fit=crop',
  'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&w=160&h=160&fit=crop',
  'https://images.pexels.com/photos/1681010/pexels-photo-1681010.jpeg?auto=compress&w=160&h=160&fit=crop',
];

const DEVOTEE_PACKAGE_TIERS = [
  { count: 1, field: 'price_for_1', nameKey: 'puja.lp.packages.individual',  devKey: 'puja.lp.packages.devotees.1', ribbon: null },
  { count: 2, field: 'price_for_2', nameKey: 'puja.lp.packages.partner',     devKey: 'puja.lp.packages.devotees.2', ribbon: 'puja.lp.packages.ribbon.mostChosen' },
  { count: 4, field: 'price_for_4', nameKey: 'puja.lp.packages.family',      devKey: 'puja.lp.packages.devotees.4', ribbon: 'puja.lp.packages.ribbon.bestValue' },
  { count: 6, field: 'price_for_6', nameKey: 'puja.lp.packages.jointFamily', devKey: 'puja.lp.packages.devotees.6', ribbon: null },
] as const;

const PACKAGE_BENEFITS = [
  'puja.lp.packages.benefit.sankalp',
  'puja.lp.packages.benefit.video',
  'puja.lp.packages.benefit.whatsapp',
  'puja.lp.packages.benefit.prasad',
];

const HOW_IT_WORKS_STEPS = [
  { num: 1, titleKey: 'puja.lp.howItWorks.step1.title', descKey: 'puja.lp.howItWorks.step1.desc' },
  { num: 2, titleKey: 'puja.lp.howItWorks.step2.title', descKey: 'puja.lp.howItWorks.step2.desc' },
  { num: 3, titleKey: 'puja.lp.howItWorks.step3.title', descKey: 'puja.lp.howItWorks.step3.desc' },
  { num: 4, titleKey: 'puja.lp.howItWorks.step4.title', descKey: 'puja.lp.howItWorks.step4.desc' },
];

const TESTIMONIALS = [1, 2, 3, 4] as const;
const FAQS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

export default function PujaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useT();
  const { locale } = useLocale();
  const [puja, setPuja] = useState<Puja | null>(null);
  const [pujaRaw, setPujaRaw] = useState<Record<string, unknown> | null>(null);
  const [nextEventStart, setNextEventStart] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Sheet state. `bookOpen` controls visibility; `bookDevoteeCount` is the
  // tier the user clicked on a package card so the sheet opens pre-seeded.
  const [bookOpen, setBookOpen] = useState(false);
  const [bookDevoteeCount, setBookDevoteeCount] = useState(1);

  useEffect(() => {
    setLoading(true);
    Promise.allSettled([
      pujaService.getById(id),
      pujaEventService.list({ puja_id: id, upcoming: true, limit: 5 }),
    ]).then(([pujaRes, evRes]) => {
      if (pujaRes.status === 'fulfilled') {
        const raw = pujaRes.value.data?.data ?? pujaRes.value.data;
        if (raw) {
          setPuja(mapPuja(raw));
          setPujaRaw(raw);
          trackEvent('view_content', {
            content_type: 'puja',
            content_ids: [raw.slug || raw.id || id],
            content_name: raw.name,
            value: Number(raw.price_for_1 ?? 0) || undefined,
            currency: 'INR',
          });
        }
      }
      if (evRes.status === 'fulfilled') {
        const evs = (evRes.value.data?.data ?? []) as Array<{
          status: string; stage: string; start_time: string;
        }>;
        const future = evs
          .filter((e) => e.status === 'NOT_STARTED' && e.stage === 'YET_TO_START')
          .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
        if (future[0]) setNextEventStart(future[0].start_time);
      }
    }).finally(() => setLoading(false));
  }, [id, locale]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  if (!puja || !pujaRaw) {
    return (
      <div className="section-container py-20 text-center text-text-secondary">
        {t('puja.detail.notFound')} <Link href="/puja" className="text-primary-500 underline">{t('puja.detail.goBack')}</Link>
      </div>
    );
  }

  // Available package tiers — only ones with a real price configured.
  const availableTiers = DEVOTEE_PACKAGE_TIERS
    .map((tier) => ({ ...tier, price: Number(pujaRaw[tier.field] ?? 0) }))
    .filter((tier) => tier.price > 0);

  const openBookingFor = (devoteeCount: number) => {
    setBookDevoteeCount(devoteeCount);
    setBookOpen(true);
  };

  const templeSignificance = (pujaRaw.temple_significance as string | undefined) || '';
  const deitySignificance = (pujaRaw.deity_significance as string | undefined) || '';

  return (
    <div className="min-h-screen bg-surface-warm">
      <div className="section-container max-w-6xl pt-3 sm:pt-6 pb-6 sm:pb-8">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-3 sm:mb-5">
          <Link
            href="/puja"
            className="inline-flex items-center gap-2 text-sm font-medium text-text-secondary hover:text-primary-500 transition group"
          >
            <span className="w-8 h-8 rounded-full bg-white border border-border-DEFAULT flex items-center justify-center group-hover:border-primary-300 group-hover:bg-primary-50 transition">
              <ArrowLeft className="w-4 h-4" />
            </span>
            <span className="hidden sm:inline">{t('puja.detail.back')}</span>
          </Link>
        </div>

        {/* ─────────────────── BANNER (kept intact) ─────────────────── */}
        <div className="grid lg:grid-cols-[5fr_7fr] gap-4 sm:gap-6 lg:gap-10 lg:items-start">
          {/* LEFT — gallery (sticky on desktop so the buy box on the right
              stays beside the image while users scroll the detail text) */}
          <div className="min-w-0 lg:sticky lg:top-4">
            <ImageSlider
              images={puja.sliderImages ?? (puja.imageUrl ? [puja.imageUrl] : [])}
              alt={puja.name}
            />
          </div>

          {/* RIGHT — title + meta + countdown + DevoteeProof + desktop CTA */}
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl lg:text-[2rem] font-bold text-text-primary leading-tight mb-3">
              {puja.name}
            </h1>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mb-5">
              {puja.templeName && (
                <span className="inline-flex items-center gap-1.5 text-base font-semibold text-text-primary">
                  <MapPin className="w-[18px] h-[18px] text-green-500 flex-shrink-0" />
                  <span>{puja.templeName}{puja.templeLocation ? `, ${puja.templeLocation}` : ''}</span>
                </span>
              )}
              {puja.deityName && (
                <span className="inline-flex items-center gap-1.5 text-base font-semibold text-text-primary">
                  <Sparkles className="w-[18px] h-[18px] text-primary-500 flex-shrink-0" />
                  <span>{puja.deityName}</span>
                </span>
              )}
              {puja.date && (
                <span className="inline-flex items-center gap-1.5 text-base font-semibold text-text-primary">
                  <Calendar className="w-[18px] h-[18px] text-primary-500 flex-shrink-0" />
                  <span>{puja.date}{puja.time ? `, ${puja.time}` : ''}</span>
                </span>
              )}
              {puja.durationMinutes ? (
                <span className="inline-flex items-center gap-1.5 text-base font-semibold text-text-primary">
                  <Clock className="w-[18px] h-[18px] text-primary-500 flex-shrink-0" />
                  <span>{t('puja.detail.duration', { n: puja.durationMinutes })}</span>
                </span>
              ) : null}
              {(() => {
                const label = getRepeatLabel(t, puja);
                return label ? (
                  <span className="inline-flex items-center gap-1.5 text-base font-semibold text-text-primary">
                    <Repeat className="w-[18px] h-[18px] text-primary-500 flex-shrink-0" />
                    <span>{label}</span>
                  </span>
                ) : null;
              })()}
            </div>

            {pujaRaw.event_repeats === false && nextEventStart && (
              <div className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary-700 bg-primary-50 border border-primary-100 px-3 py-1.5 rounded-full">
                <Calendar className="w-4 h-4 text-primary-500 flex-shrink-0" />
                <span>{formatEventDateWithHindiDay(nextEventStart)}</span>
              </div>
            )}

            {nextEventStart && (
              <div className="mb-5">
                <CountdownTimer target={nextEventStart} label={t('puja.detail.pujaStartsIn') || 'Puja starts in'} />
              </div>
            )}

            <div className="mb-6">
              <DevoteeProof rating={{ value: 4.6, total: '1k+' }} />
            </div>

            {/* Desktop-only inline CTA — sits at the bottom of the right column
                so the buy-box stays in the natural reading flow alongside the
                gallery, instead of leaving the right column stub-short. */}
            <div className="hidden lg:flex items-center gap-4 bg-white border border-orange-100 rounded-2xl p-4 shadow-[0_1px_2px_rgba(232,129,58,0.04)]">
              {puja.pricePerDevotee && (
                <div className="flex flex-col leading-tight">
                  <span className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">{t('puja.detail.startingFrom')}</span>
                  <span className="text-2xl font-bold text-primary-600 leading-none mt-1 tabular-nums">
                    ₹{puja.pricePerDevotee.toLocaleString()}
                    <span className="text-xs text-text-muted font-medium ml-1">/ {t('puja.detail.perDevotee')}</span>
                  </span>
                </div>
              )}
              <Button className="ml-auto px-7" size="lg" onClick={() => openBookingFor(1)}>
                {t('puja.detail.selectPuja')}
              </Button>
            </div>

            {/* Quick "What's included" strip — gives the right column more
                vertical weight on desktop so the gallery and content end at
                roughly the same point. Hidden on mobile (already covered by
                package cards below the fold). */}
            <div className="hidden lg:grid grid-cols-2 gap-2 mt-4">
              {['puja.lp.packages.benefit.sankalp', 'puja.lp.packages.benefit.video', 'puja.lp.packages.benefit.whatsapp', 'puja.lp.packages.benefit.prasad'].map((bKey) => (
                <div key={bKey} className="flex items-start gap-2 text-[12.5px] text-text-primary leading-snug bg-orange-50/60 border border-orange-100 rounded-lg px-3 py-2">
                  <Check className="w-3.5 h-3.5 text-green-600 mt-0.5 flex-shrink-0" strokeWidth={3} />
                  <span>{t(bKey)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ─────────────────── PARTICIPATE / PACKAGES ─────────────────── */}
        {availableTiers.length > 0 && (
          <section className="mt-10 sm:mt-12">
            <SectionHeading title={t('puja.lp.packages.heading')} subtitle={t('puja.lp.packages.subheading')} />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-5">
              {availableTiers.map((tier) => {
                // Strike price is +20% rounded up to the next 50 — a familiar
                // promo pattern for ad LPs. Purely visual, never sent to BE.
                const strike = Math.ceil((tier.price * 1.2) / 50) * 50;
                const isFeatured = tier.ribbon === 'puja.lp.packages.ribbon.mostChosen';
                return (
                  <div
                    key={tier.count}
                    className={`relative bg-white border-[1.5px] rounded-2xl overflow-hidden shadow-[0_4px_14px_rgba(122,30,18,0.08)] flex flex-col ${
                      isFeatured ? 'border-primary-500 ring-4 ring-primary-100' : 'border-orange-100'
                    }`}
                  >
                    {tier.ribbon && (
                      <span className="absolute top-3 right-0 bg-gradient-to-r from-yellow-500 to-primary-500 text-white text-[10.5px] font-bold tracking-wide py-1 pl-2.5 pr-3 rounded-l-full shadow-sm z-10">
                        {t(tier.ribbon)}
                      </span>
                    )}
                    <div className="flex items-center gap-3 p-4">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={PACKAGE_THUMBS[tier.count]}
                        alt={t(tier.nameKey)}
                        className="w-[70px] h-[70px] rounded-2xl object-cover flex-shrink-0 bg-primary-50"
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-[17px] text-text-primary leading-tight">{t(tier.nameKey)}</h3>
                        <p className="text-xs text-text-secondary mt-0.5">{t(tier.devKey)}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs text-text-muted line-through tabular-nums">₹{strike.toLocaleString()}</p>
                        <p className="text-xl font-bold text-primary-600 tabular-nums leading-none mt-0.5">₹{tier.price.toLocaleString()}</p>
                      </div>
                    </div>
                    <ul className="px-4 pb-3 flex flex-col gap-1.5 flex-1">
                      {PACKAGE_BENEFITS.map((bKey) => (
                        <li key={bKey} className="flex items-start gap-2 text-[13px] text-text-primary leading-snug">
                          <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" strokeWidth={3} />
                          <span>{t(bKey)}</span>
                        </li>
                      ))}
                    </ul>
                    <Button
                      className="m-4 mt-2"
                      size="lg"
                      onClick={() => openBookingFor(tier.count)}
                    >
                      {t('puja.lp.packages.bookNow')}
                    </Button>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ─────────────────── TRUST STRIP ─────────────────── */}
        <section className="mt-10 sm:mt-12">
          <div className="bg-gradient-to-r from-[#7A1E12] to-[#9c2a18] rounded-2xl p-5 sm:p-7 lg:p-9 text-[#ffe9cf] grid grid-cols-3 gap-2 text-center">
            <TrustStat value={t('puja.lp.trust.devotees')}  label={t('puja.lp.trust.devoteesLabel')} />
            <TrustStat value={t('puja.lp.trust.pandits')}   label={t('puja.lp.trust.panditsLabel')} />
            <TrustStat value={t('puja.lp.trust.verified')}  label={t('puja.lp.trust.verifiedLabel')} />
          </div>
        </section>

        {/* ─────────────────── HOW IT WORKS ─────────────────── */}
        <section className="mt-10 sm:mt-12">
          <SectionHeading title={t('puja.lp.howItWorks.heading')} />
          {/* Mobile: vertical timeline with a left rail connector. Desktop: 4-column grid. */}
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

        {/* ─────────────────── ABOUT THIS PUJA ─────────────────── */}
        {puja.description && (
          <section className="mt-10 sm:mt-12">
            <SectionHeading title={t('puja.lp.about.heading')} />
            <p className="mt-3 text-[14px] text-text-secondary leading-relaxed whitespace-pre-line">
              {puja.description}
            </p>
          </section>
        )}

        {/* ─────────────────── TEMPLE & DEITY SIGNIFICANCE (optional) ─────────────────── */}
        {templeSignificance && (
          <section className="mt-10 sm:mt-12">
            <SectionHeading title={t('puja.lp.temple.heading')} />
            <div className="mt-3 bg-white border border-orange-100 rounded-2xl p-5 shadow-[0_1px_2px_rgba(232,129,58,0.04)]">
              <h4 className="font-display text-[16px] font-semibold text-[#7A1E12] flex items-center gap-2 mb-1">
                <span>🛕</span>
                <span>{puja.templeName}{puja.templeLocation ? `, ${puja.templeLocation}` : ''}</span>
              </h4>
              <p className="text-[13px] text-text-primary leading-relaxed">{templeSignificance}</p>
            </div>
          </section>
        )}
        {deitySignificance && (
          <section className="mt-10 sm:mt-12">
            <SectionHeading title={t('puja.lp.deity.heading')} />
            <div className="mt-3 bg-white border border-orange-100 rounded-2xl p-5 shadow-[0_1px_2px_rgba(232,129,58,0.04)]">
              <h4 className="font-display text-[16px] font-semibold text-[#7A1E12] flex items-center gap-2 mb-1">
                <span>🐘</span>
                <span>{puja.deityName}</span>
              </h4>
              <p className="text-[13px] text-text-primary leading-relaxed">{deitySignificance}</p>
            </div>
          </section>
        )}

        {/* ─────────────────── TESTIMONIALS ─────────────────── */}
        <section className="mt-10 sm:mt-12">
          <SectionHeading title={t('puja.lp.testimonials.heading')} />
          {/* Mobile: horizontal snap scroll. Desktop: 3-up grid (rows wrap). */}
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

        {/* ─────────────────── FAQ ─────────────────── */}
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

      {/* Mobile sticky CTA */}
      <div className="lg:hidden sticky bottom-0 bg-white border-t border-orange-100 shadow-[0_-2px_12px_rgba(232,129,58,0.08)] z-20">
        <div className="section-container max-w-2xl flex items-center gap-3 py-3">
          {puja.pricePerDevotee && (
            <div className="flex flex-col leading-tight flex-shrink-0">
              <span className="text-[10px] text-text-muted uppercase font-semibold tracking-wider">{t('puja.detail.from')}</span>
              <span className="text-xl font-bold text-primary-600 leading-none mt-0.5 tabular-nums">
                ₹{puja.pricePerDevotee.toLocaleString()}
              </span>
            </div>
          )}
          <Button className="flex-1" size="lg" onClick={() => openBookingFor(1)}>
            {t('puja.detail.selectPuja')}
          </Button>
        </div>
      </div>

      {/* Booking sheet */}
      <BookingSheet
        pujaId={id}
        pujaName={puja.name}
        pujaRaw={pujaRaw as Parameters<typeof BookingSheet>[0]['pujaRaw']}
        initialDevoteeCount={bookDevoteeCount}
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
