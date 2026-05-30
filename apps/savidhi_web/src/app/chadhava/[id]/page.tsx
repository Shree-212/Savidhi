'use client';

import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft, MapPin, Minus, Plus, Loader2, Clock, Repeat, Sparkles, Calendar, Check,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ExpandableSection } from '@/components/shared/ExpandableSection';
import { ImageSlider } from '@/components/shared/ImageSlider';
import { CountdownTimer } from '@/components/shared/CountdownTimer';
import { DevoteeProof } from '@/components/shared/DevoteeProof';
import { ChadhavaBookingSheet } from '@/components/shared/ChadhavaBookingSheet';
import { chadhavaService, chadhavaEventService } from '@/lib/services';
import { mapChadhava } from '@/lib/mappers';
import type { Chadhava } from '@/data/models';
import { normaliseMediaUrl, formatEventDateWithHindiDay } from '@/lib/utils';
import { useT, useLocale } from '@/lib/i18n';
import { getRepeatLabel } from '@/lib/repeatLabel';
import { trackEvent } from '@/lib/analytics';

const TESTIMONIAL_AVATARS = [
  'https://images.pexels.com/photos/1239288/pexels-photo-1239288.jpeg?auto=compress&w=160&h=160&fit=crop',
  'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&w=160&h=160&fit=crop',
  'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&w=160&h=160&fit=crop',
  'https://images.pexels.com/photos/1681010/pexels-photo-1681010.jpeg?auto=compress&w=160&h=160&fit=crop',
];

const HOW_IT_WORKS_STEPS = [
  { num: 1, titleKey: 'chadhava.lp.howItWorks.step1.title', descKey: 'chadhava.lp.howItWorks.step1.desc' },
  { num: 2, titleKey: 'chadhava.lp.howItWorks.step2.title', descKey: 'chadhava.lp.howItWorks.step2.desc' },
  { num: 3, titleKey: 'chadhava.lp.howItWorks.step3.title', descKey: 'chadhava.lp.howItWorks.step3.desc' },
  { num: 4, titleKey: 'chadhava.lp.howItWorks.step4.title', descKey: 'chadhava.lp.howItWorks.step4.desc' },
];

const TESTIMONIALS = [1, 2, 3, 4] as const;
const FAQS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

export default function ChadhavaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useT();
  const { locale } = useLocale();
  const [chadhava, setChadhava] = useState<Chadhava | null>(null);
  const [chadhavaRaw, setChadhavaRaw] = useState<Record<string, unknown> | null>(null);
  const [nextEventStart, setNextEventStart] = useState<string | null>(null);
  const [isSingleEvent, setIsSingleEvent] = useState(false);
  const [loading, setLoading] = useState(true);
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  // In-page booking sheet
  const [bookOpen, setBookOpen] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.allSettled([
      chadhavaService.getById(id),
      chadhavaEventService.list({ chadhava_id: id, upcoming: true, limit: 5 }),
    ]).then(([chRes, evRes]) => {
      if (chRes.status === 'fulfilled') {
        const raw = chRes.value.data?.data ?? chRes.value.data;
        if (raw) {
          setChadhava(mapChadhava(raw));
          setChadhavaRaw(raw);
          setIsSingleEvent(raw.event_repeats === false);
          trackEvent('view_content', {
            content_type: 'product',
            content_category: 'chadhava',
            content_ids: [raw.slug || raw.id || id],
            content_name: raw.name,
            currency: 'INR',
          });
        }
      }
      if (evRes.status === 'fulfilled') {
        const evs = (evRes.value.data?.data ?? []) as Array<{ status: string; stage: string; start_time: string }>;
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

  if (!chadhava || !chadhavaRaw) {
    return (
      <div className="section-container py-20 text-center text-text-secondary">
        {t('chadhava.detail.notFound')} <Link href="/chadhava" className="text-primary-500 underline">{t('puja.detail.goBack')}</Link>
      </div>
    );
  }

  const total = chadhava.offerings.reduce((sum, off) => sum + (quantities[off.id] || 0) * off.price, 0);
  const updateQty = (offId: string, delta: number) => {
    setQuantities((prev) => ({ ...prev, [offId]: Math.max(0, (prev[offId] || 0) + delta) }));
  };

  // Open booking sheet with whichever offerings the user has already picked.
  const openSheet = () => setBookOpen(true);
  const templeSignificance = (chadhavaRaw.temple_significance as string | undefined) || '';
  const deitySignificance = (chadhavaRaw.deity_significance as string | undefined) || '';

  return (
    <div className="min-h-screen bg-surface-warm">
      <div className="section-container max-w-6xl pt-3 sm:pt-6 pb-6 sm:pb-8">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-3 sm:mb-5">
          <Link
            href="/chadhava"
            className="inline-flex items-center gap-2 text-sm font-medium text-text-secondary hover:text-primary-500 transition group"
          >
            <span className="w-8 h-8 rounded-full bg-white border border-border-DEFAULT flex items-center justify-center group-hover:border-primary-300 group-hover:bg-primary-50 transition">
              <ArrowLeft className="w-4 h-4" />
            </span>
            <span className="hidden sm:inline">{t('chadhava.detail.back')}</span>
          </Link>
        </div>

        {/* ─────────────────── BANNER (kept intact) ─────────────────── */}
        <div className="grid lg:grid-cols-[5fr_7fr] gap-4 sm:gap-6 lg:gap-10 lg:items-start">
          {/* LEFT — gallery only, sticky on desktop. */}
          <div className="min-w-0 lg:sticky lg:top-4">
            <ImageSlider
              images={chadhava.sliderImages ?? (chadhava.imageUrl ? [chadhava.imageUrl] : [])}
              alt={chadhava.name}
            />
          </div>

          {/* RIGHT — title + meta + countdown + DevoteeProof + desktop CTA */}
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl lg:text-[2rem] font-bold text-text-primary leading-tight mb-2 sm:mb-3">
              {chadhava.name}
            </h1>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-base font-semibold text-text-primary mb-4 sm:mb-5">
              {chadhava.templeName && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="w-[18px] h-[18px] text-green-500 flex-shrink-0" />
                  <span className="line-clamp-2">{chadhava.templeName}{chadhava.templeLocation ? `, ${chadhava.templeLocation}` : ''}</span>
                </span>
              )}
              {chadhava.deityName && (
                <span className="inline-flex items-center gap-1.5">
                  <Sparkles className="w-[18px] h-[18px] text-primary-500 flex-shrink-0" />
                  <span>{chadhava.deityName}</span>
                </span>
              )}
              {chadhava.durationMinutes ? (
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="w-[18px] h-[18px] text-primary-500 flex-shrink-0" />
                  <span>{chadhava.durationMinutes} min</span>
                </span>
              ) : null}
              {(() => {
                const label = getRepeatLabel(t, chadhava);
                return label ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Repeat className="w-[18px] h-[18px] text-primary-500 flex-shrink-0" />
                    <span>{label}</span>
                  </span>
                ) : null;
              })()}
            </div>

            {isSingleEvent && nextEventStart && (
              <div className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary-700 bg-primary-50 border border-primary-100 px-3 py-1.5 rounded-full">
                <Calendar className="w-4 h-4 text-primary-500 flex-shrink-0" />
                <span>{formatEventDateWithHindiDay(nextEventStart)}</span>
              </div>
            )}

            {nextEventStart && (
              <div className="mb-5">
                <CountdownTimer target={nextEventStart} label="Chadhava starts in" />
              </div>
            )}

            <div className="mb-6">
              <DevoteeProof label="Devotees have offered Chadhava" rating={{ value: 4.6, total: '1k+' }} />
            </div>

            {/* Desktop-only inline CTA at the bottom of the right column. */}
            <div className="hidden lg:flex items-center gap-4 bg-white border border-orange-100 rounded-2xl p-4 shadow-[0_1px_2px_rgba(232,129,58,0.04)]">
              <div className="flex flex-col leading-tight">
                <span className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">
                  {total > 0 ? t('chadhava.detail.yourOffering') : t('chadhava.detail.arpitKare')}
                </span>
                <span className="text-2xl font-bold text-primary-600 leading-none mt-1 tabular-nums">
                  ₹{(total || chadhava.startingPrice).toLocaleString()}
                </span>
              </div>
              <Button className="ml-auto px-7" size="lg" onClick={openSheet}>
                {t('chadhava.detail.offerFor', { amount: String(total || chadhava.startingPrice) })}
              </Button>
            </div>
          </div>
        </div>

        {/* ─────────────────── OFFERINGS ─────────────────── */}
        {chadhava.offerings.length > 0 && (
          <section className="mt-10 sm:mt-12">
            <SectionHeading title={t('chadhava.lp.offerings.heading')} subtitle={t('chadhava.lp.offerings.subheading')} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
              {chadhava.offerings.map((off) => {
                const qty = quantities[off.id] ?? 0;
                const isActive = qty > 0;
                return (
                  <div
                    key={off.id}
                    className={`bg-white border-[1.5px] rounded-2xl overflow-hidden flex flex-col shadow-[0_4px_14px_rgba(122,30,18,0.06)] ${
                      isActive ? 'border-primary-400 ring-4 ring-primary-100' : 'border-orange-100'
                    }`}
                  >
                    <div className="flex items-start gap-3 p-4">
                      {off.imageUrl && (
                        <div className="relative w-[68px] h-[68px] rounded-xl overflow-hidden ring-1 ring-orange-100 flex-shrink-0">
                          <Image
                            src={normaliseMediaUrl(off.imageUrl)}
                            alt={off.name}
                            fill
                            className="object-cover"
                            unoptimized
                            sizes="68px"
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-[15px] text-text-primary leading-snug">{off.name}</h3>
                        {off.description && (
                          <p className="text-[12px] text-text-muted mt-0.5 leading-snug line-clamp-2">{off.description}</p>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-lg font-bold text-primary-600 tabular-nums">₹{off.price}</p>
                      </div>
                    </div>
                    <div className="px-4 pb-4 mt-auto flex items-center gap-3">
                      {qty > 0 ? (
                        <div className="flex items-center gap-1.5 bg-primary-50 rounded-full p-0.5">
                          <button
                            onClick={() => updateQty(off.id, -1)}
                            className="w-7 h-7 rounded-full bg-white border border-primary-200 flex items-center justify-center text-primary-500 hover:bg-primary-100 transition"
                            aria-label="Decrease"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-6 text-center text-sm font-bold text-primary-700 tabular-nums">{qty}</span>
                          <button
                            onClick={() => updateQty(off.id, 1)}
                            className="w-7 h-7 rounded-full bg-primary-500 text-white flex items-center justify-center hover:bg-primary-600 transition"
                            aria-label="Increase"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => updateQty(off.id, 1)}
                          className="text-sm font-semibold text-primary-600 border border-primary-300 rounded-full px-4 py-1.5 hover:bg-primary-50 transition"
                        >
                          + {t('chadhava.lp.offerings.add')}
                        </button>
                      )}
                      <Button className="flex-1 ml-auto" onClick={openSheet}>
                        {t('chadhava.lp.offerings.bookNow')}
                      </Button>
                    </div>
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
          <SectionHeading title={t('chadhava.lp.howItWorks.heading')} />
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

        {/* ─────────────────── ABOUT ─────────────────── */}
        {chadhava.description && (
          <section className="mt-10 sm:mt-12">
            <SectionHeading title={t('chadhava.lp.about.heading')} />
            <p className="mt-3 text-[14px] text-text-secondary leading-relaxed whitespace-pre-line">
              {chadhava.description}
            </p>
          </section>
        )}

        {/* ─────────────────── BENEFITS / RITUALS / ITEMS (existing expandables) ─────────────────── */}
        {(chadhava.benefits.length > 0 || chadhava.ritualsIncluded.length > 0 || (chadhava.itemsUsed && chadhava.itemsUsed.length > 0)) && (
          <section className="mt-8 space-y-3">
            {chadhava.benefits.length > 0 && (
              <ExpandableSection title={t('chadhava.detail.benefits')} initiallyExpanded>
                {chadhava.benefits.map((b, i) => <p key={i}>• {b}</p>)}
              </ExpandableSection>
            )}
            {chadhava.ritualsIncluded.length > 0 && (
              <ExpandableSection title={t('chadhava.detail.rituals')}>
                {chadhava.ritualsIncluded.map((r, i) => <p key={i}>• {r}</p>)}
              </ExpandableSection>
            )}
            {chadhava.itemsUsed && chadhava.itemsUsed.length > 0 && (
              <ExpandableSection title={t('chadhava.detail.itemsUsed')}>
                {chadhava.itemsUsed.map((it, i) => <p key={i}>• {it}</p>)}
              </ExpandableSection>
            )}
          </section>
        )}

        {/* ─────────────────── TEMPLE / DEITY SIGNIFICANCE ─────────────────── */}
        {templeSignificance && (
          <section className="mt-10 sm:mt-12">
            <SectionHeading title={t('puja.lp.temple.heading')} />
            <div className="mt-3 bg-white border border-orange-100 rounded-2xl p-5 shadow-[0_1px_2px_rgba(232,129,58,0.04)]">
              <h4 className="font-display text-[16px] font-semibold text-[#7A1E12] flex items-center gap-2 mb-1">
                <span>🛕</span>
                <span>{chadhava.templeName}{chadhava.templeLocation ? `, ${chadhava.templeLocation}` : ''}</span>
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
                <span>{chadhava.deityName}</span>
              </h4>
              <p className="text-[13px] text-text-primary leading-relaxed">{deitySignificance}</p>
            </div>
          </section>
        )}

        {/* ─────────────────── TESTIMONIALS ─────────────────── */}
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
          <div className="flex flex-col leading-tight flex-shrink-0">
            <span className="text-[10px] text-text-muted uppercase font-semibold tracking-wider">
              {total > 0 ? t('chadhava.detail.total') : t('chadhava.detail.arpitKare')}
            </span>
            <span className="text-xl font-bold text-primary-600 leading-none mt-0.5 tabular-nums">
              ₹{(total || chadhava.startingPrice).toLocaleString()}
            </span>
          </div>
          <Button className="flex-1" size="lg" onClick={openSheet}>
            {t('chadhava.detail.offerNow')}
          </Button>
        </div>
      </div>

      <ChadhavaBookingSheet
        chadhavaId={id}
        chadhavaName={chadhava.name}
        chadhavaRaw={chadhavaRaw as Parameters<typeof ChadhavaBookingSheet>[0]['chadhavaRaw']}
        initialOfferings={quantities}
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
