'use client';

import { useRef, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  ChevronLeft,
  ChevronRight,
  Play,
  BookOpen,
  Gift,
  Users,
  Landmark,
  CalendarDays,
  Gem,
  ArrowUpRight,
} from 'lucide-react';
import { PujaCard } from '@/components/shared/PujaCard';
import { ChadhavaCard } from '@/components/shared/ChadhavaCard';
import { TempleCard } from '@/components/shared/TempleCard';
import { templeService, pujaService, chadhavaService } from '@/lib/services';
import { mapPuja, mapChadhava, mapTemple } from '@/lib/mappers';
import heroBg from '@/assets/hero-bg.png';

const HOW_TO_STEPS = [
  {
    num: 1,
    title: 'Select A Puja As Per Your Need',
    desc: 'Browse 100+ sacred pujas across renowned temples',
    icon: BookOpen,
  },
  {
    num: 2,
    title: 'Provide Name, Gotra & Sankalp Details',
    desc: 'Personalise your puja with family details',
    icon: Users,
  },
  {
    num: 3,
    title: 'Receive Prasad & Hamper At Home',
    desc: 'Sacred prasad delivered to your doorstep',
    icon: Gift,
  },
  {
    num: 4,
    title: 'Get Blessings For Family From Home',
    desc: 'Watch the live puja stream and receive divine blessings',
    icon: Landmark,
  },
];

const SERVICES = [
  {
    icon: BookOpen,
    title: 'Book Pujas',
    description: 'Book Puja Nifebebf jebebvfjev Ebe Bet Kasre Ashi Jon Ebe',
    href: '/puja',
  },
  {
    icon: Gift,
    title: 'Book Chadhava',
    description: 'Book Chadhava Nifebebf jebebvfjvv Ebe Bet Kasre Ashi Jon Ebe',
    href: '/chadhava',
  },
  {
    icon: Users,
    title: 'Astrology Appointments',
    description: 'Book Astro Nifebebf jebebvfjvv Ebe Bet Kasre Ashi Jon Ebe',
    href: '/consult',
  },
  {
    icon: Landmark,
    title: 'Discover Temples',
    description: 'Discover Famous Temples Across India Which Have Mentioned In A History Like Which Have The...',
    href: '/temples',
  },
  {
    icon: CalendarDays,
    title: 'Know Panchang & Tithi',
    description: 'Read About Arik Panchage Jeeth Hojele Ahrb Ebe Sphrleshlo Ejdsbjei Duhften',
    href: '/panchang',
  },
  {
    icon: Gem,
    title: 'Track Your Devotee Journey',
    description: 'Track HH Fhjbjf Jle Jewith Hojele Ahrb Ebe Fljflebejk Sphrleshlo Ejdsbjei Duhften',
    href: '/points',
  },
];

/* ── Scroll helper for carousels ── */
function useHorizontalScroll() {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (dir: 'left' | 'right') => {
    if (!ref.current) return;
    const amount = ref.current.clientWidth * 0.75;
    ref.current.scrollBy({ left: dir === 'left' ? -amount : amount, behavior: 'smooth' });
  };
  return { ref, scroll };
}

/**
 * Marigold/rose petals drifting downward across the hero. Pure CSS animation —
 * no JS, no canvas, no layout thrash. Mixes small/medium petals with several
 * larger ones for layered depth. Petals are `pointer-events-none` so they never
 * block CTAs, and the animation is disabled when the user has
 * `prefers-reduced-motion` set.
 */
const HERO_PETALS = [
  { left: '3%',  delay: '0s',    duration: '13s', size: 14, color: 'text-primary-400' },
  { left: '8%',  delay: '6.4s',  duration: '20s', size: 38, color: 'text-rose-500' },
  { left: '14%', delay: '2.4s',  duration: '15s', size: 18, color: 'text-amber-500' },
  { left: '19%', delay: '9.1s',  duration: '22s', size: 44, color: 'text-orange-500' },
  { left: '24%', delay: '5.1s',  duration: '11s', size: 12, color: 'text-rose-400' },
  { left: '29%', delay: '8.2s',  duration: '19s', size: 34, color: 'text-amber-600' },
  { left: '34%', delay: '1.2s',  duration: '14s', size: 16, color: 'text-primary-300' },
  { left: '40%', delay: '3.6s',  duration: '12s', size: 14, color: 'text-amber-400' },
  { left: '45%', delay: '10.5s', duration: '23s', size: 42, color: 'text-rose-600' },
  { left: '50%', delay: '6.2s',  duration: '13s', size: 20, color: 'text-rose-500' },
  { left: '55%', delay: '4s',    duration: '20s', size: 40, color: 'text-orange-400' },
  { left: '60%', delay: '0.8s',  duration: '15s', size: 13, color: 'text-primary-500' },
  { left: '65%', delay: '4.2s',  duration: '12s', size: 17, color: 'text-amber-300' },
  { left: '70%', delay: '2.1s',  duration: '14s', size: 15, color: 'text-rose-400' },
  { left: '76%', delay: '7.5s',  duration: '21s', size: 36, color: 'text-rose-600' },
  { left: '82%', delay: '5.7s',  duration: '11s', size: 19, color: 'text-primary-400' },
  { left: '87%', delay: '11s',   duration: '22s', size: 32, color: 'text-amber-500' },
  { left: '92%', delay: '3s',    duration: '13s', size: 14, color: 'text-amber-500' },
  { left: '97%', delay: '0.4s',  duration: '12s', size: 16, color: 'text-primary-300' },
];

function HeroPetals() {
  return (
    <div
      className="absolute inset-0 overflow-hidden pointer-events-none z-[1]"
      aria-hidden="true"
    >
      {HERO_PETALS.map((p, i) => (
        <span
          key={i}
          className={`petal-flow ${p.color}`}
          style={{
            left: p.left,
            width: `${p.size}px`,
            height: `${Math.round(p.size * 1.4)}px`,
            ['--petal-duration' as string]: p.duration,
            ['--petal-delay' as string]: p.delay,
          } as React.CSSProperties}
        >
          <svg
            viewBox="0 0 24 32"
            fill="currentColor"
            className="w-full h-full drop-shadow-[0_2px_3px_rgba(232,129,58,0.3)]"
          >
            <path d="M12 0 C18 8 22 16 12 32 C2 16 6 8 12 0 Z" />
          </svg>
        </span>
      ))}
    </div>
  );
}

function CarouselNav({ onLeft, onRight }: { onLeft: () => void; onRight: () => void }) {
  return (
    <div className="flex gap-2">
      <button
        onClick={onLeft}
        className="w-8 h-8 rounded-full border border-border-DEFAULT flex items-center justify-center hover:bg-primary-50 transition"
      >
        <ChevronLeft className="w-4 h-4 text-text-secondary" />
      </button>
      <button
        onClick={onRight}
        className="w-8 h-8 rounded-full border border-border-DEFAULT flex items-center justify-center hover:bg-primary-50 transition"
      >
        <ChevronRight className="w-4 h-4 text-text-secondary" />
      </button>
    </div>
  );
}

function HowToVideoThumbnail() {
  return (
    <div className="relative w-full aspect-video rounded-xl overflow-hidden shadow-xl ring-1 ring-black/5 group cursor-pointer">
      <Image
        src="https://images.unsplash.com/photo-1757308530438-4e2340a6475f?w=1200&q=85&auto=format&fit=crop"
        alt="How to book puja with Savidhi — brass aarti lamp at Ganga Ghat, Varanasi"
        fill
        className="object-cover transition-transform duration-700 group-hover:scale-105"
        sizes="(max-width: 1024px) 100vw, 45vw"
      />

      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-black/30 group-hover:via-black/5 transition-colors" />

      <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm rounded-md px-2.5 py-1 shadow-md">
        <p className="text-[9px] font-semibold text-text-muted uppercase tracking-wide leading-none">
          How to use
        </p>
        <p className="text-xs font-bold text-primary-500 leading-tight mt-0.5">
          Book Puja
        </p>
      </div>

      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative">
          <span className="absolute inset-0 rounded-full bg-white/40 animate-ping" />
          <div className="relative w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
            <Play className="w-5 h-5 text-primary-500 ml-0.5 fill-primary-500" />
          </div>
        </div>
      </div>

      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2">
        <p className="text-white text-sm font-bold leading-tight drop-shadow">
          Booking made simple
        </p>
        <span className="bg-primary-500 hover:bg-primary-600 text-white text-[11px] font-semibold rounded-full px-3 py-1 shadow-lg transition-colors flex-shrink-0">
          Learn More
        </span>
      </div>
    </div>
  );
}

export default function HomePage() {
  const pujaScroll = useHorizontalScroll();
  const chadhavaScroll = useHorizontalScroll();
  const templeScroll = useHorizontalScroll();

  // Fetch real data from the API
  const [pujas, setPujas] = useState<any[]>([]);
  const [chadhavas, setChadhavas] = useState<any[]>([]);
  const [temples, setTemples] = useState<any[]>([]);

  useEffect(() => {
    async function loadData() {
      const [pujasRes, chadhavasRes, templesRes] = await Promise.allSettled([
        pujaService.list({ limit: 10 }),
        chadhavaService.list({ limit: 10 }),
        templeService.list({ limit: 10 }),
      ]);

      if (pujasRes.status === 'fulfilled' && pujasRes.value.data?.data?.length) {
        setPujas(pujasRes.value.data.data.map(mapPuja));
      }

      if (chadhavasRes.status === 'fulfilled' && chadhavasRes.value.data?.data?.length) {
        setChadhavas(chadhavasRes.value.data.data.map(mapChadhava));
      }

      if (templesRes.status === 'fulfilled' && templesRes.value.data?.data?.length) {
        setTemples(templesRes.value.data.data.map(mapTemple));
      }
    }
    loadData();
  }, []);

  return (
    <div className="min-h-screen">
      {/* ═══════════ HERO BANNER ═══════════ */}
      {/* Desktop: text overlaid on hero image. Mobile: stacked vertically */}

      {/* ── Mobile Hero (< md) ── */}
      <section className="md:hidden relative bg-[#FBF5EB] overflow-hidden">
        <HeroPetals />
        {/* Text block — stacked above illustration */}
        <div className="px-5 pt-8 pb-5 text-center">
          <h1 className="[font-family:var(--font-cabin)] text-[1.625rem] font-bold text-[#502C06] tracking-[0.12em] uppercase leading-snug">
            Puja & Consultation
          </h1>
          <p className="[font-family:var(--font-cabin)] text-[1.625rem] font-bold text-primary-500 uppercase tracking-[0.12em] mt-5 leading-snug">
            Made Easy
          </p>
          <p className="[font-family:var(--font-cabin)] text-sm font-semibold text-[#6E6E6E] mt-2 tracking-wide">
            Trusted By 50000+ Devotee
          </p>

          <div className="flex flex-col gap-3 mt-5">
            <Link
              href="/puja"
              className="bg-primary-500 hover:bg-primary-600 text-[#FFF7F0] [font-family:var(--font-cabin)] font-semibold py-3 rounded-full text-base transition text-center"
            >
              Book Puja
            </Link>
            <button className="flex items-center justify-center gap-2 border border-[#502C06] rounded-full py-3 text-base [font-family:var(--font-cabin)] font-normal text-[#502C06] hover:bg-[#502C06]/5 transition">
              Download App
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M3 20.5v-17c0-.83.52-1.28 1-1.5l10 10-10 10c-.48-.22-1-.67-1-1.5zm14.54-7.77L5.04 2.03l11.37 6.37 1.13.63zm1.97 1.1l-1.97-1.1-1.97 1.1 1.97 1.1 1.97-1.1zM5.04 21.97l12.5-10.7-1.13-.63-11.37 6.37z"/></svg>
              </span>
            </button>
          </div>
        </div>

        {/* Temple illustration below */}
        <div className="w-full">
          <Image
            src={heroBg}
            alt="Temple illustration"
            className="w-full h-auto block"
            priority
            sizes="100vw"
          />
        </div>
      </section>

      {/* ── Desktop Hero (>= md) ── */}
      <section className="hidden md:block relative overflow-hidden">
        <div className="relative w-full">
          <Image
            src={heroBg}
            alt="Temple illustration"
            className="w-full h-auto block"
            priority
            sizes="100vw"
          />

          {/* Falling petals — between image and text overlay */}
          <HeroPetals />

          {/* Text content overlaid on top of the image */}
          <div className="absolute inset-0 flex flex-col items-center justify-start pt-8 lg:pt-12 xl:pt-16 px-4">
            <h1 className="[font-family:var(--font-cabin)] text-3xl md:text-4xl lg:text-[3rem] xl:text-[3.5rem] font-bold text-[#502C06] tracking-[0.12em] uppercase leading-tight text-center">
              Puja & Consultation
            </h1>
            <p className="[font-family:var(--font-cabin)] text-2xl md:text-3xl lg:text-[2.5rem] xl:text-[2.75rem] font-bold text-primary-500 uppercase tracking-[0.12em] mt-10 lg:mt-14 leading-tight text-center">
              Made Easy
            </p>
            <p className="text-sm lg:text-base text-text-muted mt-2 lg:mt-3 text-center tracking-wide">
              Trusted By 50000+ Devotee
            </p>

            <div className="flex items-center justify-center gap-4 mt-5 lg:mt-7">
              <Link
                href="/puja"
                className="bg-primary-500 hover:bg-primary-600 text-white font-semibold px-10 py-3 rounded-full text-sm lg:text-base transition"
              >
                Book Puja
              </Link>
              <button className="flex items-center gap-2 border border-text-primary rounded-full px-8 py-3 text-sm lg:text-base font-medium text-text-primary hover:bg-gray-50/80 transition bg-white/60 backdrop-blur-sm">
                Download App
                <span className="flex items-center gap-1.5 ml-1">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M3 20.5v-17c0-.83.52-1.28 1-1.5l10 10-10 10c-.48-.22-1-.67-1-1.5zm14.54-7.77L5.04 2.03l11.37 6.37 1.13.63zm1.97 1.1l-1.97-1.1-1.97 1.1 1.97 1.1 1.97-1.1zM5.04 21.97l12.5-10.7-1.13-.63-11.37 6.37z"/></svg>
                </span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ UPCOMING PUJAS CAROUSEL ═══════════ */}
      <section className="section-container py-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg sm:text-xl font-bold text-text-primary">Upcoming Pujas</h2>
          <CarouselNav
            onLeft={() => pujaScroll.scroll('left')}
            onRight={() => pujaScroll.scroll('right')}
          />
        </div>
        <div
          ref={pujaScroll.ref}
          className="flex gap-4 overflow-x-auto scrollbar-hide pb-2 snap-x snap-mandatory"
        >
          {pujas.map((puja) => (
            <div key={puja.id} className="min-w-[260px] sm:min-w-[280px] snap-start">
              <PujaCard puja={puja} />
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════ HOW TO BOOK ═══════════ */}
      <section className="relative bg-gradient-to-br from-orange-100/70 via-orange-50 to-amber-50/60 border-y border-orange-200/60 py-10 sm:py-12 overflow-hidden">
        {/* Decorative orbs */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-primary-200/40 rounded-full blur-3xl pointer-events-none -translate-y-1/3 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-orange-200/50 rounded-full blur-2xl pointer-events-none translate-y-1/3 -translate-x-1/4" />

        <div className="section-container relative z-10">
          <div className="grid lg:grid-cols-[1fr_1.1fr] gap-8 lg:gap-12 items-center">
            {/* Left: heading + steps */}
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-text-primary leading-tight mb-1.5">
                How To Book Puja{' '}
                <span className="text-primary-500">With Savidhi?</span>
              </h2>
              <p className="text-text-secondary text-xs sm:text-sm mb-6">
                Book sacred pujas from your home in a few simple steps.
              </p>

              <ol className="relative">
                {HOW_TO_STEPS.map((step, i) => (
                  <li key={step.num} className="flex gap-3">
                    {/* Number + connector rail */}
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-orange-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 shadow-md shadow-primary-300/50 ring-2 ring-white z-10">
                        {step.num}
                      </div>
                      {i < HOW_TO_STEPS.length - 1 && (
                        <div className="w-px flex-1 min-h-[0.75rem] bg-gradient-to-b from-primary-300/80 via-primary-200/50 to-transparent my-0.5" />
                      )}
                    </div>

                    {/* Card */}
                    <div className={`flex-1 ${i === HOW_TO_STEPS.length - 1 ? 'pb-0' : 'pb-2.5'}`}>
                      <div className="group flex items-center gap-2.5 px-3 py-2 rounded-lg bg-white/90 backdrop-blur-sm border border-orange-100 hover:border-primary-300 hover:shadow-sm transition-all">
                        <div className="w-7 h-7 rounded-md bg-primary-50 group-hover:bg-primary-100 flex items-center justify-center flex-shrink-0 transition-colors">
                          <step.icon className="w-3.5 h-3.5 text-primary-500" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-text-primary leading-snug">
                            {step.title}
                          </p>
                          <p className="text-[11px] text-text-muted mt-0.5 leading-snug">
                            {step.desc}
                          </p>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            {/* Right: video thumbnail */}
            <HowToVideoThumbnail />
          </div>
        </div>
      </section>

      {/* ═══════════ DAILY CHADHAVA CAROUSEL ═══════════ */}
      <section className="section-container py-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg sm:text-xl font-bold text-text-primary">Daily Chadhava</h2>
          <CarouselNav
            onLeft={() => chadhavaScroll.scroll('left')}
            onRight={() => chadhavaScroll.scroll('right')}
          />
        </div>
        <div
          ref={chadhavaScroll.ref}
          className="flex gap-4 overflow-x-auto scrollbar-hide pb-2 snap-x snap-mandatory"
        >
          {chadhavas.map((c) => (
            <div key={c.id} className="min-w-[260px] sm:min-w-[280px] snap-start">
              <ChadhavaCard chadhava={c} />
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════ OUR SERVICES ═══════════ */}
      <section className="bg-white py-10">
        <div className="section-container">
          <h2 className="text-lg sm:text-xl font-bold text-text-primary mb-6">Our Services</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {SERVICES.map((s) => (
              <Link key={s.href} href={s.href} className="group">
                <div className="card p-5 hover:shadow-md hover:border-primary-200 transition-all h-full flex flex-col">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center">
                      <s.icon className="w-6 h-6 text-primary-500" />
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-text-muted group-hover:text-primary-500 transition" />
                  </div>
                  <h3 className="font-bold text-sm text-primary-500 underline decoration-primary-300 underline-offset-2 mb-1.5">
                    {s.title}
                  </h3>
                  <p className="text-xs text-text-secondary leading-relaxed">{s.description}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ EXPLORE PARTNERED TEMPLES ═══════════ */}
      <section className="section-container py-8 pb-12">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg sm:text-xl font-bold text-text-primary">
            Explore Our Exclusive Partnered Temples
          </h2>
          <CarouselNav
            onLeft={() => templeScroll.scroll('left')}
            onRight={() => templeScroll.scroll('right')}
          />
        </div>
        <div
          ref={templeScroll.ref}
          className="flex gap-4 overflow-x-auto scrollbar-hide pb-2 snap-x snap-mandatory"
        >
          {temples.map((temple) => (
            <div key={temple.id} className="min-w-[260px] sm:min-w-[300px] snap-start">
              <TempleCard temple={temple} />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
