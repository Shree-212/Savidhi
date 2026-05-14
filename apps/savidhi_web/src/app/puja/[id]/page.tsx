'use client';

import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, MapPin, Calendar, Loader2, Clock, Repeat, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ExpandableSection } from '@/components/shared/ExpandableSection';
import { ImageSlider } from '@/components/shared/ImageSlider';
import { CountdownTimer } from '@/components/shared/CountdownTimer';
import { DevoteeProof } from '@/components/shared/DevoteeProof';
import { pujaService, pujaEventService } from '@/lib/services';
import { mapPuja } from '@/lib/mappers';
import type { Puja } from '@/data/models';
import { useT, useLocale } from '@/lib/i18n';
import { getRepeatLabel } from '@/lib/repeatLabel';

const DEVOTEE_PACKAGE_TIERS = [
  { count: 1, field: 'price_for_1' },
  { count: 2, field: 'price_for_2' },
  { count: 4, field: 'price_for_4' },
  { count: 6, field: 'price_for_6' },
] as const;

export default function PujaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useT();
  const { locale } = useLocale();
  const [puja, setPuja] = useState<Puja | null>(null);
  const [pujaRaw, setPujaRaw] = useState<any>(null);
  const [nextEventStart, setNextEventStart] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.allSettled([
      pujaService.getById(id),
      pujaEventService.list({ puja_id: id, upcoming: true, limit: 5 }),
    ]).then(([pujaRes, evRes]) => {
      if (pujaRes.status === 'fulfilled') {
        const raw = pujaRes.value.data?.data ?? pujaRes.value.data;
        if (raw) { setPuja(mapPuja(raw)); setPujaRaw(raw); }
      }
      if (evRes.status === 'fulfilled') {
        const evs: any[] = evRes.value.data?.data ?? [];
        // Use the next event the customer can actually book against.
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

  if (!puja) {
    return (
      <div className="section-container py-20 text-center text-text-secondary">
        {t('puja.detail.notFound')} <Link href="/puja" className="text-primary-500 underline">{t('puja.detail.goBack')}</Link>
      </div>
    );
  }

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

        {/* Two-column layout (lg+): gallery+CTA left (sticky), content right */}
        <div className="grid lg:grid-cols-[5fr_7fr] gap-4 sm:gap-6 lg:gap-10 lg:items-start">
          {/* LEFT — gallery + action card */}
          <div className="min-w-0 lg:sticky lg:top-4 space-y-5">
            <ImageSlider
              images={puja.sliderImages ?? (puja.imageUrl ? [puja.imageUrl] : [])}
              alt={puja.name}
            />

            {/* Action card — desktop only */}
            <div className="hidden lg:block bg-white border border-orange-100 rounded-2xl p-5 shadow-[0_1px_2px_rgba(232,129,58,0.04)]">
              {puja.countdown && (
                <span className="inline-flex items-center bg-primary-100 text-primary-700 px-2.5 py-0.5 rounded-full text-xs font-semibold mb-3">
                  {puja.countdown}
                </span>
              )}
              {puja.pricePerDevotee && (
                <div className="mb-4">
                  <span className="text-[11px] text-text-muted uppercase tracking-wider font-semibold">{t('puja.detail.startingFrom')}</span>
                  <p className="text-3xl font-bold text-primary-600 leading-none mt-0.5">
                    ₹{puja.pricePerDevotee}
                    <span className="text-sm text-text-muted font-medium ml-1.5">{t('puja.detail.perDevotee')}</span>
                  </p>
                </div>
              )}
              <Link href={`/puja/${puja.slug || puja.id}/book`}>
                <Button className="w-full" size="lg">
                  {t('puja.detail.selectPuja')}
                </Button>
              </Link>
            </div>
          </div>

          {/* RIGHT — content (min-w-0 lets the grid track shrink to the
              column allotment instead of stretching past viewport on mobile) */}
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl lg:text-[2rem] font-bold text-text-primary leading-tight mb-3">
              {puja.name}
            </h1>

            {/* Meta row — bumped to base size + bold per the May-14 redesign so the
                temple / deity / duration / repeat values read prominently. */}
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

            {nextEventStart && (
              <div className="mb-5">
                <CountdownTimer target={nextEventStart} label={t('puja.detail.pujaStartsIn') || 'Puja starts in'} />
              </div>
            )}

            <div className="mb-6">
              <DevoteeProof rating={{ value: 4.6, total: '1k+' }} />
            </div>

            {puja.description ? (
              <p className="text-sm text-text-secondary leading-relaxed mb-5 whitespace-pre-line">
                {puja.description}
              </p>
            ) : null}

            {(() => {
              const tiers = pujaRaw
                ? DEVOTEE_PACKAGE_TIERS
                    .map((tier) => ({ count: tier.count, price: Number(pujaRaw[tier.field] ?? 0) }))
                    .filter((tier) => tier.price > 0)
                : [];
              if (tiers.length === 0) return null;
              return (
                <div className="mb-4 p-4 rounded-2xl bg-white border border-orange-100 shadow-[0_1px_2px_rgba(232,129,58,0.04)]">
                  <p className="text-sm font-semibold text-text-primary mb-2">
                    {tiers.length} devotee package{tiers.length > 1 ? 's' : ''} to choose from
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {tiers.map((tier) => (
                      <span
                        key={tier.count}
                        className="inline-flex items-center gap-2 bg-primary-50 border border-orange-100 rounded-full px-3 py-1.5 text-xs font-semibold text-text-primary"
                      >
                        <span>{tier.count} {tier.count === 1 ? 'Devotee' : 'Devotees'}</span>
                        <span className="text-primary-600 tabular-nums">₹{tier.price.toLocaleString()}</span>
                      </span>
                    ))}
                  </div>
                </div>
              );
            })()}

            <div className="space-y-3">
              {puja.benefits.length > 0 && (
                <ExpandableSection title={t('puja.detail.benefits')} initiallyExpanded>
                  {puja.benefits.map((b, i) => <p key={i}>• {b}</p>)}
                </ExpandableSection>
              )}

              {puja.ritualsIncluded.length > 0 && (
                <ExpandableSection title={t('puja.detail.rituals')}>
                  {puja.ritualsIncluded.map((r, i) => <p key={i}>• {r}</p>)}
                </ExpandableSection>
              )}

              {puja.itemsUsed && puja.itemsUsed.length > 0 && (
                <ExpandableSection title={t('puja.detail.itemsUsed')}>
                  {puja.itemsUsed.map((it, i) => <p key={i}>• {it}</p>)}
                </ExpandableSection>
              )}

              {puja.howToDo.length > 0 && (
                <ExpandableSection title={t('puja.detail.howItWillHappen')}>
                  {puja.howToDo.map((h, i) => <p key={i}>{i + 1}. {h}</p>)}
                </ExpandableSection>
              )}

              {puja.parcelContents.length > 0 && (
                <ExpandableSection title={t('puja.detail.parcelContents')}>
                  {puja.parcelContents.map((p, i) => <p key={i}>• {p}</p>)}
                </ExpandableSection>
              )}
            </div>

            {/* "Puja Video you will receive" section temporarily hidden until intro videos are live. */}

            {puja.templeId && (
              <Link
                href={`/temples/${puja.templeId}`}
                className="flex items-center justify-between gap-3 bg-white border border-orange-100 rounded-xl px-4 sm:px-5 py-3.5 mt-6 hover:border-primary-300 hover:bg-orange-50/50 transition-all shadow-[0_1px_2px_rgba(232,129,58,0.04)] hover:shadow-md"
              >
                <span className="flex-1 min-w-0 text-sm sm:text-[15px] font-semibold text-text-primary leading-snug break-words">
                  {t('puja.detail.importanceOf', { name: puja.templeName })}
                </span>
                <span className="text-primary-500 text-lg leading-none flex-shrink-0">→</span>
              </Link>
            )}
          </div>
        </div>
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
          <Link href={`/puja/${puja.slug || puja.id}/book`} className="flex-1">
            <Button className="w-full" size="lg">{t('puja.detail.selectPuja')}</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
